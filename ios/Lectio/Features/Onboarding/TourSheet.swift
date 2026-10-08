import SwiftUI

/// The first run's tour on its own, from Settings › Take the tour again.
struct TourSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var page = 0

    var body: some View {
        NavigationStack {
            TourPages(page: $page)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    VStack(spacing: 16) {
                        PageDots(count: TourPages.count, current: page)
                        Button {
                            if page < TourPages.count - 1 {
                                withAnimation(.spring(duration: 0.45)) { page += 1 }
                            } else {
                                dismiss()
                            }
                        } label: {
                            Text(page < TourPages.count - 1 ? "Continue" : "Done")
                                .font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
                        }
                        .glassButton(prominent: true)
                    }
                    .tint(Palette.rubric)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .frame(maxWidth: 480)
                    .frame(maxWidth: .infinity)
                }
                .ambientBackground()
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { dismiss() }
                    }
                }
        }
    }
}
