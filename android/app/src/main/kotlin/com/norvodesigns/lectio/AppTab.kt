package com.norvodesigns.lectio

import androidx.compose.ui.graphics.Color
import com.norvodesigns.lectio.ui.theme.LectioColors

/** Every section of the app: the web's NAV (src/lib/nav.ts), plus search. */
enum class AppTab(val route: String) {
    Today("today"), Learn("learn"), Read("read"), Vocab("vocab"), Quiz("quiz"),
    Translate("translate"), Sight("sight"), Scansion("scansion"), Forge("forge"),
    Grammar("grammar"), Devices("devices"), Context("context"),
    Frq("frq"), Exam("exam"), Plan("plan"),
    Classroom("classroom"), Settings("settings"), Search("search"), Laurels("laurels");

    companion object {
        /** A deep link's host: lectio://vocab opens Vocabulary. */
        fun fromHost(host: String?): AppTab? = entries.firstOrNull { it.route == host }
    }
}

/** How the website's menu groups its sections (src/lib/nav.ts), plus the app's own "You". One pigment each. */
enum class SectionGroup(val title: String) {
    Study("Study"), Drill("Drill"), Reference("Reference"), Exam("Exam"), You("You");

    fun tint(c: LectioColors): Color = when (this) {
        Study -> c.rubric
        Drill -> c.woad
        Reference -> c.verdigris
        Exam -> c.gilt
        You -> c.inkMuted
    }
}

/**
 * One entry of the app's whole menu: the same sections, in the same groups and
 * order, with the same one-line descriptions, as the website's menu. Browse
 * lists them all; Today's "Jump to" panel picks some.
 */
data class SectionEntry(
    val id: String,
    val title: String,
    /** For a small tile. */
    val short: String,
    val blurb: String,
    val symbol: String,
    val group: SectionGroup,
    /** The tab it opens, or null for the Sententia of the day, which opens as a lesson. */
    val tab: AppTab?,
) {
    companion object {
        val all: List<SectionEntry> = listOf(
            SectionEntry("today", "Today", "Today", "Countdown, progress, what to study next", "sun.horizon", SectionGroup.Study, AppTab.Today),
            SectionEntry("learn", "Course", "Course", "Grammar from the first word to AP, and the AP word list by letter, adapted to what you know", "graduationcap", SectionGroup.Study, AppTab.Learn),
            SectionEntry("daily", "Sententia of the day", "Sententia", "One famous line of Latin a day, and three quick questions on it", "text.quote", SectionGroup.Study, null),
            SectionEntry("read", "Reading Room", "Read", "Every syllabus passage with glossary and notes", "book.closed", SectionGroup.Study, AppTab.Read),
            SectionEntry("laurels", "Laurels", "Laurels", "Achievements across everything you do here", "laurel.leading", SectionGroup.Study, AppTab.Laurels),
            SectionEntry("plan", "Study Plan", "Plan", "A schedule built from your exam date", "calendar", SectionGroup.Study, AppTab.Plan),

            SectionEntry("translate", "Translate", "Translate", "Literal translation drills with AP scoring segments", "character.book.closed", SectionGroup.Drill, AppTab.Translate),
            SectionEntry("sight", "Sight Reading", "Sight", "Timed unseen prose and poetry", "eye", SectionGroup.Drill, AppTab.Sight),
            SectionEntry("quiz", "Quiz Engine", "Quiz", "Configurable AP-style multiple choice", "checklist", SectionGroup.Drill, AppTab.Quiz),
            SectionEntry("forge", "Forms Forge", "Forge", "Every ending, drilled: fill the chart, make the form, name the form", "hammer", SectionGroup.Drill, AppTab.Forge),
            SectionEntry("vocab", "Vocabulary", "Vocab", "Spaced repetition over every word the passages use", "rectangle.on.rectangle.angled", SectionGroup.Drill, AppTab.Vocab),
            SectionEntry("scansion", "Scansion Lab", "Scansion", "Mark quantities, elisions and caesurae", "waveform.path", SectionGroup.Drill, AppTab.Scansion),

            SectionEntry("grammar", "Grammar & Syntax", "Grammar", "The constructions AP actually tests", "text.book.closed", SectionGroup.Reference, AppTab.Grammar),
            SectionEntry("devices", "Literary Devices", "Devices", "Style reference and spot-the-device drill", "wand.and.stars", SectionGroup.Reference, AppTab.Devices),
            SectionEntry("context", "Context & Culture", "Context", "Vergil, Augustan Rome, Pliny’s world", "building.columns", SectionGroup.Reference, AppTab.Context),

            SectionEntry("frq", "FRQ Workshop", "FRQ", "All five free-response types, timed", "pencil.and.list.clipboard", SectionGroup.Exam, AppTab.Frq),
            SectionEntry("exam", "Practice Exam", "Exam", "Full 52 MCQ + 5 FRQ, section timers", "timer", SectionGroup.Exam, AppTab.Exam),

            SectionEntry("classroom", "Classroom", "Classroom", "Join a class, see what your teacher has assigned", "person.3", SectionGroup.You, AppTab.Classroom),
            SectionEntry("settings", "Settings", "Settings", "Appearance, backup, sign in, reminders, AI usage", "gearshape", SectionGroup.You, AppTab.Settings),
        )

        fun inGroup(group: SectionGroup): List<SectionEntry> = all.filter { it.group == group }
        fun entry(id: String): SectionEntry? = all.firstOrNull { it.id == id }
    }
}
