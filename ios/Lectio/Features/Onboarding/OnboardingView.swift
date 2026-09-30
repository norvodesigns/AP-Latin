import LectioCore
import SwiftUI

/// The first run — the web's Onboarding: where you're starting, a placement
/// check for anyone who knows some Latin, a daily goal, a reminder, and an
/// offer to sign in. Skippable at every step.
struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    private enum Step: String, Hashable { case welcome, track, placementIntro, placement, result, pickUnit, goal, reminder, account }

    /// `-onboardingStep placement` starts part-way in (CI screenshots).
    @State private var step: Step = Step(rawValue: UserDefaults.standard.string(forKey: "onboardingStep") ?? "") ?? .welcome
    @State private var track: LearnerProfile.Track = .some
    @State private var start: String?
    @State private var answers: [Placement.Answer] = []
    @State private var chosen: Int?
    @State private var minutes = 20
    @State private var reminderTime = Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: .now) ?? .now
    @State private var showAccount = false
    /// Signing in from the first screen: a returning student, whose own
    /// choices are already in their account.
    @State private var returning = false

    private var placement: [PlacementQuestion] { library?.course.placement ?? [] }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    content
                }
                .padding(24)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
                .id(step)
                .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
            }
            .scrollBounceBehavior(.basedOnSize)
            .background(Palette.parchment.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Skip") { model.finishOnboarding(nil) }
                }
            }
            .animation(.spring(duration: 0.45), value: step)
        }
        .sheet(isPresented: $showAccount, onDismiss: {
            if model.account != nil {
                if returning { model.finishOnboarding(nil) } else { finish() }
            }
            returning = false
        }) {
            NavigationStack { AccountView() }
        }
        .interactiveDismissDisabled()
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case .welcome: welcome
        case .track: trackStep
        case .placementIntro: placementIntro
        case .placement: placementQuestion
        case .result: result
        case .pickUnit: pickUnit
        case .goal: goal
        case .reminder: reminder
        case .account: account
        }
    }

    /* -------------------------------------------------------------- */

    private var welcome: some View {
        VStack(spacing: 14) {
            Text("Lectio").font(.wordmark(80)).foregroundStyle(Palette.rubric).padding(.top, 40)
            Text("lege, notā, mementō — read, mark, remember")
                .font(.latinItalic(18, relativeTo: .callout)).foregroundStyle(Palette.inkMuted)
            Text("Latin from the very first word to the AP exam: short lessons in order, the real texts with every word glossed, and flashcards that come back just before you forget.")
                .font(.prose(.body)).foregroundStyle(Palette.ink2).multilineTextAlignment(.center).padding(.top, 10)
            Button { step = .track } label: {
                Text("Begin").font(.headline).frame(maxWidth: 280).padding(.vertical, 8)
            }
            .buttonStyle(.glassProminent)
            .padding(.top, 18)
            Button("I already have an account") {
                returning = true
                showAccount = true
            }
            .font(.subheadline)
            .tint(Palette.rubric)
            .padding(.top, 4)
        }
    }

    private var trackStep: some View {
        VStack(spacing: 14) {
            header("1 of 3", "Where are you starting?")
            card("I’m new to Latin", "Start at the very beginning: the sounds, the first words, and why endings matter.") { choose(.new) }
            card("I know some Latin", "Take a short check and start where it finds you, or choose a unit yourself.") { choose(.some) }
            card("I’m preparing for the AP exam", "Go straight to Vergil and Pliny, the quiz and the practice exam. The course is always there.") { choose(.ap) }
            card("I teach Latin", "Set up a classroom, assign sections, and see your students’ progress.") { choose(.teacher) }
        }
    }

    private var placementIntro: some View {
        VStack(spacing: 16) {
            header("Finding your level", "A quick check")
            Text("Up to \(placement.count) short questions, easiest first. It stops as soon as it finds your level, usually well before the end. No score is kept.")
                .font(.prose(.body)).foregroundStyle(Palette.ink2).multilineTextAlignment(.center)
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 12) {
                    Button { step = .placement } label: { Text("Start the check").font(.headline).frame(maxWidth: 300).padding(.vertical, 6) }
                        .buttonStyle(.glassProminent)
                    Button { step = .pickUnit } label: { Text("I’ll choose a unit").frame(maxWidth: 300).padding(.vertical, 4) }
                        .buttonStyle(.glass)
                }
            }
        }
    }

    @ViewBuilder
    private var placementQuestion: some View {
        if answers.count < placement.count {
            let q = placement[answers.count]
            VStack(alignment: .leading, spacing: 14) {
                ProgressView(value: Double(answers.count), total: Double(placement.count)).tint(Palette.rubric)
                Text(rich: q.step.prompt).font(.system(.title3, design: .serif).weight(.semibold)).foregroundStyle(Palette.ink)
                if let latin = q.step.latin {
                    Text(latin).font(.latin(28, relativeTo: .title)).foregroundStyle(Palette.ink)
                }
                ForEach(Array(q.step.options.enumerated()), id: \.offset) { i, option in
                    Button { answer(i, q) } label: {
                        Text(rich: option)
                            .font(.prose(.body))
                            .foregroundStyle(Palette.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16).padding(.vertical, 13)
                            .background(optionBackground(i, q), in: .rect(cornerRadius: 14))
                            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(optionBorder(i, q), lineWidth: chosen == nil ? 0.75 : 1.5))
                    }
                    .buttonStyle(PressStyle())
                    .disabled(chosen != nil)
                }
                Button("I don’t know this yet") {
                    answers.append(Placement.Answer(unit: q.unit, right: false))
                    settle()
                }
                .font(.subheadline)
                .tint(Palette.inkMuted)
            }
            .id(answers.count)
            .sensoryFeedback(.selection, trigger: answers.count)
        }
    }

    private var result: some View {
        let place = start.flatMap { library?.course.place($0) }
        return VStack(spacing: 16) {
            header("Your starting point", place.map { "\($0.level.title), Unit \($0.unit.n)" } ?? "You know it all so far")
            Group {
                if let place {
                    Text("Start with \(Text(place.unit.title).italic()). The units before it will be there whenever you want to review them.")
                } else {
                    Text("You answered everything right: you know every unit the course has so far. New units are on the way; until then, go on to the AP passages, or review with the readings at the end of each unit.")
                }
            }
            .font(.prose(.body)).foregroundStyle(Palette.ink2).multilineTextAlignment(.center)
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 12) {
                    Button { step = .goal } label: { Text("Sounds good").font(.headline).frame(maxWidth: 300).padding(.vertical, 6) }
                        .buttonStyle(.glassProminent)
                    Button { step = .pickUnit } label: { Text("Choose another unit").frame(maxWidth: 300).padding(.vertical, 4) }
                        .buttonStyle(.glass)
                }
            }
        }
    }

    private var pickUnit: some View {
        VStack(alignment: .leading, spacing: 0) {
            header("Choose a unit", "Where would you like to start?").frame(maxWidth: .infinity).padding(.bottom, 14)
            ForEach(library?.course.levels ?? []) { level in
                ForEach(level.units) { unit in
                    Hairline(color: Palette.hair)
                    Button {
                        start = unit.lessons.first?.id
                        step = .goal
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(level.title) · Unit \(unit.n)").quietLabel()
                            Text(unit.title).font(.system(.body, design: .serif)).foregroundStyle(Palette.ink)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 11)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var goal: some View {
        VStack(spacing: 16) {
            header("2 of 3", "How much time a day?")
            Text("A little every day beats a lot now and then. You can change this any time.")
                .font(.prose(.callout)).foregroundStyle(Palette.inkMuted).multilineTextAlignment(.center)
            HStack(spacing: 10) {
                ForEach([10, 20, 30, 45], id: \.self) { m in
                    Button { minutes = m } label: {
                        VStack(spacing: 2) {
                            Text("\(m)").font(.system(size: 30, design: .serif)).foregroundStyle(Palette.ink)
                            Text("min").quietLabel()
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(minutes == m ? Palette.redTint : Palette.slip, in: .rect(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(minutes == m ? Palette.rubric : Palette.ruleStrong, lineWidth: minutes == m ? 1.5 : 0.75))
                    }
                    .buttonStyle(PressStyle())
                    .accessibilityAddTraits(minutes == m ? .isSelected : [])
                }
            }
            Button { step = .reminder } label: { Text("Continue").font(.headline).frame(maxWidth: 300).padding(.vertical, 6) }
                .buttonStyle(.glassProminent)
                .padding(.top, 8)
        }
    }

    private var reminder: some View {
        VStack(spacing: 16) {
            header("3 of 3", "A daily nudge?")
            Text("One notification a day, at a time you choose, saying how many cards are waiting. Nothing else.")
                .font(.prose(.callout)).foregroundStyle(Palette.inkMuted).multilineTextAlignment(.center)
            DatePicker("Time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                .datePickerStyle(.wheel)
                .labelsHidden()
                .frame(maxHeight: 160)
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 12) {
                    Button {
                        let c = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
                        model.reminderMinutes = (c.hour ?? 16) * 60 + (c.minute ?? 0)
                        Task {
                            _ = await model.setReminder(enabled: true)
                            next()
                        }
                    } label: { Text("Remind me").font(.headline).frame(maxWidth: 300).padding(.vertical, 6) }
                        .buttonStyle(.glassProminent)
                    Button { next() } label: { Text("Not now").frame(maxWidth: 300).padding(.vertical, 4) }
                        .buttonStyle(.glass)
                }
            }
        }
    }

    private var account: some View {
        VStack(spacing: 16) {
            header(track == .teacher ? "One more thing" : "Last thing", track == .teacher ? "Sign in to teach" : "Keep your progress safe")
            Group {
                switch track {
                case .teacher:
                    Text("Classrooms need an account. It takes a minute, and your students join with a code.")
                case .ap:
                    Text("Already use Lectio on the website? Sign in and your deck, quiz history and highlights come with you. Everything also works without an account.")
                case .new, .some:
                    Text("Everything works without an account, and your progress stays on this device. With a free account it follows you to the website and your other devices.")
                }
            }
                .font(.prose(.body)).foregroundStyle(Palette.ink2).multilineTextAlignment(.center)
            GlassEffectContainer(spacing: 12) {
                VStack(spacing: 12) {
                    Button { showAccount = true } label: { Text("Sign in or create an account").font(.headline).frame(maxWidth: 320).padding(.vertical, 6) }
                        .buttonStyle(.glassProminent)
                    Button { finish() } label: { Text("Not now").frame(maxWidth: 320).padding(.vertical, 4) }
                        .buttonStyle(.glass)
                }
            }
        }
    }

    /* -------------------------------------------------------------- */

    private func header(_ rubric: String, _ title: String) -> some View {
        VStack(spacing: 6) {
            Text(rubric).rubricLabel()
            Text(title).font(.system(.title, design: .serif)).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
        }
        .padding(.top, 12)
    }

    private func card(_ title: String, _ body: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text(body).font(.prose(.subheadline)).foregroundStyle(Palette.inkMuted).multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Palette.slip, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.ruleStrong, lineWidth: 0.75))
        }
        .buttonStyle(PressStyle())
    }

    private func choose(_ t: LearnerProfile.Track) {
        track = t
        switch t {
        case .new:
            start = library?.course.lessons.first?.lesson.id
            step = .goal
        case .some:
            step = .placementIntro
        case .ap, .teacher:
            start = nil
            step = .goal
        }
    }

    private func answer(_ i: Int, _ q: PlacementQuestion) {
        guard chosen == nil else { return }
        chosen = i
        Task {
            try? await Task.sleep(for: .milliseconds(650))
            answers.append(Placement.Answer(unit: q.unit, right: i == q.step.answer))
            chosen = nil
            if !Placement.continues(answers, total: placement.count) { settle() }
        }
    }

    /// The check is over: work out the starting lesson.
    private func settle() {
        start = Placement.start(answers).flatMap { library?.course.firstLesson(ofUnit: $0)?.lesson.id }
        step = .result
    }

    private func next() { step = .account }

    private func finish() {
        model.finishOnboarding(LearnerProfile(track: track, startLessonId: start, onboardedAt: StudyDates.isoTimestamp(.now)), minutes: minutes)
    }

    private func optionBackground(_ i: Int, _ q: PlacementQuestion) -> Color {
        guard chosen != nil else { return Palette.slip }
        if i == q.step.answer { return Palette.correctWash }
        return i == chosen ? Palette.incorrectWash : Palette.slip
    }

    private func optionBorder(_ i: Int, _ q: PlacementQuestion) -> Color {
        guard chosen != nil else { return Palette.ruleStrong }
        if i == q.step.answer { return Palette.correct }
        return i == chosen ? Palette.incorrect : Palette.ruleStrong
    }
}
