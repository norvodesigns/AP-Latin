import Foundation
import LectioCore

/// Keeping the student's place in a passage when the app changes frame.
///
/// Folding or unfolding iPhone Duo swaps the phone's tab bar for the sidebar
/// (RootView.swift), which builds every screen afresh. Each Reader reports
/// where it is; when the frame changes, the passage opens again on the
/// Reading Room's stack, and the new Reader scrolls back to the line the old
/// one was on. The same happens when an iPad window is resized across the
/// compact width.
extension AppModel {
    /// A Reader came on screen (`line` is where it already is, when it is
    /// coming back into view). Returns the line to scroll to when it takes
    /// over from a Reader on the same passage that has just gone: the old
    /// frame's, which may go just before or just after this one appears.
    func readerAppeared(_ passageId: String, reader: UUID, line current: Int?) -> Int? {
        var resume: Int? = nil
        if let spot = readingSpot, spot.passageId == passageId, spot.reader != reader, spot.isCurrent(at: .now) {
            resume = spot.line
        }
        readingSpot = ReadingSpot(passageId: passageId, reader: reader, line: resume ?? current)
        readerShowing = true
        return resume
    }

    /// The line at the top of a Reader's screen changed.
    func readerScrolled(to line: Int?, reader: UUID) {
        guard let line else { return }
        readingSpot?.scrolled(to: line, by: reader)
    }

    /// A Reader went off screen: closed, covered by a pushed page, or taken
    /// away by a change of frame.
    func readerDisappeared(reader: UUID) {
        readingSpot?.left(reader, at: .now)
        readerShowing = readingSpot?.isShowing ?? false
    }

    /// The window changed frame (phone tab bar ↔ sidebar). If a passage was
    /// open, it opens again in the Reading Room, so the student isn't left
    /// on a list.
    func frameChanged(library: ContentLibrary?) {
        guard let spot = readingSpot, spot.isCurrent(at: .now),
              let passage = library?.passage(spot.passageId) else { return }
        selectedTab = .read
        if readPath.last?.id != passage.id { readPath = [passage] }
    }
}
