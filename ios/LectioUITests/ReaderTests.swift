import XCTest

/// The Reading Room on the real app, in a simulator: holding a word starts a
/// highlight; the line tutor opens from the highlight bar, from a word's
/// gloss and from a line number's menu; and, once AI is allowed, it answers.
///
/// Built only by CI (`xcodegen generate --spec project-uitests.yml`), so the
/// project EAS builds for the App Store never sees this target.
@MainActor
final class ReaderTests: XCTestCase {
    /// The app on Aeneid 1.1–33 with sample progress (which also hides the
    /// first run and the tips). `aiConsent` stands in for the permission
    /// sheet's answer.
    private func launch(aiConsent: Bool) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-seedDemo", "YES", "-startTab", "read/aen-1-1-33",
                               "-aiConsent", aiConsent ? "YES" : "NO"]
        app.launch()
        return app
    }

    private func element(_ app: XCUIApplication, _ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    /// Waits for an element, then taps it.
    private func tap(_ element: XCUIElement, _ what: String) {
        XCTAssertTrue(element.waitForExistence(timeout: 8), "\(what) didn't appear")
        element.tap()
    }

    func testHoldingAWordStartsAHighlight() {
        let app = launch(aiConsent: false)
        let word = element(app, "word-1-virumque")
        XCTAssertTrue(word.waitForExistence(timeout: 30), "The passage didn't open")
        word.press(forDuration: 0.9)
        XCTAssertTrue(element(app, "highlight-done").waitForExistence(timeout: 5),
                      "Holding a word should start a highlight and show the highlight bar")
        // A pigment, then the bar goes and the mark stays.
        tap(app.buttons["Gilt"], "The gilt pigment")
        XCTAssertFalse(element(app, "highlight-done").waitForExistence(timeout: 2))
    }

    func testTheTutorOpensFromTheHighlightBar() {
        let app = launch(aiConsent: false)
        let word = element(app, "word-1-virumque")
        XCTAssertTrue(word.waitForExistence(timeout: 30))
        word.press(forDuration: 0.9)
        let ask = element(app, "highlight-ask")
        XCTAssertTrue(ask.waitForExistence(timeout: 5))
        ask.tap()
        XCTAssertTrue(app.navigationBars["Ask about this line"].waitForExistence(timeout: 5),
                      "Ask on the highlight bar should open the line tutor")
    }

    func testTheTutorOpensFromAWordsGloss() {
        let app = launch(aiConsent: false)
        let word = element(app, "word-1-Arma")
        XCTAssertTrue(word.waitForExistence(timeout: 30))
        word.tap()
        let ask = element(app, "gloss-ask")
        XCTAssertTrue(ask.waitForExistence(timeout: 5), "A word's gloss should offer Ask about this line")
        ask.tap()
        XCTAssertTrue(app.navigationBars["Ask about this line"].waitForExistence(timeout: 5),
                      "Ask about this line should open the line tutor once the gloss has closed")
    }

    func testALineNumberHasTheLinesMenu() {
        let app = launch(aiConsent: false)
        let number = element(app, "line-5")
        XCTAssertTrue(number.waitForExistence(timeout: 30))
        number.press(forDuration: 1.0)
        let ask = app.buttons["Ask about line 5"]
        XCTAssertTrue(ask.waitForExistence(timeout: 5), "Holding a line number should show its menu")
        ask.tap()
        XCTAssertTrue(app.navigationBars["Ask about this line"].waitForExistence(timeout: 5))
    }

    func testTheTutorAsksPermissionFirst() {
        let app = launch(aiConsent: false)
        let word = element(app, "word-1-Arma")
        XCTAssertTrue(word.waitForExistence(timeout: 30))
        word.tap()
        tap(element(app, "gloss-ask"), "The gloss's Ask button")
        tap(app.buttons["Parse every word in this line."], "The suggested question")
        let allow = app.buttons["Allow AI features"]
        XCTAssertTrue(allow.waitForExistence(timeout: 5), "The first AI request should ask permission")
        tap(app.buttons["Not now"], "Not now")
        XCTAssertFalse(element(app, "tutor-streaming").waitForExistence(timeout: 2), "Nothing is sent after Not now")
    }

    /// The whole round trip: the question goes to the live tutor and an
    /// answer streams back. A server-side refusal (a rate limit, the AI
    /// provider's quota) skips rather than fails; a problem in the app fails.
    func testTheTutorAnswers() throws {
        let app = launch(aiConsent: true)
        let word = element(app, "word-1-virumque")
        XCTAssertTrue(word.waitForExistence(timeout: 30))
        word.tap()
        tap(element(app, "gloss-ask"), "The gloss's Ask button")
        tap(app.buttons["Parse every word in this line."], "The suggested question")

        let answer = element(app, "tutor-answer")
        let failure = element(app, "tutor-error")
        let deadline = Date().addingTimeInterval(75)
        while Date() < deadline, !answer.exists, !failure.exists {
            _ = answer.waitForExistence(timeout: 1)
        }
        if failure.exists {
            let message = failure.label
            if message.hasPrefix("Couldn't reach the tutor") || message.hasPrefix("The tutor didn't send") {
                XCTFail("The tutor failed in the app: \(message)")
            } else {
                throw XCTSkip("The AI server declined just now: \(message)")
            }
        }
        XCTAssertTrue(answer.exists, "No answer arrived")
        XCTAssertGreaterThan(answer.label.count, 40, "The answer was too short to be real: \(answer.label)")
    }
}
