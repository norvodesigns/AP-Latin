import SwiftUI
import TipKit

/// A few first-visit tips (TipKit), each shown once, in place, the first
/// time a student reaches the screen it explains, and never in the
/// screenshots.
enum LectioTips {
    /// At launch, before any tip is shown.
    static func configure() {
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "seedDemo") || defaults.bool(forKey: "showOnboarding") {
            Tips.hideAllTipsForTesting()
        }
        try? Tips.configure([.displayFrequency(.immediate)])
    }
}

/// Today: where each day starts.
nonisolated struct TodayTip: Tip {
    var title: Text { Text("Your day starts here") }
    var message: Text? {
        Text("Today shows your next lesson, the cards that are due, and how close you are to your daily goal. Tap any panel to go straight in.")
    }
    var image: Image? { Image(systemName: "sun.horizon") }
}

/// The Reading Room: the gestures a passage answers to.
nonisolated struct GlossTip: Tip {
    var title: Text { Text("Tap any word") }
    var message: Text? {
        Text("Its meaning comes up from the vocabulary list. Touch and hold a word to highlight it, add a note, or ask about its line. Tap a line number to flag a hard line.")
    }
    var image: Image? { Image(systemName: "hand.tap") }
}

/// Browse: the whole app in one list.
nonisolated struct BrowseTip: Tip {
    var title: Text { Text("Everything is here") }
    var message: Text? {
        Text("Every part of Lectio in one list, and search finds passages, words and lessons.")
    }
    var image: Image? { Image(systemName: "square.grid.2x2") }
}

extension View {
    /// A tip set into the page: parchment, the rubric tint, the page's own
    /// corner radius.
    func lectioTipStyle() -> some View {
        tipBackground(Palette.slip)
            .tint(Palette.rubric)
    }
}
