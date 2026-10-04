import LectioCore
import SwiftUI

/// Sign in, create an account, or manage the one you're signed into — the
/// same Supabase accounts the website uses, so progress follows you between
/// the two.
struct AccountView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if let account = model.account {
                SignedInView(account: account)
            } else {
                SignInForm()
            }
        }
        .readableColumn()
        .pageBackground()
        .navigationTitle("Account")
        .navigationBarTitleDisplayMode(.inline)
    }
}

/* ------------------------------------------------------------------ */
/* Signed out                                                          */
/* ------------------------------------------------------------------ */

private struct SignInForm: View {
    @Environment(AppModel.self) private var model

    nonisolated enum Mode: String, CaseIterable, Identifiable, Sendable {
        case signIn = "Sign in"
        case signUp = "Create account"
        var id: String { rawValue }
    }

    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var role = "student"
    @State private var working = false
    @State private var error: String?
    @State private var checkEmail = false
    @FocusState private var focused: Field?

    nonisolated enum Field: Hashable, Sendable { case name, email, password }

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Lectio").font(.wordmark(48)).foregroundStyle(Palette.rubric)
                    Text("Sign in with the same account you use on the website, and your reading notes, vocabulary deck and history follow you between the two.")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.ink2)
                }
                .listRowBackground(Color.clear)
            }

            Section {
                Picker("", selection: $mode) {
                    ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
            }

            if checkEmail {
                Section {
                    Label("Check your email for a confirmation link. Open it on this device and you'll be signed in; if you open it somewhere else, come back and sign in here.",
                          systemImage: "envelope.badge")
                }
            }

            Section {
                if mode == .signUp {
                    TextField("Your name", text: $displayName)
                        .textContentType(.name)
                        .focused($focused, equals: .name)
                        .submitLabel(.next)
                        .onSubmit { focused = .email }
                    Picker("I'm a", selection: $role) {
                        Text("Student").tag("student")
                        Text("Teacher").tag("teacher")
                    }
                }
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focused, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focused = .password }
                SecureField("Password", text: $password)
                    .textContentType(mode == .signUp ? .newPassword : .password)
                    .focused($focused, equals: .password)
                    .submitLabel(.go)
                    .onSubmit { submit() }
            } footer: {
                if let error {
                    Text(error).foregroundStyle(Palette.incorrect)
                } else if mode == .signUp {
                    Text("At least 8 characters. Teachers can create classrooms on the website; students join them with a code.")
                }
            }

            Section {
                Button {
                    submit()
                } label: {
                    HStack {
                        Spacer()
                        if working { ProgressView() } else { Text(mode.rawValue).font(.headline) }
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }
                .glassButton(prominent: true)
                .disabled(working)
                .listRowBackground(Color.clear)
            }
        }
        .onChange(of: mode) { error = nil }
    }

    private func submit() {
        error = nil
        if let invalid = AuthManager.validate(email: email, password: password) {
            error = invalid
            return
        }
        if mode == .signUp {
            let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
            guard (1...60).contains(name.count) else {
                error = "Enter a name between 1 and 60 characters."
                return
            }
        }
        working = true
        Task {
            defer { working = false }
            do {
                switch mode {
                case .signIn:
                    try await model.signIn(email: email, password: password)
                case .signUp:
                    let outcome = try await model.signUp(email: email, password: password,
                                                         displayName: displayName.trimmingCharacters(in: .whitespacesAndNewlines),
                                                         role: role)
                    if outcome == .checkEmail {
                        checkEmail = true
                        mode = .signIn
                        password = ""
                    }
                }
            } catch {
                self.error = (error as? SupabaseError)?.message ?? "Couldn't reach the server. Check your connection and try again."
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/* Signed in                                                           */
/* ------------------------------------------------------------------ */

private struct SignedInView: View {
    @Environment(AppModel.self) private var model
    let account: AppModel.Account

    @State private var confirmSignOut = false
    @State private var confirmDelete = false
    @State private var deleting = false
    @State private var deleteError: String?

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text(account.displayName).font(.system(.title2, design: .serif)).foregroundStyle(Palette.ink)
                    if let email = account.email { Text(email).foregroundStyle(Palette.inkMuted) }
                    Text(account.isTeacher ? "Teacher" : "Student").quietLabel().padding(.top, 2)
                }
                .padding(.vertical, 4)
            }

            Section {
                LabeledContent("Status") { SyncStatusLabel(status: model.syncStatus) }
                Button("Sync now", systemImage: "arrow.triangle.2.circlepath") {
                    Task { await model.reconcile() }
                }
                .disabled(model.syncStatus == .syncing)
            } header: {
                Text("Sync")
            } footer: {
                Text("Your progress is saved on this device first and synced to your account in the background, so it works offline and catches up when you're back online.")
            }

            Section {
                Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right") { confirmSignOut = true }
            } footer: {
                Text("Signing out keeps your progress on this device.")
            }

            Section {
                Button(role: .destructive) {
                    confirmDelete = true
                } label: {
                    if deleting { ProgressView() } else { Label("Delete account", systemImage: "trash") }
                }
                .disabled(deleting)
            } footer: {
                if let deleteError {
                    Text(deleteError).foregroundStyle(Palette.incorrect)
                } else {
                    Text("Permanently deletes your account, your synced progress and any classrooms you teach. Progress already on this device stays here.")
                }
            }
        }
        .confirmationDialog("Sign out of \(account.displayName)?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Sign out") { Task { await model.signOut() } }
        }
        .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete account", role: .destructive) { delete() }
        } message: {
            Text("This can't be undone.")
        }
    }

    private func delete() {
        deleting = true
        deleteError = nil
        Task {
            defer { deleting = false }
            do {
                try await model.deleteAccount()
            } catch {
                deleteError = "Couldn't delete the account: \((error as? SupabaseError)?.message ?? "the server couldn't be reached"). Nothing was changed."
            }
        }
    }
}

struct SyncStatusLabel: View {
    let status: AppModel.SyncStatus

    var body: some View {
        switch status {
        case .idle:
            Text("Not synced yet").foregroundStyle(Palette.inkMuted)
        case .syncing:
            HStack(spacing: 6) { ProgressView().controlSize(.small); Text("Syncing") }.foregroundStyle(Palette.inkMuted)
        case .synced(let date):
            Label {
                Text("Synced \(date, format: .relative(presentation: .named))")
            } icon: {
                Image(systemName: "checkmark.icloud").foregroundStyle(Palette.correct)
            }
        case .offline(let message):
            Label {
                Text(message).font(.footnote)
            } icon: {
                Image(systemName: "icloud.slash").foregroundStyle(Palette.inkMuted)
            }
        }
    }
}
