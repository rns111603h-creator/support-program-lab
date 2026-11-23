import Foundation
import XCTest
@testable import ProgramKit

final class SessionClockTests: XCTestCase {
    private func date(_ second: TimeInterval) -> Date { Date(timeIntervalSince1970: second) }

    func testBackgroundTimeComesFromDatesWithoutTimerCallbacks() {
        var clock = SessionClock()
        clock.start(at: date(100))
        XCTAssertTrue(clock.isRunning)
        XCTAssertEqual(clock.elapsed(at: date(190)), 90)
        XCTAssertEqual(clock.remaining(duration: 120, at: date(190)), 30)
    }

    func testPauseExcludesPausedTimeAndResumeAccumulates() {
        var clock = SessionClock()
        clock.start(at: date(100))
        clock.pause(at: date(110))
        XCTAssertFalse(clock.isRunning)
        XCTAssertEqual(clock.elapsed(at: date(200)), 10)
        clock.start(at: date(200))
        XCTAssertEqual(clock.elapsed(at: date(205)), 15)
    }

    func testRepeatedStartAndPauseAreIdempotent() {
        var clock = SessionClock()
        clock.start(at: date(100))
        clock.start(at: date(105))
        clock.pause(at: date(110))
        clock.pause(at: date(200))
        XCTAssertEqual(clock.elapsed(at: date(300)), 10)
    }

    func testResetClearsElapsedAndStops() {
        var clock = SessionClock()
        clock.start(at: date(100))
        clock.reset()
        XCTAssertFalse(clock.isRunning)
        XCTAssertEqual(clock.elapsed(at: date(200)), 0)
    }

    func testRemainingAndBackwardDatesNeverBecomeNegative() {
        var clock = SessionClock()
        clock.start(at: date(100))
        XCTAssertEqual(clock.elapsed(at: date(90)), 0)
        XCTAssertEqual(clock.remaining(duration: 10, at: date(200)), 0)
        XCTAssertEqual(clock.remaining(duration: -10, at: date(200)), 0)
    }
}
