import SwiftUI

/// Liquid Glass where the system has it, and a quiet material look where it
/// doesn't, so one build runs on iOS 17 and 18 as well as 26 and later.
///
/// Glass belongs to the layer that floats above the page (buttons, toolbars,
/// capsules) and never to the Latin itself. Every glass call in the app goes
/// through the wrappers here: on iOS 26+ each is the real thing, before that
/// each is a thin material with a hairline edge in the page's own colours.
enum LectioChrome {
    /// Launch with `-legacyChrome YES`, or turn on Settings > Classic look and
    /// relaunch, to see the pre-26 look and layout on a device that has glass.
    /// How CI screenshots the fallback, and how a tester compares the two.
    static let forceLegacy = UserDefaults.standard.bool(forKey: "legacyChrome")

    /// Whether the system's Liquid Glass is in use.
    static var usesGlass: Bool {
        if forceLegacy { return false }
        if #available(iOS 26.0, *) { return true }
        return false
    }
}

extension View {
    /// A glass surface in `shape`: system glass on iOS 26+, a material with a
    /// hairline edge before that.
    @ViewBuilder
    func lectioGlass<S: Shape>(in shape: S, interactive: Bool = false) -> some View {
        // Each availability check stands alone: a view builder handles a bare
        // `#available` branch, and the plain flag is tested before it.
        if LectioChrome.forceLegacy {
            classicGlass(in: shape)
        } else if #available(iOS 26.0, *) {
            if interactive {
                glassEffect(.regular.interactive(), in: shape)
            } else {
                glassEffect(.regular, in: shape)
            }
        } else {
            classicGlass(in: shape)
        }
    }

    private func classicGlass<S: Shape>(in shape: S) -> some View {
        background(.regularMaterial, in: shape)
            .overlay(shape.stroke(Palette.rule, lineWidth: 0.5))
    }

    /// The app's glass button: `.glass` (or `.glassProminent`) on iOS 26+, a
    /// capsule of material (or of the tint) before that. `circle` is for a
    /// lone icon, like the send arrow.
    @ViewBuilder
    func glassButton(prominent: Bool = false, circle: Bool = false) -> some View {
        if LectioChrome.forceLegacy {
            buttonStyle(ClassicGlassButtonStyle(prominent: prominent, circle: circle))
        } else if #available(iOS 26.0, *) {
            if prominent {
                if circle { buttonStyle(.glassProminent).buttonBorderShape(.circle) } else { buttonStyle(.glassProminent) }
            } else {
                if circle { buttonStyle(.glass).buttonBorderShape(.circle) } else { buttonStyle(.glass) }
            }
        } else {
            buttonStyle(ClassicGlassButtonStyle(prominent: prominent, circle: circle))
        }
    }

    /// Lets two glass shapes morph into each other as one appears and the
    /// other goes (the flashcard's grade buttons). A no-op before iOS 26.
    @ViewBuilder
    func lectioGlassID<ID: Hashable & Sendable>(_ id: ID, in namespace: Namespace.ID) -> some View {
        if LectioChrome.forceLegacy {
            self
        } else if #available(iOS 26.0, *) {
            glassEffectID(id, in: namespace)
        } else {
            self
        }
    }
}

/// Glass shapes that sit close together blend into one on iOS 26+; before
/// that this is just its content.
struct GlassGroup<Content: View>: View {
    var spacing: CGFloat?
    @ViewBuilder var content: Content

    init(spacing: CGFloat? = nil, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        if LectioChrome.forceLegacy {
            content
        } else if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) { content }
        } else {
            content
        }
    }
}

/// A button for the layer above the page where there's no glass: a capsule of
/// material with a hairline edge, or, when prominent, filled with the tint
/// (the rubric red) and the page colour on top.
struct ClassicGlassButtonStyle: ButtonStyle {
    var prominent = false
    var circle = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, circle ? 10 : 18)
            .padding(.vertical, circle ? 10 : 9)
            .foregroundStyle(prominent ? AnyShapeStyle(Palette.onRubric) : AnyShapeStyle(.tint))
            .background { surface }
            .opacity(isEnabled ? (configuration.isPressed ? 0.78 : 1) : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .contentShape(Capsule())
    }

    @ViewBuilder
    private var surface: some View {
        if prominent {
            Capsule().fill(.tint)
        } else {
            Capsule().fill(.regularMaterial).overlay(Capsule().stroke(Palette.ruleStrong, lineWidth: 0.5))
        }
    }
}
