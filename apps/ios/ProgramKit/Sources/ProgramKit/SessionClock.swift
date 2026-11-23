import Foundation

/// State-only timer; the UI supplies dates so background and pause behavior can be tested.
public struct SessionClock: Equatable, Sendable {
    private var accumulated: TimeInterval = 0
    private var runningSince: Date?

    public init() {}
    public var isRunning: Bool { runningSince != nil }

    public func elapsed(at date: Date) -> TimeInterval {
        accumulated + max(0, runningSince.map { date.timeIntervalSince($0) } ?? 0)
    }

    public func remaining(duration: TimeInterval, at date: Date) -> TimeInterval {
        max(0, duration - elapsed(at: date))
    }

    public mutating func start(at date: Date) {
        guard runningSince == nil else { return }
        runningSince = date
    }

    public mutating func pause(at date: Date) {
        guard runningSince != nil else { return }
        accumulated = elapsed(at: date)
        runningSince = nil
    }

    public mutating func reset() {
        accumulated = 0
        runningSince = nil
    }
}
