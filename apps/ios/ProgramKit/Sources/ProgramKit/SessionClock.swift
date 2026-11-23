import Foundation

/// State-only timer; the UI supplies dates so background and pause behavior can be tested.
public struct SessionClock: Equatable, Sendable {
    public init() {}
    public var isRunning: Bool { false }
    public func elapsed(at date: Date) -> TimeInterval { 0 }
    public func remaining(duration: TimeInterval, at date: Date) -> TimeInterval { duration }
    public mutating func start(at date: Date) {}
    public mutating func pause(at date: Date) {}
    public mutating func reset() {}
}
