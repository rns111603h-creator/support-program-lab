import Foundation
#if canImport(Darwin)
import Darwin
#elseif canImport(Glibc)
import Glibc
#endif

public enum ProgramKitError: Error, Equatable, Sendable, LocalizedError {
    case notImplemented
    case invalidRoot
    case corruptStore
    case invalidProgram
    case invalidFilename
    case programNotFound
    case attachmentNotFound
    case attachmentLimitExceeded
    case archiveTooLarge
    case unsupportedArchiveVersion
    case invalidArchive
    case acknowledgementRequired

    public var errorDescription: String? {
        switch self {
        case .notImplemented: return "この機能は現在準備中です。"
        case .invalidRoot: return "保存先には端末内の専用フォルダを指定してください。"
        case .corruptStore: return "保存済み教材を読み取れません。データを残したまま処理を停止しました。"
        case .invalidProgram: return "教材名・時間・教材の構成を確認してください。"
        case .invalidFilename: return "このファイル名は使用できません。"
        case .programNotFound: return "教材が見つかりません。"
        case .attachmentNotFound: return "添付ファイルが見つかりません。"
        case .attachmentLimitExceeded: return "添付は10点以内、合計10MB以下にしてください。"
        case .archiveTooLarge: return "取り込むファイルは16MB以下にしてください。"
        case .unsupportedArchiveVersion: return "この形式のバージョンには対応していません。"
        case .invalidArchive: return "教材ファイルの形式や添付の対応を確認できません。"
        case .acknowledgementRequired: return "書き出す内容と素材の利用条件を確認してください。"
        }
    }
}

/// Synchronous storage in one private local directory. No networking or cloud APIs are used.
/// Metadata is re-read for each operation, rather than cached or reset on a decoding error.
public final class ProgramRepository {
    private struct Index: Codable {
        let version: Int
        var programs: [Program]
    }

    private struct ArchiveHeader: Codable {
        let format: String
        let version: Int
    }

    private struct ArchiveFile: Codable {
        let attachmentID: UUID
        let data: Data
    }

    private struct Archive: Codable {
        let format: String
        let version: Int
        let program: Program
        let files: [ArchiveFile]
    }

    private static let lock = NSRecursiveLock()
    private static let attachmentLimit = 10 * 1024 * 1024
    private static let archiveLimit = 16 * 1024 * 1024
    private static let format = "support-program-lab.program"
    private let root: URL
    private let manager = FileManager.default
    // Internal fault-injection seam: production callers cannot change the commit boundary.
    var beforeIndexCommit: (() throws -> Void)?

    private var indexURL: URL { root.appendingPathComponent("programs.json") }

    public init(root: URL) throws {
        guard root.isFileURL, root.host == nil || root.host == "" || root.host == "localhost" else {
            throw ProgramKitError.invalidRoot
        }
        let requested = root.standardizedFileURL
        guard requested.path != "/" else { throw ProgramKitError.invalidRoot }
        if let attributes = try Self.attributes(at: requested), attributes[.type] as? FileAttributeType != .typeDirectory {
            throw ProgramKitError.invalidRoot
        }
        self.root = requested.resolvingSymlinksInPath().standardizedFileURL
        try synchronized {
            try createDirectory(self.root)
            var backupValues = URLResourceValues()
            backupValues.isExcludedFromBackup = true
            var localRoot = self.root
            try localRoot.setResourceValues(backupValues)
            if try Self.attributes(at: indexURL) == nil {
                guard try manager.contentsOfDirectory(atPath: self.root.path).isEmpty else {
                    throw ProgramKitError.corruptStore
                }
                try writeIndex([])
            } else {
                _ = try readPrograms()
            }
        }
    }

    public func list() throws -> [Program] {
        try synchronized { try readPrograms() }
    }

    public func save(_ program: Program) throws {
        try synchronized {
            var programs = try readPrograms()
            try validate(program)
            let position = programs.firstIndex(where: { $0.id == program.id })
            let existing = position.map { programs[$0] }
            // Only addAttachment/importProgram may introduce new attachment references.
            for attachment in program.attachments {
                guard existing?.attachments.contains(attachment) == true else {
                    throw ProgramKitError.invalidProgram
                }
            }
            let retained = Set(program.attachments.map(\.id))
            let removed = try (existing?.attachments ?? [])
                .filter { !retained.contains($0.id) }
                .map { try fileURL(programID: program.id, storedName: $0.storedName) }
            if let position { programs[position] = program } else { programs.append(program) }
            try commit(programs, removing: removed)
        }
    }

    public func delete(id: UUID) throws {
        try synchronized {
            var programs = try readPrograms()
            guard let position = programs.firstIndex(where: { $0.id == id }) else {
                throw ProgramKitError.programNotFound
            }
            programs.remove(at: position)
            let directory = try programDirectory(id)
            let removed = try Self.attributes(at: directory) == nil ? [] : [directory]
            try commit(programs, removing: removed)
        }
    }

    public func addAttachment(programID: UUID, filename: String, data: Data) throws -> ProgramAttachment {
        try synchronized {
            var programs = try readPrograms()
            guard let position = programs.firstIndex(where: { $0.id == programID }) else {
                throw ProgramKitError.programNotFound
            }
            try validateFilename(filename)
            guard !data.isEmpty, data.count <= Self.attachmentLimit,
                  programs[position].attachments.count < 10,
                  programs[position].attachments.reduce(0, { $0 + $1.sizeBytes }) <= Self.attachmentLimit - data.count else {
                throw ProgramKitError.attachmentLimitExceeded
            }
            let attachment = ProgramAttachment(
                id: UUID(), filename: filename, storedName: newStoredName(filename), sizeBytes: data.count
            )
            let directory = try programDirectory(programID)
            try createDirectory(directory)
            let destination = try fileURL(programID: programID, storedName: attachment.storedName)
            do {
                try write(data, to: destination, replacing: false)
                programs[position].attachments.append(attachment)
                programs[position].updatedAt = Date()
                try writeIndex(programs)
            } catch {
                try? manager.removeItem(at: destination)
                throw error
            }
            return attachment
        }
    }

    public func attachmentURL(programID: UUID, attachmentID: UUID) throws -> URL {
        try synchronized {
            let programs = try readPrograms()
            guard let program = programs.first(where: { $0.id == programID }) else {
                throw ProgramKitError.programNotFound
            }
            guard let attachment = program.attachments.first(where: { $0.id == attachmentID }) else {
                throw ProgramKitError.attachmentNotFound
            }
            return try fileURL(programID: programID, storedName: attachment.storedName)
        }
    }

    public func exportProgram(id: UUID, acknowledged: Bool) throws -> Data {
        try synchronized {
            guard acknowledged else { throw ProgramKitError.acknowledgementRequired }
            guard let program = try readPrograms().first(where: { $0.id == id }) else {
                throw ProgramKitError.programNotFound
            }
            let files = try program.attachments.map { attachment in
                ArchiveFile(attachmentID: attachment.id, data: try Data(contentsOf: fileURL(programID: id, storedName: attachment.storedName)))
            }
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.sortedKeys]
            let data = try encoder.encode(Archive(format: Self.format, version: 1, program: program, files: files))
            guard data.count <= Self.archiveLimit else { throw ProgramKitError.archiveTooLarge }
            return data
        }
    }

    public func importProgram(data: Data) throws -> Program {
        try synchronized {
            guard data.count <= Self.archiveLimit else { throw ProgramKitError.archiveTooLarge }
            var programs = try readPrograms()
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let archive: Archive
            do {
                let header = try decoder.decode(ArchiveHeader.self, from: data)
                guard header.format == Self.format else { throw ProgramKitError.invalidArchive }
                guard header.version == 1 else { throw ProgramKitError.unsupportedArchiveVersion }
                archive = try decoder.decode(Archive.self, from: data)
            } catch let error as ProgramKitError {
                throw error
            } catch {
                throw ProgramKitError.invalidArchive
            }
            do {
                try validate(archive.program)
            } catch ProgramKitError.attachmentLimitExceeded {
                throw ProgramKitError.attachmentLimitExceeded
            } catch {
                throw ProgramKitError.invalidArchive
            }
            let requiredIDs = Set(archive.program.attachments.map(\.id))
            let suppliedIDs = Set(archive.files.map(\.attachmentID))
            guard requiredIDs == suppliedIDs, suppliedIDs.count == archive.files.count else {
                throw ProgramKitError.invalidArchive
            }
            var total = 0
            for attachment in archive.program.attachments {
                guard let file = archive.files.first(where: { $0.attachmentID == attachment.id }),
                      file.data.count == attachment.sizeBytes else { throw ProgramKitError.invalidArchive }
                guard file.data.count <= Self.attachmentLimit - total else { throw ProgramKitError.attachmentLimitExceeded }
                total += file.data.count
            }
            // Every import gets a fresh local identity. Untrusted IDs and stored names never select a destination.
            var imported = archive.program
            imported.id = UUID()
            imported.attachments = archive.program.attachments.map { attachment in
                ProgramAttachment(id: UUID(), filename: attachment.filename,
                                  storedName: newStoredName(attachment.filename), sizeBytes: attachment.sizeBytes)
            }
            let directory = try programDirectory(imported.id)
            do {
                if !imported.attachments.isEmpty { try createDirectory(directory) }
                for (position, attachment) in imported.attachments.enumerated() {
                    let originalID = archive.program.attachments[position].id
                    guard let file = archive.files.first(where: { $0.attachmentID == originalID }) else {
                        throw ProgramKitError.invalidArchive
                    }
                    try write(file.data, to: fileURL(programID: imported.id, storedName: attachment.storedName), replacing: false)
                }
                programs.append(imported)
                try writeIndex(programs)
            } catch {
                if try Self.attributes(at: directory) != nil { try? manager.removeItem(at: directory) }
                throw error
            }
            return imported
        }
    }

    public func search(query: String) throws -> [Program] {
        try synchronized {
            let programs = try readPrograms()
            let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !needle.isEmpty else { return programs }
            return programs.filter {
                [$0.title, $0.summary, $0.body, $0.tags.joined(separator: " ")]
                    .joined(separator: "\n").range(of: needle, options: [.caseInsensitive, .diacriticInsensitive]) != nil
            }
        }
    }

    private func synchronized<T>(_ operation: () throws -> T) rethrows -> T {
        Self.lock.lock()
        defer { Self.lock.unlock() }
        return try operation()
    }

    private static func attributes(at url: URL) throws -> [FileAttributeKey: Any]? {
        do {
            return try FileManager.default.attributesOfItem(atPath: url.path)
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            return nil
        }
    }

    private func checkedURL(_ url: URL) throws -> URL {
        let normalized = url.standardizedFileURL
        guard normalized.path.hasPrefix(root.path + "/"),
              normalized.resolvingSymlinksInPath().standardizedFileURL.path == normalized.path else {
            throw ProgramKitError.corruptStore
        }
        if let attributes = try Self.attributes(at: normalized), attributes[.type] as? FileAttributeType == .typeSymbolicLink {
            throw ProgramKitError.corruptStore
        }
        return normalized
    }

    private func createDirectory(_ url: URL) throws {
        if url != root { _ = try checkedURL(url) }
        if let attributes = try Self.attributes(at: url), attributes[.type] as? FileAttributeType != .typeDirectory {
            throw ProgramKitError.corruptStore
        }
        try manager.createDirectory(at: url, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        var attributes: [FileAttributeKey: Any] = [.posixPermissions: 0o700]
        #if os(iOS)
        attributes[.protectionKey] = FileProtectionType.complete
        #endif
        try manager.setAttributes(attributes, ofItemAtPath: url.path)
    }

    private func programDirectory(_ id: UUID) throws -> URL {
        try checkedURL(root.appendingPathComponent("attachments", isDirectory: true)
            .appendingPathComponent(id.uuidString, isDirectory: true))
    }

    private func fileURL(programID: UUID, storedName: String) throws -> URL {
        try validateFilename(storedName)
        return try checkedURL(programDirectory(programID).appendingPathComponent(storedName))
    }

    private func validateFilename(_ filename: String) throws {
        guard !filename.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              filename != ".", filename != "..", filename.utf8.count <= 180,
              !filename.contains("/"), !filename.contains("\\"),
              !filename.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) else {
            throw ProgramKitError.invalidFilename
        }
    }

    private func newStoredName(_ filename: String) -> String {
        let suffix = (filename as NSString).pathExtension.lowercased()
        let safe = !suffix.isEmpty && suffix.utf8.count <= 12 && suffix.unicodeScalars.allSatisfy { CharacterSet.alphanumerics.contains($0) }
        return UUID().uuidString + "." + (safe ? suffix : "bin")
    }

    private func validate(_ program: Program) throws {
        guard !program.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              program.title.count <= 200, program.summary.count <= 5_000,
              program.body.count <= 200_000, program.rightsBasis.count <= 2_000,
              program.sourceURL.count <= 2_000, (1...1_440).contains(program.durationMinutes),
              program.tags.count <= 10, program.tags.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.count <= 40 }),
              program.steps.count <= 100, Set(program.steps.map(\.id)).count == program.steps.count,
              program.steps.allSatisfy({ !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.title.count <= 200 && (0...1_440).contains($0.minutes) && $0.notes.count <= 5_000 }),
              program.createdAt.timeIntervalSince1970.isFinite, program.updatedAt.timeIntervalSince1970.isFinite else {
            throw ProgramKitError.invalidProgram
        }
        if !program.sourceURL.isEmpty {
            guard let source = URLComponents(string: program.sourceURL),
                  ["https", "http"].contains(source.scheme?.lowercased() ?? ""), source.host?.isEmpty == false else {
                throw ProgramKitError.invalidProgram
            }
        }
        guard program.attachments.count <= 10 else { throw ProgramKitError.attachmentLimitExceeded }
        guard Set(program.attachments.map(\.id)).count == program.attachments.count,
              Set(program.attachments.map(\.storedName)).count == program.attachments.count else {
            throw ProgramKitError.invalidProgram
        }
        var size = 0
        for attachment in program.attachments {
            try validateFilename(attachment.filename)
            try validateFilename(attachment.storedName)
            guard attachment.sizeBytes > 0, attachment.sizeBytes <= Self.attachmentLimit - size else {
                throw ProgramKitError.attachmentLimitExceeded
            }
            size += attachment.sizeBytes
        }
    }

    private func readPrograms() throws -> [Program] {
        do {
            guard let directory = try Self.attributes(at: root), directory[.type] as? FileAttributeType == .typeDirectory,
                  root.resolvingSymlinksInPath().standardizedFileURL.path == root.path else { throw ProgramKitError.corruptStore }
            let index = try checkedURL(indexURL)
            guard let attributes = try Self.attributes(at: index), attributes[.type] as? FileAttributeType == .typeRegular else {
                throw ProgramKitError.corruptStore
            }
            let stored = try JSONDecoder().decode(Index.self, from: Data(contentsOf: index))
            guard stored.version == 1, Set(stored.programs.map(\.id)).count == stored.programs.count else {
                throw ProgramKitError.corruptStore
            }
            for program in stored.programs {
                try validate(program)
                for attachment in program.attachments {
                    let url = try fileURL(programID: program.id, storedName: attachment.storedName)
                    guard let file = try Self.attributes(at: url), file[.type] as? FileAttributeType == .typeRegular,
                          (file[.size] as? NSNumber)?.intValue == attachment.sizeBytes else { throw ProgramKitError.corruptStore }
                }
            }
            return stored.programs
        } catch {
            throw ProgramKitError.corruptStore
        }
    }

    private func writeIndex(_ programs: [Program]) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(Index(version: 1, programs: programs))
        try beforeIndexCommit?()
        try write(data, to: indexURL, replacing: true)
    }

    private func write(_ data: Data, to destination: URL, replacing: Bool) throws {
        _ = try checkedURL(destination)
        if let attributes = try Self.attributes(at: destination) {
            guard replacing, attributes[.type] as? FileAttributeType == .typeRegular else { throw ProgramKitError.corruptStore }
        }
        let staging = try checkedURL(root.appendingPathComponent(".stage-" + UUID().uuidString, isDirectory: true))
        try createDirectory(staging)
        defer { try? manager.removeItem(at: staging) }
        let temporary = staging.appendingPathComponent("payload")
        var options: Data.WritingOptions = [.atomic]
        #if os(iOS)
        options.insert(.completeFileProtection)
        #endif
        try data.write(to: temporary, options: options)
        try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: temporary.path)
        // Rename is the commit point. File attributes are established before the replacement.
        guard rename(temporary.path, destination.path) == 0 else {
            throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
        }
    }

    private func commit(_ programs: [Program], removing urls: [URL]) throws {
        let trash = try checkedURL(root.appendingPathComponent(".trash-" + UUID().uuidString, isDirectory: true))
        var moved: [(original: URL, staged: URL)] = []
        do {
            if !urls.isEmpty { try createDirectory(trash) }
            for url in urls {
                _ = try checkedURL(url)
                let staged = trash.appendingPathComponent(UUID().uuidString)
                try manager.moveItem(at: url, to: staged)
                moved.append((url, staged))
            }
            try writeIndex(programs)
        } catch {
            for entry in moved.reversed() { try? manager.moveItem(at: entry.staged, to: entry.original) }
            if moved.allSatisfy({ manager.fileExists(atPath: $0.original.path) }) { try? manager.removeItem(at: trash) }
            throw error
        }
        // A cleanup failure keeps only an unreferenced private trash directory, never live metadata.
        if !urls.isEmpty { try? manager.removeItem(at: trash) }
    }
}
