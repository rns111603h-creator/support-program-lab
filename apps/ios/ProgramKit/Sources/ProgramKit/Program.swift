import Foundation

public struct Program: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var title: String
    public var summary: String
    public var body: String
    public var tags: [String]
    public var durationMinutes: Int
    public var steps: [ProgramStep]
    public var attachments: [ProgramAttachment]
    public var sourceURL: String
    public var rightsBasis: String
    public var createdAt: Date
    public var updatedAt: Date

    /// Callers supply identity and explicitly supply current dates when creating new work.
    /// All omitted domain values have deterministic defaults for portable data and tests.
    public init(
        id: UUID,
        title: String,
        summary: String = "",
        body: String = "",
        tags: [String] = [],
        durationMinutes: Int = 60,
        steps: [ProgramStep] = [],
        attachments: [ProgramAttachment] = [],
        sourceURL: String = "",
        rightsBasis: String = "",
        createdAt: Date = Date(timeIntervalSince1970: 0),
        updatedAt: Date = Date(timeIntervalSince1970: 0)
    ) {
        self.id = id
        self.title = title
        self.summary = summary
        self.body = body
        self.tags = tags
        self.durationMinutes = durationMinutes
        self.steps = steps
        self.attachments = attachments
        self.sourceURL = sourceURL
        self.rightsBasis = rightsBasis
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

public struct ProgramStep: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var title: String
    public var minutes: Int
    public var notes: String

    public init(id: UUID, title: String, minutes: Int = 0, notes: String = "") {
        self.id = id
        self.title = title
        self.minutes = minutes
        self.notes = notes
    }
}

public struct ProgramAttachment: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var filename: String
    public var storedName: String
    public var sizeBytes: Int

    public init(id: UUID, filename: String, storedName: String, sizeBytes: Int) {
        self.id = id
        self.filename = filename
        self.storedName = storedName
        self.sizeBytes = sizeBytes
    }
}
