import LectioCore
import SwiftUI

/// "Ask about this line" — the website's scoped tutor (src/components/AskAboutLine.tsx).
/// The answer streams in from /api/ai/ask. With no AI configured, or offline,
/// the line's glossary is still there underneath.
struct AskAboutLineSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    let passage: Passage
    let line: PassageLine

    @State private var question = ""
    @State private var answer = ""
    @State private var streaming = false
    @State private var error: String?
    @State private var task: Task<Void, Never>?
    @FocusState private var focused: Bool
    @State private var aiRequest: AIRequest?

    private static let suggestions = [
        "Parse every word in this line.",
        "What construction is happening here?",
        "How does this line scan?",
        "Why is this word in this case?",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(passage.citation) · \(passage.isPoetry ? "line" : "section") \(line.n)").rubricLabel()
                        Text(line.latin).font(.latin(21)).foregroundStyle(Palette.ink)
                    }

                    if model.aiAvailable == false {
                        notice("No AI provider is configured on the server, so the tutor is off. The dictionary entries below come from the offline vocabulary list.")
                    }
                    if let error { notice(error).accessibilityIdentifier("tutor-error") }

                    if !answer.isEmpty || streaming {
                        Text(answer + (streaming ? " ▍" : ""))
                            .font(.prose())
                            .foregroundStyle(Palette.ink)
                            .textSelection(.enabled)
                            .accessibilityIdentifier(streaming ? "tutor-streaming" : "tutor-answer")
                            .animation(.default, value: answer)
                    } else if model.aiAvailable != false {
                        FlowLayout(lineSpacing: 8) {
                            ForEach(Self.suggestions, id: \.self) { s in
                                Button(s) { ask(s) }
                                    .font(.subheadline)
                                    .buttonStyle(ChipStyle(on: false))
                                    .padding(.trailing, 8)
                            }
                        }
                    }

                    glossary
                }
                .padding(20)
            }
            .background(Palette.parchment.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                if model.aiAvailable != false {
                    HStack(spacing: 10) {
                        TextField("Ask about this line…", text: $question, axis: .vertical)
                            .focused($focused)
                            .lineLimit(1...4)
                            .submitLabel(.send)
                            .onSubmit { ask(question) }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .lectioGlass(in: .capsule, interactive: true)
                        Button {
                            ask(question)
                        } label: {
                            Image(systemName: "arrow.up").font(.headline)
                        }
                        .glassButton(prominent: true, circle: true)
                        .disabled(question.trimmingCharacters(in: .whitespaces).isEmpty || streaming)
                        .accessibilityLabel("Ask")
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("Ask about this line")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
        .task { await model.checkAI() }
        .aiConsent($aiRequest)
        .onDisappear { task?.cancel() }
    }

    private var glossary: some View {
        let words = line.tokens.filter { $0.isWord && !$0.glosses.isEmpty }
        return VStack(alignment: .leading, spacing: 8) {
            Text("Glossary").rubricLabel()
            ForEach(Array(words.enumerated()), id: \.offset) { _, token in
                if let gloss = token.glosses.first, let entry = library?.vocab(gloss.id) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(Text(token.text).fontWeight(.semibold))  \(Text(entry.lemma).italic())")
                            .font(.latin(17))
                            .foregroundStyle(Palette.ink)
                        Text(entry.definition).font(.footnote).foregroundStyle(Palette.inkMuted).lineLimit(2)
                    }
                }
            }
        }
    }

    private func notice(_ text: String) -> some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(Palette.ink2)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.partialWash, in: .rect(cornerRadius: 10))
    }

    private func ask(_ q: String) {
        let q = q.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty, !streaming else { return }
        focused = false
        aiRequest = AIConsent.ask { send(q) }
    }

    private func send(_ q: String) {
        question = ""
        answer = ""
        error = nil
        streaming = true
        task?.cancel()
        task = Task {
            defer { streaming = false }
            let body: JSONValue = [
                "passageId": .string(passage.id),
                "lineN": .number(Double(line.n)),
                "latin": .string(line.latin),
                "question": .string(q),
            ]
            do {
                var first = true
                for try await chunk in model.ai.stream("ask", body) {
                    if first {
                        model.update { $0.recordAiCall(route: "ask") }
                        first = false
                    }
                    answer += chunk
                }
                if answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    answer = ""
                    error = "The tutor didn't send an answer. Try again in a moment."
                }
            } catch let failure as AIClient.Failure {
                error = failure.message
            } catch is CancellationError {
            } catch {
                self.error = "Couldn't reach the tutor. The glossary below still works."
            }
        }
    }
}
