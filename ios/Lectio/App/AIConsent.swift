import SwiftUI

/// Permission to send text to the AI service. The AI features pass the
/// student's own writing to a third-party AI provider, so the app asks once,
/// plainly, before the first request (App Review guideline 5.1.2(i)), and
/// the answer can be changed at any time in Settings › AI features.
enum AIConsent {
    static let key = "aiConsent"

    static var granted: Bool { UserDefaults.standard.bool(forKey: key) }

    /// Runs `action` now if AI is allowed. Otherwise hands it back as a
    /// request for `.aiConsent(_:)` to ask about first.
    static func ask(_ action: @escaping () -> Void) -> AIRequest? {
        if granted {
            action()
            return nil
        }
        return AIRequest(run: action)
    }
}

/// An AI request waiting on the student's permission.
struct AIRequest: Identifiable {
    let id = UUID()
    let run: () -> Void
}

extension View {
    /// Asks for permission when `request` is set, then runs it if allowed;
    /// `onDecline` is the self-graded path, where there is one.
    func aiConsent(_ request: Binding<AIRequest?>, onDecline: @escaping () -> Void = {}) -> some View {
        sheet(item: request) { pending in
            AIConsentSheet { allowed in
                request.wrappedValue = nil
                if allowed {
                    UserDefaults.standard.set(true, forKey: AIConsent.key)
                    pending.run()
                } else {
                    onDecline()
                }
            }
        }
    }
}

/// What the AI features send, and to whom, before anything is sent.
struct AIConsentSheet: View {
    let decide: (Bool) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 40, weight: .light))
                        .foregroundStyle(Palette.rubric)
                    Text("Before you use AI")
                        .font(.system(.title, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Text("Lectio’s AI grading, line tutor and sight-passage selection are written by an AI service outside Lectio. Here is what that means.")
                        .font(.prose(.body))
                        .foregroundStyle(Palette.ink2)
                    GlassPanel {
                        point("paperplane", "What is sent",
                              "The Latin you’re working on, and what you wrote or asked: a translation, an answer, an essay or a question. Not your name, your email or your progress.")
                        Hairline(color: Palette.hair)
                        point("server.rack", "Who receives it",
                              "Lectio’s server passes it to an AI provider, Google Gemini (or Groq as a backup), which writes the feedback.")
                        Hairline(color: Palette.hair)
                        point("hand.raised", "Leave out anything personal",
                              "The providers may keep what they receive and use it to improve their models.")
                    }
                    Text("Nothing is sent until you press an AI button. You can change your mind in Settings › AI features, and every AI feature has a self-graded path that works without it.")
                        .font(.prose(.subheadline))
                        .foregroundStyle(Palette.inkMuted)
                    Link(destination: AppConfig.web("privacy")) {
                        Label("Privacy policy", systemImage: "hand.raised")
                            .font(.subheadline)
                    }
                    GlassGroup(spacing: 12) {
                        VStack(spacing: 12) {
                            Button { decide(true) } label: {
                                Text("Allow AI features").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                            }
                            .glassButton(prominent: true)
                            Button { decide(false) } label: {
                                Text("Not now").frame(maxWidth: .infinity).padding(.vertical, 4)
                            }
                            .glassButton()
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(24)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .navigationTitle("AI features")
            .navigationBarTitleDisplayMode(.inline)
        }
        .interactiveDismissDisabled()
    }

    private func point(_ symbol: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Palette.rubric)
                .frame(width: 36, height: 36)
                .background(Palette.rubric.opacity(0.12), in: .circle)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text(detail).font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }
}
