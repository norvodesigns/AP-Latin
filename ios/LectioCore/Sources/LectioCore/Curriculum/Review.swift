import Foundation

/// Course review — the web's `src/lib/review.ts`: a short lesson of
/// exercises from finished lessons, weighted toward weak scores and lessons
/// not done for a while. It plays in the ordinary lesson player; finishing
/// it counts the day but records no lesson.
extension Course {
    /// Review lessons have ids starting with this, and a random suffix, so a
    /// second review is a new lesson to the player rather than the same one.
    public static let reviewPrefix = "review"
    public static let reviewLength = 10

    public static func isReview(_ id: String) -> Bool {
        id == reviewPrefix || id.hasPrefix(reviewPrefix + "-")
    }

    /// How much a finished lesson needs review: weak scores and old dates weigh more.
    public static func reviewWeight(_ p: LessonProgress, now: Date) -> Double {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let last = f.date(from: p.lastAt) ?? ISO8601DateFormatter().date(from: p.lastAt) ?? now
        let days = max(0, now.timeIntervalSince(last) / 86_400)
        return (1.2 - min(1, max(0, p.best))) * (1 + min(days, 30) / 10)
    }

    /// Lessons a review can draw on: finished, with exercises it can use
    /// (`Lesson.reviewExercises`: from a reading, only questions that carry
    /// their own Latin).
    public func reviewable(done: [String: LessonProgress]) -> [LessonPlace] {
        lessons.filter { place in
            done[place.lesson.id] != nil && !place.lesson.reviewExercises.isEmpty
        }
    }

    public func review<G: RandomNumberGenerator>(
        done: [String: LessonProgress],
        length: Int = Course.reviewLength,
        now: Date = Date(),
        using rng: inout G
    ) -> LessonPlace? {
        var pool = reviewable(done: done).map { place in
            ReviewSource(exercises: place.lesson.reviewExercises, weight: Self.reviewWeight(done[place.lesson.id]!, now: now))
        }
        let available = pool.reduce(0) { $0 + $1.exercises.count }
        guard available > 0 else { return nil }

        var steps: [LessonStep] = []
        let target = min(length, available)
        while steps.count < target {
            let open = pool.indices.filter { pool[$0].open }
            let total = open.reduce(0) { $0 + pool[$1].weight }
            var r = Double.random(in: 0..<max(total, .leastNonzeroMagnitude), using: &rng)
            let chosen = open.first { r -= pool[$0].weight; return r < 0 } ?? open[open.count - 1]
            let fresh = pool[chosen].exercises.indices.filter { !pool[chosen].used.contains($0) }
            let pick = fresh.randomElement(using: &rng)!
            pool[chosen].used.insert(pick)
            steps.append(pool[chosen].exercises[pick])
        }

        let lesson = Lesson(
            id: "\(Self.reviewPrefix)-\(UInt32.random(in: 0...UInt32.max, using: &rng))",
            title: "Review",
            summary: "Exercises from lessons you have finished, weighted toward the ones you found hardest.",
            minutes: max(3, Int((Double(target) * 0.6).rounded())),
            objectives: ["Bring back what is fading before it is gone", "Find out which lessons are worth doing again"],
            words: [],
            steps: steps
        )
        let unit = CurriculumUnit(id: Self.reviewPrefix, n: 0, title: "Review", blurb: "", lessons: [lesson])
        let level = CurriculumLevel(id: Self.reviewPrefix, numeral: "", title: "Review", subtitle: "", blurb: "", units: [unit])
        return LessonPlace(lesson: lesson, unit: unit, level: level, index: -1)
    }
}

/// One finished lesson's exercises, and which of them a review has used.
private struct ReviewSource {
    let exercises: [LessonStep]
    let weight: Double
    var used: Set<Int> = []
    var open: Bool { used.count < exercises.count }
}
