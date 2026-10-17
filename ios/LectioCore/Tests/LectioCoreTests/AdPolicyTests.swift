import Foundation
import Testing
import LectioCore

/// When ads may show: none while setting up or on the first day, a banner
/// after that, and a full-screen ad at most once a (local) day.
@Suite struct AdPolicyTests {
    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()
    private let install = Date(timeIntervalSince1970: 1_790_000_000)   // an arbitrary instant
    private func later(_ hours: Double, from date: Date? = nil) -> Date { (date ?? install).addingTimeInterval(hours * 3600) }

    private func allows(_ p: AdPolicy.Placement, now: Date, last: Date? = nil, onboarded: Bool = true) -> Bool {
        AdPolicy.allows(p, installedAt: install, now: now, lastInterstitialAt: last, onboarded: onboarded, calendar: calendar)
    }

    @Test func noAdsWhileSettingUp() {
        #expect(!allows(.todayBanner, now: later(500), onboarded: false))
        #expect(!allows(.afterLesson, now: later(500), onboarded: false))
    }

    @Test func noAdsOnTheFirstDay() {
        #expect(!allows(.todayBanner, now: install))
        #expect(!allows(.todayBanner, now: later(23.9)))
        #expect(!allows(.afterLesson, now: later(23.9)))
    }

    @Test func aBannerOnceTheFirstDayIsOver() {
        #expect(allows(.todayBanner, now: later(24)))
        #expect(allows(.todayBanner, now: later(24 * 30)))
    }

    @Test func aFullScreenAdAtMostOnceADay() {
        let first = later(30)
        #expect(allows(.afterLesson, now: first, last: nil))
        // Later the same day: no. The next day: yes.
        #expect(!allows(.afterLesson, now: later(2, from: first), last: first))
        #expect(allows(.afterLesson, now: later(24, from: first), last: first))
    }

    @Test func theBannerIsNotLimitedByTheFullScreenAd() {
        let shown = later(30)
        #expect(allows(.todayBanner, now: later(1, from: shown), last: shown))
    }

    @Test func aClockSetBackBeforeTheInstallGetsNoAds() {
        #expect(!allows(.todayBanner, now: later(-48)))
        #expect(!allows(.afterLesson, now: later(-48)))
    }
}
