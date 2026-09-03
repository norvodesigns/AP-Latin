export interface NavItem {
  href: string;
  label: string;
  /** Single-key shortcut, pressed with `g` first (e.g. g then r). */
  key: string;
  group: 'study' | 'drill' | 'reference' | 'exam';
  blurb: string;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', key: 'd', group: 'study', blurb: 'Countdown, mastery, what to study next' },
  { href: '/read', label: 'Reading Room', key: 'r', group: 'study', blurb: 'Every syllabus passage with glossary and notes' },
  { href: '/translate', label: 'Translate', key: 't', group: 'drill', blurb: 'Literal translation drills with AP scoring segments' },
  { href: '/sight', label: 'Sight Reading', key: 'i', group: 'drill', blurb: 'Timed unseen prose and poetry' },
  { href: '/quiz', label: 'Quiz Engine', key: 'q', group: 'drill', blurb: 'Configurable AP-style multiple choice' },
  { href: '/vocab', label: 'Vocabulary', key: 'v', group: 'drill', blurb: 'Spaced repetition over the 990-word core list' },
  { href: '/grammar', label: 'Grammar & Syntax', key: 'g', group: 'reference', blurb: 'The constructions AP actually tests' },
  { href: '/scansion', label: 'Scansion Lab', key: 's', group: 'drill', blurb: 'Mark quantities, elisions and caesurae' },
  { href: '/devices', label: 'Literary Devices', key: 'l', group: 'reference', blurb: 'Style reference and spot-the-device drill' },
  { href: '/context', label: 'Context & Culture', key: 'c', group: 'reference', blurb: 'Vergil, Augustan Rome, Pliny’s world' },
  { href: '/frq', label: 'FRQ Workshop', key: 'f', group: 'exam', blurb: 'All five free-response types, timed' },
  { href: '/exam', label: 'Practice Exam', key: 'e', group: 'exam', blurb: 'Full 52 MCQ + 5 FRQ, section timers' },
  { href: '/plan', label: 'Study Plan', key: 'p', group: 'study', blurb: 'A schedule built from your exam date' },
  { href: '/settings', label: 'Settings', key: ',', group: 'reference', blurb: 'Theme, data export, AI usage meter' },
];

export const NAV_GROUPS: Array<{ id: NavItem['group']; label: string }> = [
  { id: 'study', label: 'Study' },
  { id: 'drill', label: 'Drill' },
  { id: 'reference', label: 'Reference' },
  { id: 'exam', label: 'Exam' },
];

/** The nav label for an assignable section id (e.g. "read" -> "Reading Room"),
 *  used wherever a classroom assignment names a section — the teacher's
 *  assignment form and both the student and teacher classroom views. */
export function sectionLabel(section: string): string {
  return NAV.find((n) => n.href === `/${section}`)?.label ?? section;
}
