import Foundation
import XCTest
@testable import ProgramKit

final class ProgramRepositoryTests: XCTestCase {
    private enum InjectedFailure: Error { case beforeCommit }
    private var root: URL!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory
            .appendingPathComponent("ProgramKitTests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let root, FileManager.default.fileExists(atPath: root.path) {
            try FileManager.default.removeItem(at: root)
        }
    }

    private func example(
        id: UUID = UUID(uuidString: "00000000-0000-4000-8000-000000000001")!,
        title: String = "架空の報連相プログラム"
    ) -> Program {
        Program(
            id: id,
            title: title,
            summary: "架空データだけで練習する教材です。",
            body: "導入、場面カード、振り返り。",
            tags: ["報連相", "60分"],
            durationMinutes: 60,
            steps: [ProgramStep(
                id: UUID(uuidString: "00000000-0000-4000-8000-000000000002")!,
                title: "導入", minutes: 5, notes: "参加方法を選べます。"
            )],
            sourceURL: "https://example.invalid/synthetic-only",
            rightsBasis: "文章と図形は架空テスト用に自作。",
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            updatedAt: Date(timeIntervalSince1970: 1_700_000_060)
        )
    }

    private func assertError<T>(
        _ expected: ProgramKitError,
        file: StaticString = #filePath,
        line: UInt = #line,
        _ expression: () throws -> T
    ) {
        XCTAssertThrowsError(try expression(), file: file, line: line) { error in
            XCTAssertEqual(error as? ProgramKitError, expected, file: file, line: line)
        }
    }

    private func archive(
        program: Program,
        files: [(UUID, Data)] = [],
        version: Int = 1,
        format: String = "support-program-lab.program"
    ) throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encodedProgram = try JSONSerialization.jsonObject(with: encoder.encode(program))
        return try JSONSerialization.data(withJSONObject: [
            "format": format,
            "version": version,
            "program": encodedProgram,
            "files": files.map { ["attachmentID": $0.0.uuidString, "data": $0.1.base64EncodedString()] },
        ], options: [.sortedKeys])
    }

    func testDomainDefaultsAndCodableRoundTripAreDeterministic() throws {
        let id = UUID(uuidString: "00000000-0000-4000-8000-000000000010")!
        let first = Program(id: id, title: "架空教材")
        let second = Program(id: id, title: "架空教材")
        XCTAssertEqual(first, second)
        XCTAssertEqual(first.createdAt, Date(timeIntervalSince1970: 0))
        XCTAssertEqual(first.updatedAt, Date(timeIntervalSince1970: 0))
        XCTAssertEqual(first.durationMinutes, 60)
        XCTAssertEqual(first.tags, [])
        XCTAssertEqual(first.steps, [])
        XCTAssertEqual(first.attachments, [])
        XCTAssertEqual(try JSONDecoder().decode(Program.self, from: JSONEncoder().encode(first)), first)
    }

    func testStartsEmptyAndPersistsProgramAcrossRepositoryInstances() throws {
        let repository = try ProgramRepository(root: root)
        XCTAssertEqual(try repository.list(), [])
        let program = example()
        try repository.save(program)
        XCTAssertEqual(try ProgramRepository(root: root).list(), [program])
    }

    func testSearchMatchesTitleSummaryBodyAndTagsWithoutMutatingStore() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        for query in ["報連相", "架空データ", "場面カード", "60分"] {
            XCTAssertEqual(try repository.search(query: query).map(\.id), [program.id])
        }
        XCTAssertEqual(try repository.search(query: "見つからない語"), [])
        XCTAssertEqual(try repository.search(query: "   "), [program])
        XCTAssertEqual(try repository.list(), [program])
    }

    func testInvalidSavePreservesPreviousProgramAndOnDiskBytes() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        let index = root.appendingPathComponent("programs.json")
        let previous = try Data(contentsOf: index)
        var invalid = program
        invalid.title = "   "
        assertError(.invalidProgram) { try repository.save(invalid) }
        XCTAssertEqual(try repository.list(), [program])
        XCTAssertEqual(try Data(contentsOf: index), previous)
    }

    func testCorruptStoreIsReportedAndNeverResetOrOverwritten() throws {
        let index = root.appendingPathComponent("programs.json")
        let broken = Data("{broken-synthetic-store".utf8)
        try broken.write(to: index)
        assertError(.corruptStore) { try ProgramRepository(root: root).list() }
        assertError(.corruptStore) { try ProgramRepository(root: root).save(example()) }
        XCTAssertEqual(try Data(contentsOf: index), broken)
    }

    func testRejectsNonFileRepositoryRoots() {
        assertError(.invalidRoot) { try ProgramRepository(root: URL(string: "https://example.invalid/never-fetch")!) }
    }

    func testAttachmentPersistsLocallyAndCanOnlyBeReadThroughMatchingProgram() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        let payload = Data("架空の参加者ワーク".utf8)
        let attachment = try repository.addAttachment(programID: program.id, filename: "work.txt", data: payload)
        XCTAssertEqual(attachment.filename, "work.txt")
        XCTAssertEqual(attachment.sizeBytes, payload.count)
        XCTAssertFalse(attachment.storedName.contains("/"))
        let reopened = try ProgramRepository(root: root)
        let saved = try XCTUnwrap(reopened.list().first)
        XCTAssertEqual(saved.attachments, [attachment])
        let url = try reopened.attachmentURL(programID: program.id, attachmentID: attachment.id)
        XCTAssertTrue(url.isFileURL)
        XCTAssertTrue(url.standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path + "/"))
        XCTAssertEqual(try Data(contentsOf: url), payload)
        assertError(.programNotFound) { try reopened.attachmentURL(programID: UUID(), attachmentID: attachment.id) }
        assertError(.attachmentNotFound) { try reopened.attachmentURL(programID: program.id, attachmentID: UUID()) }
    }

    func testAttachmentRejectsUnsafeFilenamesAndLeavesProgramUntouched() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        for filename in ["../escape.txt", "/absolute.txt", "sub/file.txt", "sub\\file.txt", ".", "..", "bad\u{0000}.txt"] {
            assertError(.invalidFilename) {
                try repository.addAttachment(programID: program.id, filename: filename, data: Data("架空".utf8))
            }
        }
        XCTAssertEqual(try repository.list(), [program])
    }

    func testEleventhAttachmentIsRejectedWithoutChangingTenSavedAttachments() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        for number in 1...10 {
            _ = try repository.addAttachment(programID: program.id, filename: "work\(number).txt", data: Data("架空".utf8))
        }
        let previous = try repository.list()
        assertError(.attachmentLimitExceeded) {
            try repository.addAttachment(programID: program.id, filename: "extra.txt", data: Data("架空".utf8))
        }
        XCTAssertEqual(try repository.list(), previous)
    }

    func testExportRequiresAcknowledgementAndUsesVersionedPortableJSON() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        assertError(.acknowledgementRequired) { try repository.exportProgram(id: program.id, acknowledged: false) }
        let payload = Data("架空の添付".utf8)
        let attachment = try repository.addAttachment(programID: program.id, filename: "work.txt", data: payload)
        let data = try repository.exportProgram(id: program.id, acknowledged: true)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(json["format"] as? String, "support-program-lab.program")
        XCTAssertEqual(json["version"] as? Int, 1)
        let files = try XCTUnwrap(json["files"] as? [[String: String]])
        XCTAssertEqual(files.count, 1)
        XCTAssertEqual(files.first?["attachmentID"], attachment.id.uuidString)
        XCTAssertEqual(files.first?["data"], payload.base64EncodedString())
        XCTAssertFalse(String(decoding: data, as: UTF8.self).contains(root.path))
    }

    func testImportsPortableArchiveAndAttachmentsIntoAnotherLocalRepository() throws {
        let payload = Data("架空の持ち運び用ワーク".utf8)
        var program = example()
        let attachment = ProgramAttachment(
            id: UUID(uuidString: "00000000-0000-4000-8000-000000000020")!,
            filename: "portable.txt", storedName: "synthetic-portable.txt", sizeBytes: payload.count
        )
        program.attachments = [attachment]
        let repository = try ProgramRepository(root: root)
        let imported = try repository.importProgram(data: archive(program: program, files: [(attachment.id, payload)]))
        XCTAssertEqual(imported.title, program.title)
        XCTAssertEqual(imported.steps, program.steps)
        XCTAssertEqual(imported.tags, program.tags)
        XCTAssertEqual(imported.attachments.map(\.filename), [attachment.filename])
        let storedAttachment = try XCTUnwrap(imported.attachments.first)
        XCTAssertEqual(try Data(contentsOf: repository.attachmentURL(programID: imported.id, attachmentID: storedAttachment.id)), payload)
        XCTAssertEqual(try ProgramRepository(root: root).list().map(\.id), [imported.id])
    }

    func testImportWithAnExistingIDCreatesAnotherProgramRatherThanOverwriting() throws {
        let repository = try ProgramRepository(root: root)
        let existing = example()
        try repository.save(existing)
        var incoming = existing
        incoming.title = "別の架空教材として取り込む"
        let imported = try repository.importProgram(data: archive(program: incoming))
        XCTAssertNotEqual(imported.id, existing.id)
        let all = try repository.list()
        XCTAssertEqual(all.count, 2)
        XCTAssertEqual(all.first(where: { $0.id == existing.id }), existing)
        XCTAssertEqual(all.first(where: { $0.id == imported.id })?.title, incoming.title)
    }

    func testMalformedOrUnsupportedArchivesLeaveExistingStoreUntouched() throws {
        let repository = try ProgramRepository(root: root)
        let existing = example()
        try repository.save(existing)
        let index = root.appendingPathComponent("programs.json")
        let before = try Data(contentsOf: index)
        let beforeEntries = try FileManager.default.subpathsOfDirectory(atPath: root.path).sorted()
        assertError(.invalidArchive) { try repository.importProgram(data: Data("{not-json".utf8)) }
        assertError(.unsupportedArchiveVersion) { try repository.importProgram(data: archive(program: existing, version: 99)) }
        assertError(.invalidArchive) { try repository.importProgram(data: archive(program: existing, format: "unrelated-format")) }
        var wrongType = try XCTUnwrap(JSONSerialization.jsonObject(with: archive(program: existing)) as? [String: Any])
        var wrongProgram = try XCTUnwrap(wrongType["program"] as? [String: Any])
        wrongProgram["durationMinutes"] = "sixty"
        wrongType["program"] = wrongProgram
        let wrongTypeData = try JSONSerialization.data(withJSONObject: wrongType)
        assertError(.invalidArchive) { try repository.importProgram(data: wrongTypeData) }
        XCTAssertEqual(try repository.list(), [existing])
        XCTAssertEqual(try Data(contentsOf: index), before)
        XCTAssertEqual(try FileManager.default.subpathsOfDirectory(atPath: root.path).sorted(), beforeEntries)
    }

    func testImportRejectsMissingOrDuplicateAttachmentPayloadsAndTraversal() throws {
        let repository = try ProgramRepository(root: root)
        let existing = example()
        try repository.save(existing)
        let bytes = Data("架空".utf8)
        let attachment = ProgramAttachment(id: UUID(), filename: "work.txt", storedName: "work.txt", sizeBytes: bytes.count)
        var incoming = example(id: UUID())
        incoming.attachments = [attachment]
        assertError(.invalidArchive) { try repository.importProgram(data: archive(program: existing, files: [(attachment.id, bytes)])) }
        assertError(.invalidArchive) { try repository.importProgram(data: archive(program: incoming)) }
        assertError(.invalidArchive) { try repository.importProgram(data: archive(program: incoming, files: [(attachment.id, bytes), (attachment.id, bytes)])) }
        incoming.attachments[0].storedName = "../escape.txt"
        assertError(.invalidArchive) { try repository.importProgram(data: archive(program: incoming, files: [(attachment.id, bytes)])) }
        XCTAssertEqual(try repository.list(), [existing])
    }

    func testIncomingArchiveSizeIsBoundedBeforeAttemptingToDecodeIt() throws {
        let repository = try ProgramRepository(root: root)
        // One allocation at the product boundary, not a benchmark or repeated load.
        let aboveLimit = Data(count: 16 * 1024 * 1024 + 1)
        assertError(.archiveTooLarge) { try repository.importProgram(data: aboveLimit) }
        XCTAssertEqual(try repository.list(), [])
    }

    func testImportRejectsOversizedDeclaredAttachmentsWithoutWritingAnyFiles() throws {
        let repository = try ProgramRepository(root: root)
        let existing = example()
        try repository.save(existing)
        var incoming = example(id: UUID())
        let attachment = ProgramAttachment(id: UUID(), filename: "declared.txt", storedName: "declared.txt", sizeBytes: 10 * 1024 * 1024 + 1)
        incoming.attachments = [attachment]
        assertError(.attachmentLimitExceeded) {
            try repository.importProgram(data: archive(program: incoming, files: [(attachment.id, Data("小さな架空fixture".utf8))]))
        }
        XCTAssertEqual(try repository.list(), [existing])
    }

    func testDeleteRemovesOnlyItsProgramAndLocalAttachments() throws {
        let repository = try ProgramRepository(root: root)
        let deleted = example()
        let kept = example(id: UUID(), title: "保持する架空教材")
        try repository.save(deleted)
        try repository.save(kept)
        let attachment = try repository.addAttachment(programID: deleted.id, filename: "delete.txt", data: Data("架空".utf8))
        let url = try repository.attachmentURL(programID: deleted.id, attachmentID: attachment.id)
        try repository.delete(id: deleted.id)
        XCTAssertEqual(try repository.list(), [kept])
        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
        assertError(.programNotFound) { try repository.delete(id: deleted.id) }
    }

    func testLiveAttachmentsRemainAvailableUntilMetadataCommitAndFailurePreservesThem() throws {
        let repository = try ProgramRepository(root: root)
        let program = example()
        try repository.save(program)
        let payload = Data("中断前にも保持する架空添付".utf8)
        let attachment = try repository.addAttachment(programID: program.id, filename: "keep.txt", data: payload)
        let url = try repository.attachmentURL(programID: program.id, attachmentID: attachment.id)
        let before = try Data(contentsOf: root.appendingPathComponent("programs.json"))
        var reachedCommit = false
        repository.beforeIndexCommit = {
            reachedCommit = true
            XCTAssertEqual(try Data(contentsOf: url), payload)
            throw InjectedFailure.beforeCommit
        }
        XCTAssertThrowsError(try repository.delete(id: program.id)) { error in
            XCTAssertTrue(error is InjectedFailure)
        }
        XCTAssertTrue(reachedCommit)
        XCTAssertEqual(try Data(contentsOf: root.appendingPathComponent("programs.json")), before)
        XCTAssertEqual(try Data(contentsOf: url), payload)
        XCTAssertEqual(try repository.list().first?.attachments, [attachment])
    }

    func testRepositoryDoesNotChangeTheChosenOSBackupPolicy() throws {
        var directory = try XCTUnwrap(root)
        var policy = URLResourceValues()
        policy.isExcludedFromBackup = false
        try directory.setResourceValues(policy)
        _ = try ProgramRepository(root: directory)
        XCTAssertEqual(try directory.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup, false)
    }

    func testUnsupportedAttachmentExtensionsAreRejectedInBothDirectAndArchivePaths() throws {
        let repository = try ProgramRepository(root: root)
        let existing = example()
        try repository.save(existing)
        let before = try Data(contentsOf: root.appendingPathComponent("programs.json"))
        let bytes = Data("小さな架空添付".utf8)
        for filename in ["page.html", "script.js", "macro.docm", "executable.sh"] {
            assertError(.invalidFilename) {
                try repository.addAttachment(programID: existing.id, filename: filename, data: bytes)
            }
            var incoming = example(id: UUID())
            let attachment = ProgramAttachment(id: UUID(), filename: filename, storedName: "work.txt", sizeBytes: bytes.count)
            incoming.attachments = [attachment]
            assertError(.invalidArchive) {
                try repository.importProgram(data: archive(program: incoming, files: [(attachment.id, bytes)]))
            }
        }
        XCTAssertEqual(try repository.list(), [existing])
        XCTAssertEqual(try Data(contentsOf: root.appendingPathComponent("programs.json")), before)
    }
}
