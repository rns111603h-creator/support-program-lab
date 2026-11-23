import Foundation
import Observation
import ProgramKit

enum LocalAppError: LocalizedError {
    case unavailable
    case unreadableFile
    case fileTooLarge
    case unsupportedFile
    case invalidTitle
    case protectionUnavailable
    case resetAfterDeletionFailed(String)

    var errorDescription: String? {
        switch self {
        case .unavailable: "保管庫を開けません。設定の「読み込みを再試行」で状態を確認してください。既存データは上書きしません。"
        case .unreadableFile: "選択したファイルを読み込めませんでした。ファイルの保存状態とアクセス権を確認してください。"
        case .fileTooLarge: "ファイルが上限を超えています。添付は1点10MB以下、教材アーカイブは16MB以下を選んでください。"
        case .unsupportedFile: "このファイル形式は取り込めません。対応する拡張子を確認してください。"
        case .invalidTitle: "教材名を入力してください。"
        case .protectionUnavailable: "端末内ファイルの保護を設定できませんでした。保存先の状態を確認してください。"
        case .resetAfterDeletionFailed(let reason): "端末内データは削除しましたが、新しい保管庫を開けませんでした。\n\(reason)"
        }
    }
}

@MainActor
@Observable
final class AppModel {
    private(set) var programs: [Program] = []
    private(set) var storageIssue: String?
    private(set) var storageRoot: URL?
    private var repository: ProgramRepository?

    var canWrite: Bool { repository != nil && storageIssue == nil }

    init() {
        openStorage()
    }

    func openStorage() {
        do {
            guard let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
                throw LocalAppError.unavailable
            }
            let root = support.appendingPathComponent("SupportProgramLab", isDirectory: true)
            storageRoot = root
            let candidate = try ProgramRepository(root: root)
            let loaded = try candidate.list()
            try protectFiles(in: root)
            repository = candidate
            programs = loaded.sorted { $0.updatedAt > $1.updatedAt }
            storageIssue = nil
        } catch {
            repository = nil
            storageIssue = error.localizedDescription
        }
    }

    func program(id: UUID) -> Program? {
        programs.first { $0.id == id }
    }

    func search(_ query: String) throws -> [Program] {
        try availableRepository().search(query: query).sorted { $0.updatedAt > $1.updatedAt }
    }

    func save(_ program: Program) throws {
        guard !program.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw LocalAppError.invalidTitle
        }
        try availableRepository().save(program)
        try refreshAfterWriting()
    }

    func delete(id: UUID) throws {
        try availableRepository().delete(id: id)
        try refreshAfterWriting()
    }

    func addAttachment(programID: UUID, from url: URL) throws {
        let supported = ["pdf", "pptx", "docx", "png", "jpg", "jpeg", "txt", "md"]
        guard supported.contains(url.pathExtension.lowercased()) else { throw LocalAppError.unsupportedFile }
        let data = try readUserSelectedFile(url, limit: 10 * 1_024 * 1_024)
        _ = try availableRepository().addAttachment(programID: programID, filename: url.lastPathComponent, data: data)
        try refreshAfterWriting()
    }

    func attachmentURL(programID: UUID, attachmentID: UUID) throws -> URL {
        try availableRepository().attachmentURL(programID: programID, attachmentID: attachmentID)
    }

    func exportProgram(id: UUID, acknowledged: Bool) throws -> Data {
        try availableRepository().exportProgram(id: id, acknowledged: acknowledged)
    }

    @discardableResult
    func importArchive(from url: URL) throws -> Program {
        guard url.pathExtension.lowercased() == "json" else { throw LocalAppError.unsupportedFile }
        let data = try readUserSelectedFile(url, limit: 16 * 1_024 * 1_024)
        let imported = try availableRepository().importProgram(data: data)
        try refreshAfterWriting()
        return imported
    }

    /// This operation is only called after the explicit destructive confirmation in Settings.
    func deleteAllLocalData() throws {
        guard let root = storageRoot else { throw LocalAppError.unavailable }
        if FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
        repository = nil
        programs = []
        storageIssue = nil
        openStorage()
        if let issue = storageIssue { throw LocalAppError.resetAfterDeletionFailed(issue) }
    }

    private func availableRepository() throws -> ProgramRepository {
        guard let repository, storageIssue == nil else { throw LocalAppError.unavailable }
        return repository
    }

    private func refreshAfterWriting() throws {
        guard let repository, let root = storageRoot else { throw LocalAppError.unavailable }
        do {
            let loaded = try repository.list()
            try protectFiles(in: root)
            programs = loaded.sorted { $0.updatedAt > $1.updatedAt }
        } catch {
            // Keep the last displayed data and stop further writes until storage is reopened.
            storageIssue = error.localizedDescription
            throw error
        }
    }

    private func readUserSelectedFile(_ url: URL, limit: Int) throws -> Data {
        let hasAccess = url.startAccessingSecurityScopedResource()
        defer { if hasAccess { url.stopAccessingSecurityScopedResource() } }
        let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
        guard values.isRegularFile == true else { throw LocalAppError.unreadableFile }
        if let size = values.fileSize, size > limit { throw LocalAppError.fileTooLarge }
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        // A bounded read also covers providers which do not report a size.
        var data = Data()
        while data.count <= limit {
            let nextCount = min(1_024 * 1_024, limit + 1 - data.count)
            guard let chunk = try handle.read(upToCount: nextCount), !chunk.isEmpty else { break }
            data.append(chunk)
        }
        guard data.count <= limit else { throw LocalAppError.fileTooLarge }
        guard !data.isEmpty else { throw LocalAppError.unreadableFile }
        return data
    }

    private func protectFiles(in root: URL) throws {
        let manager = FileManager.default
        let attributes: [FileAttributeKey: Any] = [.protectionKey: FileProtectionType.complete]
        try manager.setAttributes(attributes, ofItemAtPath: root.path)
        var traversalError: Error?
        guard let entries = manager.enumerator(at: root, includingPropertiesForKeys: nil, errorHandler: { _, error in
            traversalError = error
            return false
        }) else { throw LocalAppError.protectionUnavailable }
        for case let item as URL in entries {
            try manager.setAttributes(attributes, ofItemAtPath: item.path)
        }
        if let traversalError { throw traversalError }
    }
}
