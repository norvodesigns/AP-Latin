import Foundation
import LectioCore

/// The course (Features/Learn): what's finished, what's next, and recording
/// a finished lesson.
extension AppModel {
    /// Lesson ids finished.
    var courseDone: Set<String> { Set(progress.lessons.keys) }

    /// The lesson to do next, from the student's starting point.
    var nextCourseLesson: LessonPlace? {
        content?.course.next(done: courseDone, startingAt: progress.learner?.startLessonId)
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

    /// The iPhone tab bar, in order. Search is always last.
    var phoneTabs: [AppTab] { [.today, courseInTabBar ? .learn : .quiz, .read, .vocab, .search] }

    /// Opens a lesson over whatever is on screen.
    func openLesson(_ id: String) {
        guard let place = content?.course.place(id) else { return }
        activeLesson = place
    }

    /// A lesson finished: its score, its words into the deck, the day counted.
    func completeLesson(_ lesson: Lesson, score: Double) {
        update { $0.completeLesson(lesson.id, score: score, vocabIds: lesson.vocabIds) }
        refreshWidgets()
        sendWatchDeck()
    }
}
