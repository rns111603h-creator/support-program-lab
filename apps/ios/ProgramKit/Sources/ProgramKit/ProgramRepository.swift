import Foundation

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

/// Synchronous, local-only API shared by the iOS app and package tests.
/// Phase 1 contains compiling stubs only. Behavioral implementation follows a CI RED run.
public final class ProgramRepository {
    private let root: URL

    public init(root: URL) throws {
        self.root = root
    }

    public func list() throws -> [Program] {
        throw ProgramKitError.notImplemented
    }

    public func save(_ program: Program) throws {
        throw ProgramKitError.notImplemented
    }

    public func delete(id: UUID) throws {
        throw ProgramKitError.notImplemented
    }

    public func addAttachment(programID: UUID, filename: String, data: Data) throws -> ProgramAttachment {
        throw ProgramKitError.notImplemented
    }

    public func attachmentURL(programID: UUID, attachmentID: UUID) throws -> URL {
        throw ProgramKitError.notImplemented
    }

    public func exportProgram(id: UUID, acknowledged: Bool) throws -> Data {
        throw ProgramKitError.notImplemented
    }

    public func importProgram(data: Data) throws -> Program {
        throw ProgramKitError.notImplemented
    }

    public func search(query: String) throws -> [Program] {
        throw ProgramKitError.notImplemented
    }
}
