import XCTest

/// iPhone Duo opened out, or an iPad laid out as one (`-previewDuo YES`): a
/// word's gloss opens as the right-hand page, beside the Latin rather than
/// over it, changes when another word is tapped, and closes again.
///
/// Skipped on a phone-sized screen. The UI tests workflow runs on an iPhone,
/// so run this one by hand on an iPad simulator, or on Xcode 27.1's iPhone
/// Duo simulator opened out.
@MainActor
final class DuoLayoutTests: XCTestCase {
    private func element(_ app: XCUIApplication, _ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    /// A word of the passage, once it can be tapped (see ReaderTests).
    private func word(_ app: XCUIApplication, _ id: String) -> XCUIElement {
        let word = element(app, id)
        XCTAssertTrue(word.waitForExistence(timeout: 30), "The passage didn't open")
        let hittable = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isHittable == true"), object: word)
        XCTAssertEqual(XCTWaiter().wait(for: [hittable], timeout: 20), .completed, "\(id) never became tappable")
        return word
    }

    func testTheGlossOpensAsTheRightHandPage() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-seedDemo", "YES", "-previewDuo", "YES", "-startTab", "read/aen-1-1-33",
                               "-aiConsent", "NO"]
        app.launch()
        let window = app.windows.firstMatch
        XCTAssertTrue(window.waitForExistence(timeout: 10))
        try XCTSkipIf(window.frame.width < 700, "Needs iPhone Duo opened out, or an iPad")

        let arma = word(app, "word-1-Arma")
        arma.tap()
        let close = app.buttons["gloss-close"]
        XCTAssertTrue(close.waitForExistence(timeout: 5), "The gloss should open as the right-hand page")
        // Beside the line, not over it: the page begins to the right of the word.
        XCTAssertGreaterThan(close.frame.minX, arma.frame.maxX)

        // The page stays open and shows the next word tapped.
        word(app, "word-1-virumque").tap()
        XCTAssertTrue(close.exists, "Tapping another word should keep the gloss open")

        close.tap()
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: close)
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 5), .completed, "The cross should close the gloss")
    }
}
