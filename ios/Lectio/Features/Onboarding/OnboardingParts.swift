import LectioCore
import SwiftUI

/* ------------------------------------------------------------------ */
/* The mark                                                            */
/* ------------------------------------------------------------------ */

/// The app icon's L on a disc of glass, between two laurels: the first thing
/// the welcome shows, and the last thing the plan does. It settles into
/// place once, unless Reduce Motion is on.
struct LectioMedallion: View {
    var size: CGFloat = 148
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        HStack(spacing: size * 0.05) {
            laurel("laurel.leading", from: -1)
            ZStack {
                Circle()
                    .fill(Palette.parchment.opacity(0.35))
                    .frame(width: size, height: size)
                    .lectioGlass(in: Circle())
                Image("LectioMark")
                    .resizable()
                    .scaledToFit()
                    .frame(width: size * 0.82, height: size * 0.82)
                    .foregroundStyle(Palette.rubric)
            }
            .scaleEffect(shown || reduceMotion ? 1 : 0.86)
            .opacity(shown || reduceMotion ? 1 : 0)
            laurel("laurel.trailing", from: 1)
        }
        .onAppear {
            withAnimation(.spring(duration: 0.9, bounce: 0.25).delay(0.1)) { shown = true }
        }
        .accessibilityHidden(true)
    }

    private func laurel(_ name: String, from side: CGFloat) -> some View {
        Image(systemName: name)
            .font(.system(size: size * 0.42, weight: .light))
            .foregroundStyle(Palette.gilt)
            .offset(x: shown || reduceMotion ? 0 : side * 18)
            .opacity(shown || reduceMotion ? 1 : 0)
            .animation(.spring(duration: 1.1, bounce: 0.2).delay(0.35), value: shown)
    }
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

/// How far through the setup questions: one short bar per step.
struct ProgressSegments: View {
    let count: Int
    let current: Int

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<count, id: \.self) { i in
                Capsule()
                    .fill(i <= current ? Palette.rubric : Palette.ruleStrong.opacity(0.6))
                    .frame(height: 4)
            }
        }
        .animation(.spring(duration: 0.4), value: current)
        .accessibilityElement()
        .accessibilityLabel("Step \(min(current + 1, count)) of \(count)")
    }
}

/// The tour's page dots: the current one is a longer red bar.
struct PageDots: View {
    let count: Int
    let current: Int

    var body: some View {
        HStack(spacing: 7) {
            ForEach(0..<count, id: \.self) { i in
                Capsule()
                    .fill(i == current ? Palette.rubric : Palette.inkFaint.opacity(0.45))
                    .frame(width: i == current ? 22 : 7, height: 7)
            }
        }
        .animation(.spring(duration: 0.35), value: current)
        .accessibilityElement()
        .accessibilityLabel("Page \(current + 1) of \(count)")
    }
}

/// A step's heading: a small rubric eyebrow, a serif title, a line of prose.
struct OnboardingHeading: View {
    let eyebrow: String
    let title: String
    var detail: String? = nil

    var body: some View {
        VStack(spacing: 8) {
            Text(eyebrow).rubricLabel()
            Text(title)
                .font(.system(.largeTitle, design: .serif))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if let detail {
                Text(detail)
                    .font(.prose(.callout))
                    .foregroundStyle(Palette.inkMuted)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// One answer to "where are you starting?": an icon, a title, a line of
/// explanation, and a check when it's the one chosen.
struct ChoiceCard: View {
    let symbol: String
    let tint: Color
    let title: String
    let detail: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: 14) {
                Image(systemName: symbol)
                    .font(.title3)
                    .foregroundStyle(tint)
                    .frame(width: 46, height: 46)
                    .background(tint.opacity(0.14), in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                    Text(detail)
                        .font(.prose(.subheadline))
                        .foregroundStyle(Palette.inkMuted)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(selected ? Palette.rubric : Palette.inkFaint)
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? Palette.redTint : Palette.slip.opacity(0.85), in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(selected ? Palette.rubric : Palette.ruleStrong, lineWidth: selected ? 1.5 : 0.75)
            )
            .contentShape(.rect(cornerRadius: 20))
        }
        .buttonStyle(PressStyle())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// A row of the plan: what, and the answer.
struct PlanRow: View {
    let symbol: String
    let tint: Color
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Image(systemName: symbol)
                .font(.body.weight(.medium))
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.14), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).quietLabel()
                Text(value)
                    .font(.system(.body, design: .serif))
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}

/// What the daily reminder looks like, before the system asks permission.
struct NotificationPreview: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image("LectioMark")
                .resizable()
                .scaledToFit()
                .foregroundStyle(Palette.rubric)
                .padding(5)
                .frame(width: 38, height: 38)
                .background(Palette.parchment, in: .rect(cornerRadius: 9, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).strokeBorder(Palette.rule, lineWidth: 0.5))
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text("Time for Latin").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
                    Spacer()
                    Text("now").font(.caption).foregroundStyle(Palette.inkMuted)
                }
                Text("12 vocabulary cards due. Keep your 5-day streak going.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .lectioGlass(in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Example reminder: Time for Latin. 12 vocabulary cards due. Keep your 5-day streak going.")
    }
}

/* ------------------------------------------------------------------ */
/* The tour                                                            */
/* ------------------------------------------------------------------ */

/// The three things Lectio does, a page each, every one with a small live
/// picture of the real screen rather than a promise. Swipe, or press the
/// button the caller puts under it.
struct TourPages: View {
    @Binding var page: Int
    static let count = 3

    var body: some View {
        TabView(selection: $page) {
            TourPage(
                eyebrow: "The course",
                title: "Start where you are",
                detail: "Short lessons in order, from your first Latin word to Vergil. A quick check skips what you already know."
            ) { CoursePreview() }
                .tag(0)
            TourPage(
                eyebrow: "The Reading Room",
                title: "Every word, glossed",
                detail: "All the AP passages of Vergil and Pliny. Tap a word for its meaning, hold to highlight, and ask about any line."
            ) { ReadingPreview() }
                .tag(1)
            TourPage(
                eyebrow: "Vocabulary",
                title: "Words that stick",
                detail: "Each card comes back just before you'd forget it. A few minutes a day keeps the whole AP list fresh, on iPhone or Apple Watch."
            ) { FlashcardPreview() }
                .tag(2)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
    }
}

private struct TourPage<Picture: View>: View {
    let eyebrow: String
    let title: String
    let detail: String
    @ViewBuilder var picture: Picture

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                picture
                    .frame(maxWidth: 380)
                    .padding(.top, 8)
                OnboardingHeading(eyebrow: eyebrow, title: title, detail: detail)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .scrollBounceBehavior(.basedOnSize)
    }
}

/// The course: two units done, the third under way.
private struct CoursePreview: View {
    @Environment(\.library) private var library
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var filled = false

    private var titles: [String] {
        let units = library?.course.grammarLevels.first?.units.prefix(3).map { RichText.plain($0.title) } ?? []
        return units.count == 3 ? units : ["Sounds and first words", "The first declension", "The second declension"]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Prīma").rubricLabel().padding(.bottom, 10)
            ForEach(Array(titles.enumerated()), id: \.offset) { i, title in
                if i > 0 { Hairline(color: Palette.hair).padding(.vertical, 10) }
                HStack(spacing: 12) {
                    Image(systemName: i < 2 ? "checkmark.circle.fill" : "play.circle.fill")
                        .font(.title2)
                        .foregroundStyle(i < 2 ? Palette.correct : Palette.rubric)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Unit \(i + 1)").quietLabel()
                        Text(title)
                            .font(.system(.subheadline, design: .serif).weight(i == 2 ? .semibold : .regular))
                            .foregroundStyle(Palette.ink)
                            .lineLimit(1)
                        if i == 2 {
                            ProgressView(value: filled || reduceMotion ? 0.4 : 0.05)
                                .tint(Palette.rubric)
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .padding(20)
        .lectioGlass(in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .onAppear { withAnimation(.easeOut(duration: 1.2).delay(0.3)) { filled = true } }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("A course map: units one and two done, unit three under way.")
    }
}

/// The opening of the Aeneid, with one word looked up.
private struct ReadingPreview: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var looked = false
    private let words = ["Arma", "virumque", "canō,", "Trōiae", "quī", "prīmus", "ab", "ōrīs"]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Aeneid 1.1").rubricLabel()
            FlowLayout(lineSpacing: 6) {
                ForEach(Array(words.enumerated()), id: \.offset) { i, word in
                    Text(word)
                        .font(.latin(24))
                        .foregroundStyle(Palette.ink)
                        .padding(.horizontal, 3)
                        .background {
                            if i == 1 && (looked || reduceMotion) {
                                RoundedRectangle(cornerRadius: 5).fill(Palette.redTint)
                            }
                        }
                        .overlay(alignment: .bottom) {
                            if i == 1 && (looked || reduceMotion) {
                                Rectangle().fill(Palette.rubric).frame(height: 1.5).offset(y: 1)
                            }
                        }
                        .padding(.trailing, 4)
                }
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("\(Text("vir, virī").italic())  m.").font(.latin(19)).foregroundStyle(Palette.ink)
                Text("man; hero").font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
                Hairline(color: Palette.hair).padding(.vertical, 2)
                Text("\(Text("-que").italic())  and").font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.slip, in: .rect(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Palette.ruleStrong, lineWidth: 0.75))
            .opacity(looked || reduceMotion ? 1 : 0)
            .offset(y: looked || reduceMotion ? 0 : 10)
        }
        .padding(20)
        .lectioGlass(in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .onAppear { withAnimation(.spring(duration: 0.6).delay(0.45)) { looked = true } }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("The first line of the Aeneid, with the word virumque looked up: vir, man or hero, and -que, and.")
    }
}

/// A flashcard on top of its deck, with the two answers.
private struct FlashcardPreview: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dealt = false

    var body: some View {
        VStack(spacing: 18) {
            ZStack {
                card.rotationEffect(.degrees(dealt || reduceMotion ? -7 : 0)).offset(x: -10, y: 8).opacity(0.55)
                card.rotationEffect(.degrees(dealt || reduceMotion ? 5 : 0)).offset(x: 10, y: 4).opacity(0.75)
                card.overlay {
                    VStack(spacing: 6) {
                        Text("amor").font(.latin(40)).foregroundStyle(Palette.ink)
                        Text("amōris  m.").font(.latinItalic(18)).foregroundStyle(Palette.inkMuted)
                        Hairline(color: Palette.redLine).frame(width: 60).padding(.vertical, 6)
                        Text("love").font(.prose(.title3)).foregroundStyle(Palette.ink2)
                    }
                }
            }
            .frame(height: 210)
            HStack(spacing: 10) {
                Label("Practice again", systemImage: "arrow.counterclockwise")
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .foregroundStyle(Palette.ink)
                    .lectioGlass(in: Capsule())
                Label("Got it", systemImage: "checkmark")
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .foregroundStyle(Palette.onRubric)
                    .background(Palette.rubric, in: Capsule())
            }
            .font(.subheadline.weight(.semibold))
            .labelStyle(.titleAndIcon)
        }
        .onAppear { withAnimation(.spring(duration: 0.8, bounce: 0.3).delay(0.2)) { dealt = true } }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("A flashcard: amor, amōris, love, with the answers Practice again and Got it.")
    }

    private var card: some View {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(Palette.slip)
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Palette.ruleStrong, lineWidth: 0.75))
            .frame(width: 240, height: 190)
            .shadow(color: Palette.ink.opacity(0.08), radius: 12, y: 6)
    }
}
