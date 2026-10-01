import LectioCore
import SwiftUI

/// Skill 2.A, style and its function — src/app/devices/Devices.tsx:
/// a reference, a study deck, and a spot-the-device drill built from every
/// example in the reference.
struct DevicesView: View {
    @Environment(\.library) private var library
    @State private var mode = Mode.reference

    nonisolated enum Mode: String, CaseIterable, Identifiable, Sendable {
        case reference = "Reference", study = "Study", drill = "Drill"
        var id: String { rawValue }
    }

    var body: some View {
        SectionStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if let library {
                        switch mode {
                        case .reference:
                            ForEach(library.deviceCards) { DeviceEntry(device: $0) }
                        case .study:
                            StudyDeck(items: library.deviceCards, noun: "device") { d in
                                Text(d.name).font(.system(.title, design: .serif)).multilineTextAlignment(.center)
                            } back: { d in
                                DeviceBack(device: d)
                            }
                        case .drill:
                            SpotTheDevice(devices: library.deviceCards)
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 760, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .pageBackground()
            .navigationTitle("Literary Devices")
            .navigationDestination(for: Passage.self) { PassageReaderView(passage: $0) }
        }
    }
}

private struct DeviceEntry: View {
    let device: DeviceCard
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.spring(duration: 0.3)) { open.toggle() }
            } label: {
                HStack {
                    Text(device.name).font(.system(.title3, design: .serif)).foregroundStyle(Palette.ink)
                    Spacer()
                    Image(systemName: "chevron.down").rotationEffect(.degrees(open ? 180 : 0)).foregroundStyle(Palette.inkFaint)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            Text(device.definition).font(.prose(.callout)).foregroundStyle(Palette.ink2)
            if open { DeviceBack(device: device, showDefinition: false).transition(.opacity) }
            Hairline(color: Palette.hair).padding(.top, 6)
        }
    }
}

private struct DeviceBack: View {
    @Environment(\.library) private var library
    let device: DeviceCard
    var showDefinition = true

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if showDefinition { Text(device.definition).font(.prose(.title3)).foregroundStyle(Palette.ink) }
            Text("\(Text("EFFECT — ").font(.caption2.weight(.medium)).foregroundStyle(Palette.inkMuted))\(device.effect)")
                .font(.prose(.callout)).foregroundStyle(Palette.ink2)
            ForEach(Array(device.examples.enumerated()), id: \.offset) { _, ex in
                ExampleView(example: ex)
            }
        }
    }
}

/// A Latin example from the readings, with its citation (linked to the
/// passage when it's one of ours) and the analysis.
struct ExampleView: View {
    @Environment(\.library) private var library
    let example: GrammarExample

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(example.latin).font(.latin(19)).foregroundStyle(Palette.ink)
            if let id = example.passageId, let passage = library?.passage(id) {
                NavigationLink(value: passage) {
                    Text(example.citation).font(.caption).foregroundStyle(Palette.rubric)
                }
            } else {
                Text(example.citation).font(.caption).foregroundStyle(Palette.inkFaint)
            }
            Text(example.analysis).font(.prose(.callout)).foregroundStyle(Palette.ink2)
        }
        .padding(.leading, 12)
        .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }
    }
}

/// Which device is at work here? Every reference example becomes an item,
/// with three other devices as distractors.
private struct SpotTheDevice: View {
    @Environment(AppModel.self) private var model
    let devices: [DeviceCard]

    nonisolated struct Item: Sendable {
        let example: GrammarExample
        let answerId: String
        let options: [String]
    }

    @State private var pool: [Item] = []
    @State private var index = 0
    @State private var chosen: String?
    @State private var right = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if pool.isEmpty {
                ProgressView()
            } else {
                let item = pool[index % pool.count]
                HStack {
                    Text("\(right) of \(index + (chosen == nil ? 0 : 1)) correct").rubricLabel().monospacedDigit()
                    Spacer()
                    Button("Reshuffle", systemImage: "shuffle") { build() }.font(.subheadline)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Which device is at work here?").quietLabel()
                    Text(item.example.latin).font(.latin(24)).foregroundStyle(Palette.ink)
                    Text(item.example.citation).font(.caption).foregroundStyle(Palette.inkFaint)
                }
                .padding(.leading, 14)
                .overlay(alignment: .leading) { Rectangle().fill(Palette.redLine).frame(width: 2) }

                ForEach(item.options, id: \.self) { id in
                    let isAnswer = id == item.answerId
                    let isChosen = id == chosen
                    Button {
                        guard chosen == nil else { return }
                        chosen = id
                        if isAnswer { right += 1 }
                        model.update { $0.markStudied() }
                    } label: {
                        HStack {
                            Text(name(id)).font(.system(.body, design: .serif)).foregroundStyle(Palette.ink)
                            Spacer()
                            if chosen != nil, isAnswer { Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.correct) }
                        }
                        .padding(14)
                        .background(chosen != nil && isAnswer ? Palette.correctWash : chosen != nil && isChosen ? Palette.incorrectWash : Palette.slip,
                                    in: .rect(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.ruleStrong, lineWidth: 0.5))
                    }
                    .buttonStyle(PressStyle())
                    .accessibilityValue(chosen == nil ? "" : isAnswer ? "Correct answer" : isChosen ? "Your answer, incorrect" : "")
                }
                if chosen != nil {
                    Text(item.example.analysis).font(.prose(.callout)).foregroundStyle(Palette.ink2)
                    Button {
                        withAnimation { chosen = nil; index += 1 }
                    } label: {
                        Text("Next").font(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                }
            }
        }
        .onAppear { if pool.isEmpty { build() } }
        .sensoryFeedback(trigger: chosen) { _, new in
            guard let new, !pool.isEmpty else { return nil }
            return new == pool[index % pool.count].answerId ? .success : .error
        }
    }

    private func name(_ id: String) -> String { devices.first { $0.id == id }?.name ?? id }

    private func build() {
        var items: [Item] = []
        for d in devices {
            // Examples whose analysis says they're *not* the device don't belong in the drill.
            for ex in d.examples where !ex.analysis.lowercased().hasPrefix("not ") {
                let distractors = devices.filter { $0.id != d.id }.map(\.id).shuffled().prefix(3)
                items.append(Item(example: ex, answerId: d.id, options: ([d.id] + distractors).shuffled()))
            }
        }
        pool = items.shuffled()
        index = 0
        chosen = nil
        right = 0
    }
}
