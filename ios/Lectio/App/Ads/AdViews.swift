import GoogleMobileAds
import SwiftUI
import UIKit

/// The banner at the very bottom of Today: a small, labelled slot below every
/// panel, there only when the ad policy allows it, and gone again if no ad
/// arrives (rather than leaving an empty box).
struct AdPanel: View {
    @Environment(AppModel.self) private var model
    @State private var loaded = false
    @State private var failed = false

    var body: some View {
        if model.ads.bannerAllowed, !failed {
            VStack(spacing: 6) {
                Text("Advertisement")
                    .quietLabel()
                    .opacity(loaded ? 1 : 0)
                AdBanner(loaded: $loaded, failed: $failed)
                    .frame(width: 320, height: 50)
                    .opacity(loaded ? 1 : 0)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 10)
            .animation(.easeInOut(duration: 0.3), value: loaded)
            .accessibilityElement(children: .contain)
        }
    }
}

/// Google's standard 320 × 50 banner, loaded once.
struct AdBanner: UIViewRepresentable {
    @Binding var loaded: Bool
    @Binding var failed: Bool

    func makeCoordinator() -> Coordinator { Coordinator(loaded: $loaded, failed: $failed) }

    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView()
        banner.adSize = AdSizeBanner
        banner.adUnitID = AdConfig.bannerUnit
        banner.rootViewController = Self.topViewController()
        banner.delegate = context.coordinator
        banner.load(AdManager.request())
        return banner
    }

    func updateUIView(_ uiView: BannerView, context: Context) {}

    final class Coordinator: NSObject, BannerViewDelegate {
        private let loaded: Binding<Bool>
        private let failed: Binding<Bool>

        init(loaded: Binding<Bool>, failed: Binding<Bool>) {
            self.loaded = loaded
            self.failed = failed
        }

        nonisolated func bannerViewDidReceiveAd(_ bannerView: BannerView) {
            Task { @MainActor in self.loaded.wrappedValue = true }
        }

        nonisolated func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: any Error) {
            Task { @MainActor in self.failed.wrappedValue = true }
        }
    }

    /// The view controller an ad presents from: the front-most one in the
    /// active window.
    static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}
