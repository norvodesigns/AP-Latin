import LectioCore
import SwiftUI

/// Laurels — the web's /laurels: achievements across the whole app, from
/// the progress that already syncs (LectioCore `Laurels`).
struct LaurelsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library

    var body: some View {
        let list = library.map { Laurels.all(model.progress, course: $0.course) } ?? []
        let earned = list.filter(\.earned).count
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("\(earned) of \(list.count) earned. They come from what you do anywhere in Lectio, on any device you sign in on.")
                    .font(.prose(.body))
                    .foregroundStyle(Palette.inkMuted)
                    .padding(.bottom, 16)
                ForEach(list) { laurel in
                    Hairline(color: Palette.rule)
                    LaurelRow(laurel: laurel).padding(.vertical, 12)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .pageBackground()
        .navigationTitle("Laurels")
    }
}

private struct LaurelRow: View {
    let laurel: Laurel

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(laurel.earned ? "❦ \(laurel.latin)" : laurel.latin)
                    .font(.latinItalic(20, relativeTo: .title3))
                    .foregroundStyle(laurel.earned ? Palette.rubric : Palette.ink)
                Spacer(minLength: 8)
                if laurel.earned {
                    Text("earned").quietLabel().foregroundStyle(Palette.rubric)
                } else if laurel.target > 1 {
                    Text("\(laurel.have) / \(laurel.target)").font(.caption.monospacedDigit()).foregroundStyle(Palette.inkMuted)
                }
            }
            Text("\(Text(laurel.title + ".").foregroundStyle(Palette.ink2)) \(Text(laurel.detail).foregroundStyle(Palette.inkMuted))")
                .font(.prose(.callout))
            if !laurel.earned, laurel.target > 1, laurel.have > 0 {
                ProgressView(value: Double(laurel.have), total: Double(laurel.target))
                    .tint(Palette.rubric)
                    .padding(.top, 2)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityValue(laurel.earned ? "Earned" : laurel.target > 1 ? "\(laurel.have) of \(laurel.target)" : "Not yet")
    }
}

/// Laurels in a row on Today: how many are earned and the next one near,
/// and a laurel earned since last time, named once. The first time, what is
/// already earned is simply remembered.
struct LaurelsTodayRow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.library) private var library
    @State private var fresh: Laurel?

    private static let seenKey = "laurelsSeen"

    var body: some View {
        let list = library.map { Laurels.all(model.progress, course: $0.course) } ?? []
        let earned = list.filter(\.earned)
        let next = Laurels.next(list)
        NavigationLink {
            LaurelsView()
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Laurels").rubricLabel()
                    Spacer(minLength: 8)
                    Text("\(earned.count) of \(list.count) earned").quietLabel()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(Palette.inkFaint)
                }
                if let fresh {
                    Text("❦ New: \(Text(fresh.latin).italic()), \(fresh.title.lowercased()).")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.rubric)
                }
                if let next {
                    Text("Next: \(Text(next.latin).italic()), \(next.title.lowercased())\(next.target > 1 ? " (\(next.have) of \(next.target))." : ".")")
                        .font(.prose(.callout))
                        .foregroundStyle(Palette.ink2)
                        .multilineTextAlignment(.leading)
                }
            }
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .onChange(of: earned.map(\.id), initial: true) { _, ids in
            let defaults = UserDefaults.standard
            if let seen = defaults.stringArray(forKey: Self.seenKey) {
                if let newest = ids.last(where: { !seen.contains($0) }) {
                    fresh = list.first { $0.id == newest }
                }
            }
            defaults.set(ids, forKey: Self.seenKey)
        }
    }
}
