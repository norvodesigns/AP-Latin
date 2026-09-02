/**
 * Links into the official AP Latin Course and Exam Description.
 *
 * Everything this app teaches is answerable against the CED, and a student
 * should always be one click from the primary source rather than taking our
 * word for it. If College Board moves the PDF, this is the only file to change.
 *
 * The page numbers below are PDF page indices, not the printed folio numbers,
 * because `#page=` addresses the physical page — that is what Chrome, Safari,
 * Firefox and Acrobat jump to. Every one was verified by extracting the text
 * of the "Effective Fall 2025" edition and reading the heading on that page;
 * none of them is a guess. Re-verify before changing any of them.
 */

/** The Course and Exam Description PDF itself (Effective Fall 2025). */
export const CED_PDF =
  'https://apcentral.collegeboard.org/media/pdf/ap-latin-course-and-exam-description.pdf';

/** AP Central's course home page — syllabus, resources, past FRQs. */
export const AP_LATIN_COURSE = 'https://apcentral.collegeboard.org/courses/ap-latin';

/** Exam format, timing, and released free-response questions. */
export const AP_LATIN_EXAM = 'https://apcentral.collegeboard.org/courses/ap-latin/exam';

/** A deep link to one page of the CED. */
export function cedPage(page: number): string {
  return `${CED_PDF}#page=${page}`;
}

/**
 * The parts of the CED this app leans on, so a component can cite a landmark
 * by name rather than repeat a page number that might drift out of date.
 * `label` is what a reader sees; keep it honest about what the link opens.
 */
export const CED = {
  requiredReading: {
    page: 19,
    label: 'Required Readings',
    short: 'CED · Required Readings',
  },
  skills: {
    page: 226,
    label: 'Developing the Course Skills',
    short: 'CED · course skills',
  },
  examOverview: {
    page: 232,
    label: 'Exam Overview',
    short: 'CED · exam overview',
  },
  scoring: {
    page: 251,
    label: 'Scoring Guidelines',
    short: 'CED · scoring guidelines',
  },
  vocabulary: {
    page: 283,
    label: 'Appendix 2: Full Required Latin Vocabulary List',
    short: 'CED · Appendix 2',
  },
} as const;

export type CedLandmark = keyof typeof CED;

/** Resolved href for a named landmark. */
export function cedHref(landmark: CedLandmark): string {
  return cedPage(CED[landmark].page);
}
