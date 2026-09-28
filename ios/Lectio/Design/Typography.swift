import SwiftUI

/// Three voices, as on the web: the Latin in EB Garamond (bundled, OFL), prose
/// in the system serif (New York), and the interface in San Francisco. Every
/// size is relative to a Dynamic Type style so the whole app — the Latin
/// included — follows the reader's text-size setting.
extension Font {
    /// The Latin itself. `scale` is the reader's own Latin-only size setting.
    static func latin(_ size: CGFloat = 22, relativeTo style: Font.TextStyle = .body, scale: Double = 1) -> Font {
        .custom("EBGaramond-Regular", size: size * scale, relativeTo: style)
    }

    static func latinItalic(_ size: CGFloat = 22, relativeTo style: Font.TextStyle = .body, scale: Double = 1) -> Font {
        .custom("EBGaramond-Italic", size: size * scale, relativeTo: style)
    }

    /// Reading prose — summaries, explanations, definitions.
    static func prose(_ style: Font.TextStyle = .body) -> Font {
        .system(style, design: .serif)
    }

    /// The cursive wordmark.
    static func wordmark(_ size: CGFloat = 52) -> Font {
        .custom("Italianno-Regular", size: size, relativeTo: .largeTitle)
    }
}

extension View {
    /// Small, uppercase, widely tracked rubric-red label — the web's section
    /// headings, which stay quiet so the Latin is always the largest thing.
    func rubricLabel() -> some View {
        font(.caption.weight(.semibold))
            .tracking(1.4)
            .textCase(.uppercase)
            .foregroundStyle(Palette.rubric)
    }

    /// The same treatment in ink, for secondary labels.
    func quietLabel() -> some View {
        font(.caption2.weight(.medium))
            .tracking(1.2)
            .textCase(.uppercase)
            .foregroundStyle(Palette.inkMuted)
    }
}
