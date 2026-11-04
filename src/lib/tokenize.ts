export interface Token {
  /** The text as it appears, macrons intact. */
  text: string;
  /** True for a word; false for punctuation and whitespace. */
  isWord: boolean;
  /** Index of this token within its line. */
  index: number;
}

/**
 * Split a line into word and non-word tokens, preserving everything.
 * Highlight and mark anchors are token indices into this, on every platform
 * (the apps get the tokens pre-split in their content), so it must never
 * change how it splits.
 */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  const re = /([A-Za-zÀ-ÿĀ-ſ]+)|([^A-Za-zÀ-ÿĀ-ſ]+)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    out.push({ text: m[0], isWord: Boolean(m[1]), index: i++ });
  }
  return out;
}
