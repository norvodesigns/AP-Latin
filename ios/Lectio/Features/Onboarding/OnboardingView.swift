import LectioCore
import SwiftUI

/// The first run. A welcome and a three-page tour of what Lectio does, then
/// a few questions that set the course up: where you're starting, a level
/// check for anyone who knows some Latin (the grammar, then the AP words), a
/// daily goal, a reminder and an account. It ends on the plan those answers
/// make and a button straight into it. Everything past the welcome can be
/// skipped, and nothing needs an account.
///
/// The web's Onboarding asks the same questions; the answers land in the
/// same `LearnerProfile`.
struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    enum Step: String, Hashable {
        case welcome, tour, track, check, grammar, vocab, path, pickUnit, goal, reminder, account, ready
    }

    @State private var step: Step = OnboardingView.launchStep
    @State private var history: [Step] = []
    /// Which way the steps slide: on, or back.
    @State private var forward = true
    @State private var tourPage = min(max(UserDefaults.standard.integer(forKey: "onboardingTourPage"), 0), TourPages.count - 1)
    @State private var track: LearnerProfile.Track? = OnboardingView.launchStep.isSetup ? LearnerProfile.Track.some : nil
    @State private var start: String?
    @State private var grammar: [Placement.Answer] = []
    @State private var vocabulary: [Placement.Answer] = []
    /// Where choosing a unit goes on to: the plan, or (straight from the
    /// check's intro) the daily goal.
    @State private var afterPick: Step = .goal
    @State private var minutes = 20
    @State private var reminderTime = Calendar.current.date(bySettingHour: 16, minute: 0, second: 0, of: .now) ?? .now
    @State private var reminderOn = false
    @State private var showAccount = false
    @State private var signUp = true
    /// Signing in from the welcome: a returning student, whose choices are
    /// already in their account.
    @State private var returning = false

    /// `-onboardingStep goal` starts part-way in, for CI's screenshots
    /// (`placement` is the grammar check's old name).
    private static var launchStep: Step {
        let name = UserDefaults.standard.string(forKey: "onboardingStep") ?? ""
        return name == "placement" ? .grammar : Step(rawValue: name) ?? .welcome
    }

    private var placement: [PlacementQuestion] { library?.course.placement ?? [] }
    private var vocabPlacement: [PlacementQuestion] { library?.course.vocabPlacement ?? [] }

    var body: some View {
        GeometryReader { proxy in
            stage(height: proxy.size.height)
        }
        .safeAreaInset(edge: .top, spacing: 0) { topBar }
        .safeAreaInset(edge: .bottom, spacing: 0) { bottomBar }
        .ambientBackground()
        // A light tap for each step; a success when the plan is ready.
        .sensoryFeedback(trigger: step) { _, new in new == .ready ? SensoryFeedback.success : SensoryFeedback.impact(weight: .light) }
        .sensoryFeedback(.selection, trigger: track)
        .sensoryFeedback(.selection, trigger: minutes)
        .sheet(isPresented: $showAccount, onDismiss: accountClosed) {
            NavigationStack {
                AccountView(startsWithSignUp: signUp)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") { showAccount = false }
                        }
                    }
            }
                // Signed in: straight on, no need to close the sheet by hand.
                .onChange(of: model.account?.userId) { _, id in
                    if id != nil { showAccount = false }
                }
        }
    }

    /* -------------------------------------------------------------- */
    /* Frame                                                           */
    /* -------------------------------------------------------------- */

    @ViewBuilder
    private func stage(height: CGFloat) -> some View {
        Group {
            if step == .tour {
                TourPages(page: $tourPage)
            } else {
                ScrollView {
                    content
                        .padding(.horizontal, 24)
                        .padding(.vertical, 16)
                        .frame(maxWidth: 560)
                        .frame(maxWidth: .infinity, minHeight: height, alignment: step.growsDown ? .top : .center)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
        }
        .id(step)
        .transition(transition)
    }

    private var transition: AnyTransition {
        if reduceMotion { return .opacity }
        return .asymmetric(
            insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity),
            removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity)
        )
    }

    private var topBar: some View {
        ZStack {
            if let progress = setupProgress {
                ProgressSegments(count: progress.count, current: progress.index)
                    .frame(maxWidth: 200)
                    .transition(.opacity)
            }
            HStack {
                if canGoBack {
                    Button { back() } label: {
                        Image(systemName: "chevron.left").font(.body.weight(.semibold)).frame(width: 22, height: 22)
                    }
                    .glassButton(circle: true)
                    .accessibilityLabel("Back")
                }
                Spacer()
                if showsSkip {
                    Button("Skip") { skip() }
                        .font(.subheadline.weight(.medium))
                        .glassButton()
                }
            }
        }
        .tint(Palette.rubric)
        .padding(.horizontal, 16)
        .frame(height: 52)
        .animation(.easeInOut(duration: 0.2), value: step)
    }

    @ViewBuilder
    private var bottomBar: some View {
        if let actions = actions {
            GlassGroup(spacing: 12) {
                VStack(spacing: 12) { actions }
            }
            .tint(Palette.rubric)
            .padding(.horizontal, 24)
            .padding(.top, 12)
            .padding(.bottom, 8)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
            .background {
                // Content scrolling under the buttons fades out rather than
                // meeting them at a hard edge.
                LinearGradient(colors: [Palette.parchment.opacity(0), Palette.parchment.opacity(0.92)],
                               startPoint: .top, endPoint: .center)
                    .ignoresSafeArea()
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* Steps                                                           */
    /* -------------------------------------------------------------- */

    @ViewBuilder
    private var content: some View {
        switch step {
        case .welcome: welcome
        case .tour: EmptyView()
        case .track: trackStep
        case .check: checkIntro
        case .grammar: grammarQuestion
        case .vocab: vocabQuestion
        case .path: pathResult
        case .pickUnit: pickUnit
        case .goal: goal
        case .reminder: reminder
        case .account: account
        case .ready: ready
        }
    }

    private var welcome: some View {
        VStack(spacing: 18) {
            LectioMedallion()
                .padding(.bottom, 6)
            Text("Lectio")
                .font(.wordmark(84))
                .foregroundStyle(Palette.rubric)
                .accessibilityAddTraits(.isHeader)
            Text("lege, notā, mementō")
                .font(.latinItalic(20, relativeTo: .callout))
                .foregroundStyle(Palette.inkMuted)
                .padding(.top, -14)
                .accessibilityLabel("Lege, notā, mementō: read, mark, remember.")
            Text("From your first Latin word to the AP exam.")
                .font(.system(.title2, design: .serif))
                .foregroundStyle(Palette.ink)
                .multilineTextAlignment(.center)
                .padding(.top, 8)
            Text("Short lessons that find your level, every passage of Vergil and Pliny with each word glossed, and flashcards that come back just before you forget.")
                .font(.prose(.callout))
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var trackStep: some View {
        VStack(spacing: 14) {
            OnboardingHeading(eyebrow: "About you", title: "Where are you starting?",
                              detail: "This sets where the course begins. You can change it any time.")
                .padding(.bottom, 8)
            ChoiceCard(symbol: "leaf", tint: Palette.verdigris, title: "I’m new to Latin",
                       detail: "Begin at the beginning: the sounds, the first words, and why endings matter.",
                       selected: track == .new) { track = .new }
            ChoiceCard(symbol: "book", tint: Palette.woad, title: "I know some Latin",
                       detail: "Take a three-minute check and start where it finds you.",
                       selected: track == LearnerProfile.Track.some) { track = LearnerProfile.Track.some }
            ChoiceCard(symbol: "graduationcap", tint: Palette.rubric, title: "I’m preparing for the AP exam",
                       detail: "Go straight to Vergil and Pliny, the quiz and practice exams.",
                       selected: track == .ap) { track = .ap }
            ChoiceCard(symbol: "person.2", tint: Palette.gilt, title: "I teach Latin",
                       detail: "Set up a classroom, assign work, and follow your students’ progress.",
                       selected: track == .teacher) { track = .teacher }
        }
    }

    private var checkIntro: some View {
        let grammarToo = track != .ap && !placement.isEmpty
        return VStack(spacing: 20) {
            Image(systemName: "scope")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Palette.rubric)
                .frame(width: 84, height: 84)
                .lectioGlass(in: Circle())
            OnboardingHeading(
                eyebrow: "Find your level",
                title: grammarToo ? "A quick check" : "Which words do you know?",
                detail: grammarToo
                    ? "About three minutes. Nothing is scored, and you choose whether to use the result."
                    : "Two words from each part of the AP list. Where you know both, that part starts with a short test you can pass to skip it."
            )
            GlassPanel {
                if grammarToo {
                    checkPart("text.book.closed", Palette.rubric, "Grammar",
                              "Short questions, easiest first. It stops as soon as it finds your level.")
                    Hairline(color: Palette.hair)
                }
                checkPart("character.book.closed", Palette.woad, "Vocabulary",
                          "\(vocabPlacement.count) words from the AP list, two from each part.")
            }
        }
    }

    private func checkPart(_ symbol: String, _ tint: Color, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(tint)
                .frame(width: 40, height: 40)
                .background(tint.opacity(0.14), in: .circle)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text(detail).font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private var grammarQuestion: some View {
        if grammar.count < placement.count {
            VStack(alignment: .leading, spacing: 14) {
                Text(vocabPlacement.isEmpty ? "Grammar" : "Part 1 of 2 · Grammar").quietLabel()
                PlacementCard(question: placement[grammar.count], number: grammar.count + 1, total: placement.count) { right in
                    grammar.append(Placement.Answer(unit: placement[grammar.count].unit, right: right))
                    if !Placement.continues(grammar, total: placement.count) { settleGrammar() }
                }
                .id("g\(grammar.count)")
                Button("Skip the rest of the check") { settleGrammar(skippingWords: true) }
                    .font(.subheadline)
                    .tint(Palette.inkMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
            }
        }
    }

    @ViewBuilder
    private var vocabQuestion: some View {
        if vocabulary.count < vocabPlacement.count {
            VStack(alignment: .leading, spacing: 14) {
                Text(track == .ap || placement.isEmpty ? "Vocabulary" : "Part 2 of 2 · Vocabulary").quietLabel()
                PlacementCard(question: vocabPlacement[vocabulary.count], number: vocabulary.count + 1, total: vocabPlacement.count) { right in
                    vocabulary.append(Placement.Answer(unit: vocabPlacement[vocabulary.count].unit, right: right))
                    if vocabulary.count >= vocabPlacement.count { go(.path) }
                }
                .id("v\(vocabulary.count)")
                Button("Skip the words") { go(.path) }
                    .font(.subheadline)
                    .tint(Palette.inkMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
            }
        }
    }

    private var pathResult: some View {
        VStack(spacing: 20) {
            Image(systemName: "point.bottomleft.forward.to.point.topright.scurvepath")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Palette.rubric)
                .frame(width: 84, height: 84)
                .lectioGlass(in: Circle())
            OnboardingHeading(eyebrow: "Your level", title: "Here’s your path", detail: pathDetail)
            GlassPanel {
                PlanRow(symbol: "text.book.closed", tint: Palette.rubric, label: "Grammar", value: grammarSummary)
                if !vocabPlacement.isEmpty {
                    Hairline(color: Palette.hair)
                    PlanRow(symbol: "character.book.closed", tint: Palette.woad, label: "Vocabulary", value: vocabSummary)
                    knownUnitChips
                }
            }
        }
    }

    @ViewBuilder
    private var knownUnitChips: some View {
        let known = Set(Path.knownVocabUnits(vocabulary))
        let units = library?.course.vocabLevel?.units ?? []
        if !vocabulary.isEmpty, !units.isEmpty {
            FlowLayout(lineSpacing: 8) {
                ForEach(units) { unit in
                    let isKnown = known.contains(unit.id)
                    Label(RichText.plain(unit.title), systemImage: isKnown ? "checkmark.seal.fill" : "circle")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(isKnown ? Palette.woad : Palette.inkMuted)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(isKnown ? Palette.woad.opacity(0.12) : Palette.slip, in: Capsule())
                        .padding(.trailing, 6)
                        .accessibilityLabel("\(RichText.plain(unit.title)): \(isKnown ? "start with the unit test" : "start with the lessons")")
                }
            }
            .padding(.leading, 52)
        }
    }

    private var pickUnit: some View {
        VStack(alignment: .leading, spacing: 0) {
            OnboardingHeading(eyebrow: "Find your level", title: "Choose a unit")
                .padding(.bottom, 18)
            ForEach(library?.course.grammarLevels ?? []) { level in
                Text(level.title).rubricLabel().padding(.top, 14).padding(.bottom, 6)
                ForEach(level.units) { unit in
                    Button {
                        start = unit.lessons.first?.id
                        go(afterPick)
                    } label: {
                        HStack(spacing: 12) {
                            Text("\(unit.n)")
                                .font(.system(.subheadline, design: .serif).weight(.semibold))
                                .foregroundStyle(start == unit.lessons.first?.id ? Palette.onRubric : Palette.rubric)
                                .frame(width: 30, height: 30)
                                .background(start == unit.lessons.first?.id ? Palette.rubric : Palette.redTint, in: .circle)
                            Text(rich: unit.title)
                                .font(.system(.body, design: .serif))
                                .foregroundStyle(Palette.ink)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Palette.inkFaint)
                        }
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(level.title), unit \(unit.n): \(RichText.plain(unit.title))")
                    Hairline(color: Palette.hair)
                }
            }
        }
    }

    private static let goals: [(minutes: Int, name: String, detail: String)] = [
        (10, "Light", "A lesson or your cards"),
        (20, "Steady", "A lesson and your cards"),
        (30, "Serious", "Add some reading"),
        (45, "Exam season", "The full workout"),
    ]

    private var goal: some View {
        VStack(spacing: 20) {
            OnboardingHeading(eyebrow: "Your routine", title: "How much time a day?",
                              detail: "A little every day beats a lot now and then. Change it any time in Settings.")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(Self.goals, id: \.minutes) { g in
                    let on = minutes == g.minutes
                    Button { minutes = g.minutes } label: {
                        VStack(spacing: 4) {
                            HStack(alignment: .firstTextBaseline, spacing: 3) {
                                Text("\(g.minutes)").font(.system(size: 38, weight: .regular, design: .serif))
                                Text("min").font(.subheadline)
                            }
                            .foregroundStyle(on ? Palette.rubric : Palette.ink)
                            Text(g.name).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                            Text(g.detail).font(.caption).foregroundStyle(Palette.inkMuted).multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .padding(.horizontal, 8)
                        .background(on ? Palette.redTint : Palette.slip.opacity(0.85), in: .rect(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(on ? Palette.rubric : Palette.ruleStrong, lineWidth: on ? 1.5 : 0.75))
                    }
                    .buttonStyle(PressStyle())
                    .accessibilityLabel("\(g.minutes) minutes a day, \(g.name): \(g.detail)")
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }

    private var reminder: some View {
        VStack(spacing: 22) {
            OnboardingHeading(eyebrow: "Your routine", title: "A daily nudge?",
                              detail: "One notification a day, at a time you choose, with that day’s line of Latin and the cards waiting. Nothing else.")
            NotificationPreview()
            GlassPanel {
                HStack {
                    Label("Every day at", systemImage: "bell")
                        .font(.body)
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    DatePicker("Reminder time", selection: $reminderTime, displayedComponents: .hourAndMinute)
                        .labelsHidden()
                        .tint(Palette.rubric)
                }
            }
        }
    }

    private var account: some View {
        VStack(spacing: 22) {
            Image(systemName: track == .teacher ? "person.2.badge.gearshape" : "icloud.and.arrow.up")
                .font(.system(size: 36, weight: .light))
                .foregroundStyle(Palette.rubric)
                .frame(width: 84, height: 84)
                .lectioGlass(in: Circle())
            OnboardingHeading(
                eyebrow: track == .teacher ? "One more thing" : "Optional",
                title: track == .teacher ? "Sign in to teach" : "Keep your progress safe",
                detail: track == .teacher
                    ? "Classrooms need a free account. Your students join with a six-character code."
                    : "Lectio works fully without an account, and everything stays on this device. A free account adds:"
            )
            GlassPanel {
                if track == .teacher {
                    benefit("rectangle.stack.badge.person.crop", "Create classrooms", "On the website, with a join code for your students.")
                    Hairline(color: Palette.hair)
                    benefit("chart.bar.xaxis", "Follow their work", "Minutes studied, assignments met, and a class leaderboard.")
                } else {
                    benefit("arrow.triangle.2.circlepath", "Sync", "Your deck, notes and progress on the website and your other devices.")
                    Hairline(color: Palette.hair)
                    benefit("person.3", "Your class", "Join your teacher’s classroom with a code.")
                    Hairline(color: Palette.hair)
                    benefit("lock.shield", "A safe copy", "Nothing lost if you change phones.")
                }
            }
        }
    }

    private func benefit(_ symbol: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.body.weight(.medium))
                .foregroundStyle(Palette.rubric)
                .frame(width: 34, height: 34)
                .background(Palette.rubric.opacity(0.12), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(.headline, design: .serif)).foregroundStyle(Palette.ink)
                Text(detail).font(.prose(.subheadline)).foregroundStyle(Palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }

    private var ready: some View {
        VStack(spacing: 22) {
            LectioMedallion(size: 112)
            OnboardingHeading(eyebrow: "Your plan", title: "You’re all set", detail: readyDetail)
            GlassPanel {
                PlanRow(symbol: startSymbol, tint: Palette.rubric, label: "Start", value: startSummary)
                if chosenTrack != .teacher, !vocabPlacement.isEmpty {
                    Hairline(color: Palette.hair)
                    PlanRow(symbol: "character.book.closed", tint: Palette.woad, label: "Vocabulary", value: vocabSummary)
                }
                Hairline(color: Palette.hair)
                PlanRow(symbol: "timer", tint: Palette.verdigris, label: "Daily goal", value: "\(minutes) minutes a day")
                Hairline(color: Palette.hair)
                PlanRow(symbol: reminderOn ? "bell.badge" : "bell.slash", tint: Palette.gilt, label: "Reminder",
                        value: reminderOn ? "Every day at \(reminderTime.formatted(date: .omitted, time: .shortened))" : "Off; turn it on in Settings")
                if let account = model.account {
                    Hairline(color: Palette.hair)
                    PlanRow(symbol: "checkmark.icloud", tint: Palette.woad, label: "Account", value: "Syncing as \(account.displayName)")
                }
            }
        }
    }

    /* -------------------------------------------------------------- */
    /* What the buttons at the bottom say                              */
    /* -------------------------------------------------------------- */

    private var actions: AnyView? {
        switch step {
        case .welcome:
            return AnyView(Group {
                primary("Get started") { go(.tour) }
                secondary("I already have an account") {
                    returning = true
                    signUp = false
                    showAccount = true
                }
            })
        case .tour:
            return AnyView(Group {
                PageDots(count: TourPages.count, current: tourPage).padding(.bottom, 6)
                primary(tourPage < TourPages.count - 1 ? "Continue" : "Set up my course") {
                    if tourPage < TourPages.count - 1 {
                        withAnimation(.spring(duration: 0.45)) { tourPage += 1 }
                    } else {
                        go(.track)
                    }
                }
            })
        case .track:
            return AnyView(primary("Continue", enabled: track != nil) { afterTrack() })
        case .check:
            let grammarToo = track != .ap && !placement.isEmpty
            return AnyView(Group {
                primary(grammarToo ? "Start the check" : "Check my words") {
                    grammar = []
                    vocabulary = []
                    go(grammarToo ? .grammar : .vocab)
                }
                if grammarToo {
                    secondary("I’ll choose a unit myself") {
                        afterPick = .goal
                        go(.pickUnit)
                    }
                } else {
                    secondary("Skip for now") { go(.goal) }
                }
            })
        case .path:
            return AnyView(Group {
                primary("Sounds good") { go(.goal) }
                if chosenTrack != .ap {
                    secondary("Choose a different unit") {
                        afterPick = .path
                        go(.pickUnit)
                    }
                }
            })
        case .goal:
            return AnyView(primary("Continue") { go(.reminder) })
        case .reminder:
            return AnyView(Group {
                primary("Remind me at \(reminderTime.formatted(date: .omitted, time: .shortened))") { turnOnReminder() }
                secondary("Not now") { go(.account) }
            })
        case .account:
            return AnyView(Group {
                primary("Create a free account") {
                    signUp = true
                    showAccount = true
                }
                secondary("I already have one") {
                    signUp = false
                    showAccount = true
                }
                Button("Not now") { go(.ready) }
                    .font(.subheadline)
                    .tint(Palette.inkMuted)
                    .padding(.top, 2)
            })
        case .ready:
            return AnyView(Group {
                primary(readyAction) { finish(openStart: true) }
                if chosenTrack == .new || chosenTrack == .some {
                    secondary("Look around first") { finish(openStart: false) }
                }
            })
        case .grammar, .vocab, .pickUnit:
            return nil
        }
    }

    private func primary(_ title: String, enabled: Bool = true, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
        }
        .glassButton(prominent: true)
        .disabled(!enabled)
    }

    private func secondary(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).frame(maxWidth: .infinity).padding(.vertical, 5)
        }
        .glassButton()
    }

    /* -------------------------------------------------------------- */
    /* What the answers add up to                                      */
    /* -------------------------------------------------------------- */

    private var chosenTrack: LearnerProfile.Track { track ?? LearnerProfile.Track.some }

    /// Where the grammar starts: the chosen or placed lesson, else the first.
    private var startPlace: LessonPlace? {
        guard let course = library?.course else { return nil }
        if let start, let place = course.place(start) { return place }
        return course.grammarLessons.first
    }

    private var grammarSummary: String {
        if chosenTrack == .ap { return "The AP texts, with the course there for review" }
        if !grammar.isEmpty, start == nil { return "You knew every unit the check asked about: start with the AP texts" }
        guard let place = startPlace else { return "The beginning" }
        return "\(place.level.title), Unit \(place.unit.n): \(RichText.plain(place.unit.title))"
    }

    private var pathDetail: String {
        if chosenTrack == .ap { return "Vergil and Pliny first. The words you know are set to be tested out of." }
        if grammar.isEmpty { return "The units before it stay open, for review whenever you like." }
        return "The units before your start stay open, for review whenever you like."
    }

    private var vocabSummary: String {
        let total = library?.course.vocabLevel?.units.count ?? 0
        let known = Path.knownVocabUnits(vocabulary).count
        if vocabulary.isEmpty || known == 0 {
            let first = library?.course.vocabLevel?.units.first.map { RichText.plain($0.title) } ?? "A"
            return "The AP list from the start: \(first)"
        }
        return "\(known) of \(total) parts to test out of; the rest, lesson by lesson"
    }

    private var startSymbol: String {
        switch chosenTrack {
        case .ap: "scroll"
        case .teacher: "person.2"
        case .new, .some: "text.book.closed"
        }
    }

    private var startSummary: String {
        switch chosenTrack {
        case .ap: return "Vergil and Pliny, with the quiz and practice exams"
        case .teacher: return "Your classroom: create it on the website, then follow it here"
        case .new, .some: return grammarSummary
        }
    }

    private var readyDetail: String {
        switch chosenTrack {
        case .new: "Your first lesson takes about ten minutes. Everything else is a tap away."
        case .some: "Your first lesson is ready. Everything else is a tap away."
        case .ap: "Today shows what’s due each day. Everything else is a tap away."
        case .teacher: "Everything a student sees, you can try too."
        }
    }

    private var readyAction: String {
        switch chosenTrack {
        case .new, .some: "Start my first lesson"
        case .ap: "Go to Today"
        case .teacher: "Open Classroom"
        }
    }

    /* -------------------------------------------------------------- */
    /* Moving between steps                                            */
    /* -------------------------------------------------------------- */

    /// The setup's progress: the track, the check (when there is one), the
    /// goal, the reminder and the account. Nil on the welcome and the tour.
    private var setupProgress: (count: Int, index: Int)? {
        let withCheck = track == nil || track == LearnerProfile.Track.some || track == .ap
        let count = withCheck ? 5 : 4
        let index: Int
        switch step {
        case .welcome, .tour: return nil
        case .track: index = 0
        case .check, .grammar, .vocab, .path, .pickUnit: index = 1
        case .goal: index = withCheck ? 2 : 1
        case .reminder: index = withCheck ? 3 : 2
        case .account: index = withCheck ? 4 : 3
        case .ready: index = count
        }
        return (count, index)
    }

    private var canGoBack: Bool { !history.isEmpty && step != .ready && step != .grammar && step != .vocab }
    private var showsSkip: Bool { step != .welcome && step != .ready }

    private var stepAnimation: Animation {
        reduceMotion ? .easeInOut(duration: 0.2) : .spring(duration: 0.5, bounce: 0.1)
    }

    private func go(_ next: Step) {
        history.append(step)
        move(to: next, forward: true)
    }

    /// Back to the step before, past the questions of a check (which start
    /// again from its intro).
    private func back() {
        var previous: Step?
        while let last = history.popLast() {
            if last == .grammar || last == .vocab { continue }
            previous = last
            break
        }
        guard let previous else { return }
        if previous == .check {
            grammar = []
            vocabulary = []
        }
        move(to: previous, forward: false)
    }

    /// The direction has to be in place before the step changes, so the page
    /// leaving slides the same way as the one arriving.
    private func move(to next: Step, forward isForward: Bool) {
        if forward == isForward {
            withAnimation(stepAnimation) { step = next }
        } else {
            forward = isForward
            Task { @MainActor in withAnimation(stepAnimation) { step = next } }
        }
    }

    private func skip() {
        if step == .tour {
            go(.track)
        } else if track != nil {
            finish(openStart: false)
        } else {
            model.finishOnboarding(nil)
        }
    }

    private func afterTrack() {
        switch chosenTrack {
        case .new:
            start = library?.course.grammarLessons.first?.lesson.id
            go(.goal)
        case .some:
            start = nil
            go(placement.isEmpty && vocabPlacement.isEmpty ? .goal : .check)
        case .ap:
            start = nil
            go(vocabPlacement.isEmpty ? .goal : .check)
        case .teacher:
            start = nil
            go(.goal)
        }
    }

    /// The grammar half is over: where it says to start, then the words.
    private func settleGrammar(skippingWords: Bool = false) {
        let course = library?.course
        if grammar.isEmpty {
            start = course?.grammarLessons.first?.lesson.id
        } else {
            let unit = Placement.start(grammar) ?? Placement.unitBeyond(course?.unitIds ?? [], probed: placement.map(\.unit))
            start = unit.flatMap { course?.firstLesson(ofUnit: $0)?.lesson.id }
        }
        go(skippingWords || vocabPlacement.isEmpty ? .path : .vocab)
    }

    private func turnOnReminder() {
        let c = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
        model.reminderMinutes = (c.hour ?? 16) * 60 + (c.minute ?? 0)
        Task {
            reminderOn = await model.setReminder(enabled: true)
            go(.account)
        }
    }

    private func accountClosed() {
        if model.account != nil {
            if returning {
                model.finishOnboarding(nil)
            } else {
                go(.ready)
            }
        }
        returning = false
    }

    private func finish(openStart: Bool) {
        let known = Path.knownVocabUnits(vocabulary)
        let startId: String? = switch chosenTrack {
        case .new, .some: start ?? startPlace?.lesson.id
        case .ap, .teacher: nil
        }
        model.finishOnboarding(
            LearnerProfile(track: chosenTrack, startLessonId: startId, onboardedAt: StudyDates.isoTimestamp(.now),
                           knownVocabUnits: known.isEmpty ? nil : known),
            minutes: minutes,
            openStart: openStart
        )
    }
}

private extension OnboardingView.Step {
    /// A step past the welcome and the tour, where a track is assumed when a
    /// screenshot starts there.
    var isSetup: Bool { self != .welcome && self != .tour && self != .track }

    /// Steps whose height changes as you go sit at the top, not the middle.
    var growsDown: Bool { self == .grammar || self == .vocab || self == .pickUnit }
}
