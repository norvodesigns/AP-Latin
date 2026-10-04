import Foundation
import LectioCore

/// Classroom data — the same tables and database functions the website's
/// /classroom and /teach pages use. Row-level security does the scoping: a
/// student sees the classrooms they've joined, a teacher the ones they teach.
extension AppModel {
    nonisolated struct Classroom: Identifiable, Hashable, Sendable {
        let id: String
        let name: String
        let joinCode: String?
        let examDate: String?
        let archived: Bool
    }

    nonisolated struct Assignment: Identifiable, Hashable, Sendable {
        let id: String
        let section: String
        let targetMinutes: Int
        let dueDate: String?
        let note: String?
    }

    nonisolated struct LeaderRow: Identifiable, Hashable, Sendable {
        let id: String
        let name: String
        let seconds: Double
        let correct: Double
        let total: Double
    }

    nonisolated struct ClassroomDetail: Sendable {
        let assignments: [Assignment]
        /// Section -> seconds, for the signed-in student (or every student, for a teacher).
        let sectionSeconds: [String: [String: Double]]
        let leaderboard: [LeaderRow]
    }

    func classrooms() async throws -> [Classroom] {
        let token = try await auth.accessToken()
        let rows = try await auth.api.select("classrooms", query: [
            URLQueryItem(name: "select", value: "id,name,join_code,exam_date,archived"),
            URLQueryItem(name: "order", value: "created_at.asc"),
        ], accessToken: token)
        return rows.compactMap { r in
            guard let id = r["id"]?.stringValue, let name = r["name"]?.stringValue else { return nil }
            return Classroom(id: id, name: name, joinCode: r["join_code"]?.stringValue,
                             examDate: r["exam_date"]?.stringValue, archived: r["archived"]?.boolValue ?? false)
        }
    }

    /// Redeems a join code; returns the classroom's name. The database's own
    /// messages ("That join code does not match an active classroom.") are
    /// written for students and passed through as-is.
    func joinClassroom(code: String) async throws -> String {
        let token = try await auth.accessToken()
        let rows = try await auth.api.rpcRows("join_classroom", JSONObject([("code", .string(code))]), accessToken: token)
        return rows.first?["classroom_name"]?.stringValue ?? "your classroom"
    }

    func leaveClassroom(_ id: String) async throws {
        guard let userId = account?.userId else { return }
        let token = try await auth.accessToken()
        try await auth.api.delete("classroom_members", query: [
            URLQueryItem(name: "classroom_id", value: "eq.\(id)"),
            URLQueryItem(name: "student_id", value: "eq.\(userId)"),
        ], accessToken: token)
    }

    /// A teacher takes a student off the roster, as the website's Teach page
    /// does. RLS lets only the classroom's teacher delete someone else's
    /// membership; the student's account and history are untouched.
    func removeStudent(_ studentId: String, from classroomId: String) async throws {
        let token = try await auth.accessToken()
        try await auth.api.delete("classroom_members", query: [
            URLQueryItem(name: "classroom_id", value: "eq.\(classroomId)"),
            URLQueryItem(name: "student_id", value: "eq.\(studentId)"),
        ], accessToken: token)
    }

    func classroomDetail(_ id: String) async throws -> ClassroomDetail {
        let token = try await auth.accessToken()
        async let assignmentRows = auth.api.select("assignments", query: [
            URLQueryItem(name: "classroom_id", value: "eq.\(id)"),
            URLQueryItem(name: "select", value: "id,section,target_minutes,due_date,note"),
            URLQueryItem(name: "order", value: "due_date.asc.nullslast"),
        ], accessToken: token)
        async let timeRows = auth.api.rpcRows("classroom_section_time", JSONObject([("cid", .string(id))]), accessToken: token)
        async let boardRows = auth.api.rpcRows("classroom_leaderboard", JSONObject([("cid", .string(id))]), accessToken: token)

        let assignments = try await assignmentRows.compactMap { r -> Assignment? in
            guard let aid = r["id"]?.stringValue, let section = r["section"]?.stringValue else { return nil }
            return Assignment(id: aid, section: section, targetMinutes: r["target_minutes"]?.intValue ?? 0,
                              dueDate: r["due_date"]?.stringValue, note: r["note"]?.stringValue)
        }
        var seconds: [String: [String: Double]] = [:]
        for r in try await timeRows {
            guard let student = r["student_id"]?.stringValue, let section = r["section"]?.stringValue else { continue }
            seconds[student, default: [:]][section] = Self.number(r["seconds"])
        }
        let board = try await boardRows.compactMap { r -> LeaderRow? in
            guard let sid = r["student_id"]?.stringValue else { return nil }
            return LeaderRow(id: sid, name: r["display_name"]?.stringValue ?? "Student", seconds: Self.number(r["total_seconds"]),
                             correct: Self.number(r["overall_correct"]), total: Self.number(r["overall_total"]))
        }
        // Ranked by time studied, not accuracy, as on the website: three
        // perfect answers shouldn't outrank three hundred at 90%.
        return ClassroomDetail(assignments: assignments, sectionSeconds: seconds, leaderboard: board.sorted { $0.seconds > $1.seconds })
    }

    /// PostgREST returns bigint and numeric columns as JSON numbers or, for
    /// very large values, strings.
    nonisolated static func number(_ v: JSONValue?) -> Double {
        v?.doubleValue ?? v?.stringValue.flatMap(Double.init) ?? 0
    }
}
