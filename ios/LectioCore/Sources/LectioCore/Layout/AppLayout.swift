import Foundation

/// Which frame the app puts round its sections, decided from the window's
/// size classes and whether the device is an iPad. Kept here, away from the
/// UI, so the rule is tested on Linux with the rest of LectioCore.
///
/// iPhone Duo (Apple's foldable, iOS 27.1) is why there are three cases and
/// not two. Its cover display has a compact width like any iPhone, but its
/// inner display has a regular width *and* a regular height, which no iPhone
/// had before. It is still a phone, so a check for "is this an iPhone" alone
/// would give it a phone's tab bar stretched across a 7.6-inch screen.
public enum AppLayout: Sendable, Equatable {
    /// A phone-sized window: every iPhone, iPhone Duo's cover display, an
    /// iPhone Pro Max turned on its side, an app in half of a Split View, an
    /// iPad window narrow enough to be compact. The tab bar of the daily
    /// places plus search; the other sections open from Today.
    case phone
    /// A phone opened out: iPhone Duo's inner display. A sidebar of every
    /// section, which slides away while a passage is open so the page
    /// spreads across both halves of the screen, Latin on the left and the
    /// English on the right, like a facing-page edition.
    case unfolded
    /// An iPad window with a regular width: the sidebar of every section.
    case tablet

    /// - Parameters:
    ///   - regularWidth: the window's horizontal size class is regular.
    ///   - regularHeight: its vertical size class is regular.
    ///   - isPad: the device is an iPad (anything else, iPhone Duo included,
    ///     is treated as a phone, as Apple asks).
    public init(regularWidth: Bool, regularHeight: Bool, isPad: Bool) {
        if !regularWidth {
            self = .phone
        } else if isPad {
            self = .tablet
        } else {
            // A phone with a regular width but a compact height is a Pro Max
            // on its side: still a phone, held close, with no room for a
            // sidebar above the fold of a short screen.
            self = regularHeight ? .unfolded : .phone
        }
    }

    /// Whether every section sits in a sidebar, rather than the daily ones
    /// in a tab bar and the rest pushed onto Today.
    public var hasSidebar: Bool { self != .phone }

    /// How much larger the Latin is set than on a phone. An iPad is held
    /// further away, so it is a step up; iPhone Duo open is held as close
    /// as a phone (and its points are already a little larger), so it keeps
    /// the phone's size, which also lets a line of hexameter fit on the left
    /// half beside its English.
    public func latinBoost(regularWidth: Bool) -> Double {
        regularWidth && self != .unfolded ? 1.2 : 1
    }
}

/// The passage open in a Reader, and the line at the top of the screen, so
/// that a change of frame (folding or unfolding iPhone Duo, or an iPad window
/// resized across the compact width) can bring the same page back at the
/// same line. A change of frame builds every screen afresh, so without this
/// the student would be dropped back on the list of passages.
public struct ReadingSpot: Sendable, Equatable {
    public let passageId: String
    /// The Reader that set it. Each Reader on screen has its own, so the old
    /// frame's Reader going away can't undo the new frame's.
    public let reader: UUID
    /// The line at the top of the screen, once the student has scrolled.
    public var line: Int?
    /// When that Reader went off screen; nil while it's showing.
    public private(set) var leftAt: Date?

    /// How long after its Reader goes a spot still counts. The old frame's
    /// screens go in the same moment the new frame is built, a little before
    /// or a little after the app hears that the frame changed.
    public static let grace: TimeInterval = 1.5

    public init(passageId: String, reader: UUID, line: Int? = nil) {
        self.passageId = passageId
        self.reader = reader
        self.line = line
    }

    /// Whether its Reader is on screen.
    public var isShowing: Bool { leftAt == nil }

    /// Whether a change of frame now should open the passage again: its
    /// Reader is showing, or went only a moment ago.
    public func isCurrent(at now: Date) -> Bool {
        guard let leftAt else { return true }
        return now.timeIntervalSince(leftAt) <= Self.grace
    }

    /// The Reader `reader` scrolled so that `line` is at the top.
    public mutating func scrolled(to line: Int, by reader: UUID) {
        if reader == self.reader { self.line = line }
    }

    /// The Reader `reader` went off screen. Another Reader's spot is left
    /// as it is: the new frame's Reader may already have taken over.
    public mutating func left(_ reader: UUID, at now: Date) {
        if reader == self.reader, leftAt == nil { leftAt = now }
    }
}
