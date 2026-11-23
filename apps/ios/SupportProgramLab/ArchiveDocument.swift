import SwiftUI
import UniformTypeIdentifiers

struct ArchiveDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data

    init(data: Data = Data()) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        guard let bytes = configuration.file.regularFileContents, !bytes.isEmpty else {
            throw CocoaError(.fileReadCorruptFile)
        }
        guard bytes.count <= 16 * 1_024 * 1_024 else { throw LocalAppError.fileTooLarge }
        data = bytes
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

enum ProgramFileTypes {
    static var attachments: [UTType] {
        [.pdf, .png, .jpeg, .plainText] + ["pptx", "docx", "md"].map { UTType(filenameExtension: $0) ?? .data }
    }

    static func exportFilename(for title: String) -> String {
        let invalid = CharacterSet(charactersIn: "/\\:\0\n\r")
        let cleaned = title.components(separatedBy: invalid).joined(separator: "_").trimmingCharacters(in: .whitespacesAndNewlines)
        return String((cleaned.isEmpty ? "program" : cleaned).prefix(80)) + ".json"
    }
}
