import SwiftUI

/// A hairline rule — the page's only way of separating things.
struct Hairline: View {
    var color: Color = Palette.rule
    var body: some View {
        Rectangle().fill(color).frame(height: 0.5)
    }
}

/// A figure with a quiet caption under it, set in the serif — the dashboard's
/// countdown and streak numbers.
struct Figure: View {
    let value: String
    let caption: String
    var tint: Color = Palette.ink

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(.largeTitle, design: .serif).weight(.medium))
                .monospacedDigit()
                .foregroundStyle(tint)
                .contentTransition(.numericText())
            Text(caption).quietLabel()
        }
        .accessibilityElement(children: .combine)
    }
}

/// Parchment behind a screen, running under the floating glass bars.
struct PageBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .scrollContentBackground(.hidden)
            .background(Palette.parchment.ignoresSafeArea())
    }
}

extension View {
    func pageBackground() -> some View { modifier(PageBackground()) }
}

/// Lays children out left to right, wrapping onto new lines — how a line of
/// Latin is set as individually tappable words.
struct FlowLayout: Layout {
    var lineSpacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        var widest: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                y += lineHeight + lineSpacing
                x = 0
                lineHeight = 0
            }
            x += size.width
            lineHeight = max(lineHeight, size.height)
            widest = max(widest, x)
        }
        return CGSize(width: proposal.width ?? widest, height: y + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var lineHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > bounds.minX, x + size.width > bounds.maxX {
                y += lineHeight + lineSpacing
                x = bounds.minX
                lineHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
            x += size.width
            lineHeight = max(lineHeight, size.height)
        }
    }
}

/// A section the app doesn't have yet: says so plainly and offers the web
/// version, which already has it.
struct ComingSoonView: View {
    let title: String
    let systemImage: String
    let webPath: String
    let blurb: String

    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label(title, systemImage: systemImage)
            } description: {
                Text(blurb + "\n\nIt's coming to the app soon, and it's already on the web.")
                    .font(.prose(.callout))
            } actions: {
                Link(destination: AppConfig.web(webPath)) {
                    Label("Open on the web", systemImage: "safari")
                }
                .buttonStyle(.glassProminent)
            }
            .navigationTitle(title)
            .pageBackground()
        }
    }
}

/* ------------------------------------------------------------------ */
/* Section stacks                                                      */
/* ------------------------------------------------------------------ */

extension EnvironmentValues {
    /// True when a section has been pushed onto another stack — Today's, on
    /// iPhone, for the sections that aren't in the tab bar — rather than
    /// shown as a tab or in the sidebar with a stack of its own.
    @Entry var isPushedSection = false
}

/// A section's navigation stack, unless it's already inside one.
struct SectionStack<Content: View>: View {
    @Environment(\.isPushedSection) private var isPushed
    @ViewBuilder var content: Content

    var body: some View {
        if isPushed {
            content
        } else {
            NavigationStack { content }
        }
    }
}
