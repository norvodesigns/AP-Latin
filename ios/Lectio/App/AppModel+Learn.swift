import Foundation
import LectioCore

/// The course (Features/Learn): what's finished, what's next, and recording
/// a finished lesson.
extension AppModel {
    /// Lesson ids finished.
    var courseDone: Set<String> { Set(progress.lessons.keys) }

    /// The grammar lesson to do next, from the student's starting point.
    var nextCourseLesson: LessonPlace? {
        content?.course.next(done: courseDone, startingAt: progress.learner?.startLessonId)
    }

    /// Vocabulary units the level check found probably known.
    var knownVocabUnits: [String] { progress.learner?.knownVocabUnits ?? [] }

    /// The vocabulary lesson to do next (Verba, the AP list by letter):
    /// adapted to the words already known (LectioCore `Path`).
    var nextVocabLesson: LessonPlace? {
        content?.course.nextWords(done: courseDone, vocab: vocab, knownUnits: knownVocabUnits)
    }

    /// The lesson most worth another go (Path.shakyLesson): the most recent
    /// one tried with a best under 60%. Unit tests aside: they're retaken
    /// from their unit.
    var shakyLesson: LessonPlace? {
        guard let course = content?.course else { return nil }
        let ids = course.lessons.filter { !$0.lesson.isTest }.map(\.lesson.id)
        return Path.shakyLesson(ids, records: progress.lessons).flatMap { course.place($0) }
    }

    /// Grammar lessons finished, and how many there are.
    var grammarProgress: (done: Int, total: Int) {
        let lessons = content?.course.grammarLessons ?? []
        let done = courseDone
        return (lessons.filter { done.contains($0.lesson.id) }.count, lessons.count)
    }

    /// The AP-list words that are well known (a mature card), out of the list.
    var wordsKnown: (known: Int, total: Int) {
        let total = content?.coreVocabulary.count ?? 0
        return (vocab.values.filter { $0.interval >= Path.knownInterval }.count, total)
    }

    /// The level check's answers: the grammar start, and the vocabulary units
    /// probably known. A student who hasn't onboarded gets a profile.
    func applyLevelCheck(startLessonId: String?, knownVocabUnits units: [String]) {
        update { doc in
            var profile = doc.learner ?? LearnerProfile(track: .some, startLessonId: nil, onboardedAt: StudyDates.isoTimestamp(.now))
            if let startLessonId { profile.startLessonId = startLessonId }
            profile.knownVocabUnits = units.isEmpty ? nil : units
            doc.setLearner(profile)
        }
    }

    /// Whether the iPhone's tab bar leads with the course rather than the
    /// Quiz Engine. A beginner gets the course; someone already doing AP work
    /// (or who said so) keeps the quiz. The other is one tap away on Today.
    var courseInTabBar: Bool {
        if let track = progress.learner?.track { return track == .new || track == .some }
        if !progress.lessons.isEmpty { return true }
        let apWork = !progress.quizAttempts.isEmpty || !(progress.raw["passages"]?.objectValue?.isEmpty ?? true)
        return !apWork
    }

    /// Whether Today leads with the course instead of the exam countdown:
    /// a student who chose the course, or who has only done lessons so far.
    /// The website's dashboard uses the same rule.
    var courseFirstOnToday: Bool {
        guard content?.course.grammarLessons.isEmpty == false else { return false }
        if let track = progress.learner?.track { return track == .new || track == .some }
        let apWork = !progress.quizAttempts.isEmpty || !(progress.raw["passages"]?.objectValue?.isEmpty ?? true)
        return !progress.lessons.isEmpty && !apWork
    }

    /// The iPhone tab bar, in order. Search is always last.
    var phoneTabs: [AppTab] { [.today, courseInTabBar ? .learn : .quiz, .read, .vocab, .search] }

    /// Opens a lesson over whatever is on screen.
    func openLesson(_ id: String) {
        guard let place = content?.course.place(id) else { return }
        activeLesson = place
    }

    /// Whether there are finished lessons for a review to draw on.
    var canReview: Bool { !(content?.course.reviewable(done: progress.lessons).isEmpty ?? true) }

    /// A review: ten exercises from finished lessons, weighted toward the
    /// weak and the long-ago, opened like any lesson. Each call makes a new one.
    func openReview() {
        guard let course = content?.course else { return }
        var rng = SystemRandomNumberGenerator()
        activeLesson = course.review(done: progress.lessons, using: &rng)
    }

    /// A round of derivatives questions (Course.derivativesLesson), opened like any lesson.
    func openDerivatives() {
        guard let course = content?.course else { return }
        var rng = SystemRandomNumberGenerator()
        activeLesson = course.derivativesLesson(done: progress.lessons, using: &rng)
    }

    /// A round of the sentence builder (SentenceBuilder), opened like any lesson.
    func openSentences() {
        guard let library = content else { return }
        var rng = SystemRandomNumberGenerator()
        activeLesson = library.sentences.lesson(done: progress.lessons, using: &rng)
    }

    /// Today's date on this device's clock: the Sententia's day.
    var dailyDay: String { Daily.localDay() }

    /// The Sententia of the day, or nil for content that predates it.
    var todaysSententia: Sententia? { content.flatMap { Daily.sententia(for: dailyDay, in: $0.sententiae) } }

    /// Days in a row with the Sententia done.
    var dailyStreak: Int { Daily.streak(progress.daily, today: dailyDay) }

    /// Opens today's Sententia over whatever is on screen.
    func openDaily() {
        guard let line = todaysSententia else { return }
        activeLesson = Daily.lesson(line, day: dailyDay)
    }

    /// A lesson finished: its score, its words into the deck, the day counted.
    /// A review counts the day but isn't a lesson, so it records nothing
    /// else; the Sententia records its own day.
    func completeLesson(_ lesson: Lesson, score: Double) {
        guard !Course.isReview(lesson.id), !Course.isDerivatives(lesson.id), !SentenceBuilder.isSentences(lesson.id) else {
            update { $0.markStudied() }
            refreshWidgets()
            return
        }
        guard !Daily.isDaily(lesson.id) else {
            let day = Daily.day(ofLesson: lesson.id)
            let id = content.flatMap { Daily.sententia(for: day, in: $0.sententiae)?.id } ?? ""
            update { $0.completeDaily(day: day, id: id, score: score) }
            refreshWidgets()
            return
        }
        // A unit test passed counts its whole unit as done, and puts the
        // unit's words in the deck as known (Path.testOut).
        let unitLessons: [PathLesson]? = lesson.isTest && Path.testPassed(score)
            ? content?.course.place(lesson.id).flatMap { content?.course.pathLessons(ofUnit: $0.unit.id) }
            : nil
        update { doc in
            doc.completeLesson(lesson.id, score: score, vocabIds: lesson.vocabIds)
            if let unitLessons { doc.passUnitTest(unitLessons, score: score) }
        }
        refreshWidgets()
        sendWatchDeck()
    }
}
