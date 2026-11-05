import Foundation
import Testing
import LectioCore

/// The frame round the app (AppLayout) and the Reader's place kept across a
/// change of frame (ReadingSpot): the rules behind the iPhone Duo layout.
@Suite struct LayoutTests {
    // Size classes as Apple gives them for iPhone Duo ("Prepare your app for
    // iPhone Duo"): the cover display is compact wide (regular tall in
    // portrait, compact on its side); the inner display is regular both ways.

    @Test func iPhoneDuoCoverDisplayIsAPhone() {
        #expect(AppLayout(regularWidth: false, regularHeight: true, isPad: false) == .phone)
        #expect(AppLayout(regularWidth: false, regularHeight: false, isPad: false) == .phone)
    }

    @Test func iPhoneDuoInnerDisplayGetsTheSidebar() {
        let open = AppLayout(regularWidth: true, regularHeight: true, isPad: false)
        #expect(open == .unfolded)
        #expect(open.hasSidebar)
    }

    @Test func aProMaxOnItsSideKeepsTheTabBar() {
        // Regular width, compact height: what a 6.9-inch iPhone reports in
        // landscape. It must not get the sidebar meant for iPhone Duo open.
        let layout = AppLayout(regularWidth: true, regularHeight: false, isPad: false)
        #expect(layout == .phone)
        #expect(!layout.hasSidebar)
    }

    @Test func iPadIsUnchanged() {
        #expect(AppLayout(regularWidth: true, regularHeight: true, isPad: true) == .tablet)
        #expect(AppLayout(regularWidth: true, regularHeight: false, isPad: true) == .tablet)
        // Slide Over, or a narrow window in a split.
        #expect(AppLayout(regularWidth: false, regularHeight: true, isPad: true) == .phone)
    }

    @Test func latinIsALittleLargerOnlyWhereThePageIsHeldFurtherAway() {
        #expect(AppLayout.tablet.latinBoost(regularWidth: true) == 1.2)
        // A Pro Max on its side has always had the larger size; it keeps it.
        #expect(AppLayout.phone.latinBoost(regularWidth: true) == 1.2)
        #expect(AppLayout.phone.latinBoost(regularWidth: false) == 1)
        // iPhone Duo open is held like a phone.
        #expect(AppLayout.unfolded.latinBoost(regularWidth: true) == 1)
    }

    @Test func aSpotCountsWhileItsReaderIsShowingAndJustAfter() {
        let reader = UUID()
        var spot = ReadingSpot(passageId: "aen-1-1-33", reader: reader)
        let now = Date(timeIntervalSince1970: 1_000_000)
        #expect(spot.isShowing)
        #expect(spot.isCurrent(at: now))

        spot.left(reader, at: now)
        #expect(!spot.isShowing)
        #expect(spot.isCurrent(at: now.addingTimeInterval(1)))
        #expect(!spot.isCurrent(at: now.addingTimeInterval(5)))
    }

    @Test func theOldFramesReaderCantUndoTheNewOnes() {
        // Unfolding builds a new Reader; the old one may go after the new
        // one has appeared. Its going must not mark the new one gone.
        let old = UUID(), new = UUID()
        var spot = ReadingSpot(passageId: "aen-1-1-33", reader: new, line: 12)
        spot.left(old, at: Date())
        #expect(spot.isShowing)
        spot.scrolled(to: 40, by: old)
        #expect(spot.line == 12)
        spot.scrolled(to: 41, by: new)
        #expect(spot.line == 41)
    }

    @Test func leavingTwiceKeepsTheFirstTime() {
        let reader = UUID()
        var spot = ReadingSpot(passageId: "p", reader: reader)
        let first = Date(timeIntervalSince1970: 1_000_000)
        spot.left(reader, at: first)
        spot.left(reader, at: first.addingTimeInterval(10))
        #expect(spot.isCurrent(at: first.addingTimeInterval(1)))
    }
}
