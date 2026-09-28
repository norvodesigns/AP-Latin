import LectioCore
import SwiftUI

/// Classrooms — the website's /classroom (students) and a read-only view of
/// /teach (teachers). Students join with a code and see their assignments and
/// the leaderboard; creating classrooms and setting assignments stays on the
/// website, where a teacher has room for it.
struct ClassroomView: View {
    @Environment(AppModel.self) private var model
    @State private var classrooms: [AppModel.Classroom] = []
    @State private var loading = false
    @State private var error: String?
    @State private var code = ""
    @State private var joining = false
    @State private var joinMessage: String?

    var body: some View {
        SectionStack {
            Group {
                if let account = model.account {
                    list(isTeacher: account.isTeacher)
                } else {
                    ContentUnavailableView {
                        Label("Classrooms need an account", systemImage: "person.3")
                    } description: {
                        Text("Sign in to join your teacher's classroom with a code, see what's assigned, and follow the leaderboard.")
                    } actions: {
                        NavigationLink("Sign in") { AccountView() }.buttonStyle(.glassProminent)
                    }
                }
            }
            .pageBackground()
            .navigationTitle("Classroom")
            .navigationDestination(for: AppModel.Classroom.self) { ClassroomDetailView(classroom: $0) }
            .task(id: model.account?.userId) { await load() }
            .refreshable { await load() }
        }
    }

    private func list(isTeacher: Bool) -> some View {
        List {
            if !isTeacher {
                Section {
                    HStack {
                        TextField("Join code", text: $code)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .font(.system(.title3, design: .monospaced))
                            .onChange(of: code) { _, new in code = String(new.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(6)) }
                        Button(joining ? "Joining…" : "Join") { Task { await join() } }
                            .buttonStyle(.glassProminent)
                            .disabled(code.count != 6 || joining)
                    }
                    if let joinMessage { Text(joinMessage).font(.footnote).foregroundStyle(Palette.ink2) }
                } header: {
                    Text("Join a classroom").rubricLabel()
                } footer: {
                    Text("Your teacher's six-character code.")
                }
            }

            Section {
                if loading && classrooms.isEmpty {
                    ProgressView()
                } else if classrooms.isEmpty {
                    Text(isTeacher ? "You don't teach any classrooms yet. Create one on the website." : "You haven't joined a classroom yet.")
                        .foregroundStyle(Palette.inkMuted)
                }
                ForEach(classrooms) { c in
                    NavigationLink(value: c) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(c.name).font(.headline).foregroundStyle(Palette.ink)
                            if isTeacher, let code = c.joinCode {
                                Text("Join code \(Text(code).font(.system(.subheadline, design: .monospaced)).bold())").font(.subheadline)
                            }
                            if c.archived { Text("Archived").quietLabel() }
                        }
                    }
                }
                if let error { Text(error).font(.footnote).foregroundStyle(Palette.incorrect) }
            } header: {
                Text(isTeacher ? "Your classrooms" : "Your classrooms").rubricLabel()
            }

            if isTeacher {
                Section {
                    Link(destination: AppConfig.web("teach")) {
                        Label("Create classrooms and set assignments on the website", systemImage: "safari")
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
    }

    private func load() async {
        guard model.account != nil else { return }
        loading = true
        defer { loading = false }
        do {
            classrooms = try await model.classrooms()
            error = nil
        } catch {
            self.error = (error as? SupabaseError)?.message ?? "Couldn't load your classrooms."
        }
    }

    private func join() async {
        joining = true
        joinMessage = nil
        defer { joining = false }
        do {
            let name = try await model.joinClassroom(code: code)
            joinMessage = "You've joined \(name)."
            code = ""
            await load()
        } catch {
            joinMessage = (error as? SupabaseError)?.message ?? "Couldn't join. Check the code and your connection."
        }
    }
}

struct ClassroomDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let classroom: AppModel.Classroom

    @State private var detail: AppModel.ClassroomDetail?
    @State private var error: String?
    @State private var confirmLeave = false

    var body: some View {
        let me = model.account?.userId ?? ""
        let isTeacher = model.account?.isTeacher ?? false
        List {
            if let examDate = classroom.examDate {
                Text("Exam day: \(examDate)").font(.prose(.callout)).foregroundStyle(Palette.ink2).listRowBackground(Color.clear)
            }
            if let detail {
                Section {
                    if detail.assignments.isEmpty {
                        Text("Nothing assigned yet.").foregroundStyle(Palette.inkMuted)
                    }
                    ForEach(detail.assignments) { a in
                        if isTeacher {
                            let met = detail.leaderboard.filter { (detail.sectionSeconds[$0.id]?[a.section] ?? 0) >= Double(a.targetMinutes * 60) }.count
                            AssignmentRow(assignment: a, progress: nil, footer: "\(met) of \(detail.leaderboard.count) students have met it")
                        } else {
                            AssignmentRow(assignment: a, progress: detail.sectionSeconds[me]?[a.section] ?? 0, footer: nil)
                        }
                    }
                } header: { Text("Assignments").rubricLabel() }

                Section {
                    ForEach(Array(detail.leaderboard.enumerated()), id: \.element.id) { i, row in
                        HStack {
                            Text("\(i + 1)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkFaint).frame(width: 22)
                            Text(row.name).fontWeight(row.id == me ? .semibold : .regular)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 1) {
                                Text("\(Int(row.seconds / 60)) min").monospacedDigit()
                                if row.total > 0 {
                                    Text("\(Int((row.correct / row.total * 100).rounded()))% of \(Int(row.total))").font(.caption2).foregroundStyle(Palette.inkMuted)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Leaderboard").rubricLabel()
                } footer: {
                    Text("Ranked by time studied. Accuracy is shown but not ranked on — a handful of perfect answers shouldn't outrank hundreds at 90%.")
                }
            } else if let error {
                Text(error).foregroundStyle(Palette.incorrect)
            } else {
                ProgressView()
            }

            if !isTeacher {
                Section {
                    Button("Leave classroom", role: .destructive) { confirmLeave = true }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .pageBackground()
        .navigationTitle(classroom.name)
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog("Leave \(classroom.name)?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave", role: .destructive) {
                Task {
                    try? await model.leaveClassroom(classroom.id)
                    dismiss()
                }
            }
        }
    }

    private func load() async {
        do {
            detail = try await model.classroomDetail(classroom.id)
            error = nil
        } catch {
            self.error = (error as? SupabaseError)?.message ?? "Couldn't load this classroom."
        }
    }
}

private struct AssignmentRow: View {
    let assignment: AppModel.Assignment
    let progress: Double?
    let footer: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(AppModel.sectionTitle(assignment.section)).font(.headline)
                Spacer()
                if let due = assignment.dueDate { Text("due \(due)").font(.caption).foregroundStyle(Palette.inkMuted) }
            }
            if let progress {
                let target = Double(assignment.targetMinutes * 60)
                ProgressView(value: min(progress, target), total: max(target, 1)).tint(progress >= target ? Palette.correct : Palette.rubric)
                Text("\(Int(progress / 60)) of \(assignment.targetMinutes) minutes").font(.caption).foregroundStyle(Palette.inkMuted)
            } else {
                Text("\(assignment.targetMinutes) minutes").font(.caption).foregroundStyle(Palette.inkMuted)
            }
            if let footer { Text(footer).font(.caption).foregroundStyle(Palette.inkMuted) }
            if let note = assignment.note, !note.isEmpty { Text(note).font(.prose(.callout)).foregroundStyle(Palette.ink2) }
        }
        .padding(.vertical, 4)
    }
}

extension AppModel {
    /// The web nav label for an assignable section id — `sectionLabel` in src/lib/nav.ts.
    nonisolated static func sectionTitle(_ section: String) -> String {
        [
            "read": "Reading Room", "translate": "Translate", "sight": "Sight Reading", "quiz": "Quiz Engine",
            "vocab": "Vocabulary", "grammar": "Grammar & Syntax", "scansion": "Scansion Lab", "devices": "Literary Devices",
            "context": "Context & Culture", "frq": "FRQ Workshop", "exam": "Practice Exam", "plan": "Study Plan",
        ][section] ?? section
    }
}
