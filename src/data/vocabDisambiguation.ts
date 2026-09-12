/**
 * Per-occurrence overrides for a word whose spelling matches more than one
 * dictionary entry — a genuinely different word, or a genuinely different
 * part of speech — where exactly one is grammatically correct in this
 * specific line, and the other candidate(s) are wrong there even though
 * they are the right answer somewhere else in the corpus.
 *
 * This is deliberately NOT the same mechanism as EXTRA_FORMS/
 * SUPPLEMENTARY_EXTRA_FORMS in lib/latin.ts, which fix a spelling that is
 * ALWAYS the same word everywhere it appears (e.g. "secum" is always the
 * reflexive, never the verb "seco"). The qui/quae/quod system is the
 * opposite case: "quod" really is, in different sentences, both the
 * relative pronoun AND an unrelated causal/explicative conjunction — Latin
 * itself is ambiguous at the level of the bare spelling, and only the
 * sentence around it decides which. A global override would just trade one
 * wrong answer for another wrong answer on whichever sense it didn't pick.
 *
 * Keyed by passage id + line number + the word's normalized spelling, since
 * that is exactly what the Reader's glossary popup, "Ask about this line",
 * and this app's other lookup() call sites already have on hand at the
 * point they'd want to disambiguate. `tokenIndex` (tokenize()'s per-line
 * token index, e.g. `t.index` in Reader.tsx) is only needed for the rare
 * line where the very same spelling appears twice with two different
 * correct senses — most entries don't need it, and it is ignored unless
 * more than one entry matches the same passage+line+word already.
 */
export interface VocabDisambiguationEntry {
  passageId: string;
  lineN: number;
  /** Normalized spelling as it appears in the line (see normalizeWord). */
  word: string;
  /** Normalized headword of the single correct entry. */
  headword: string;
  /** Disambiguates two occurrences of the same word on the same line. */
  tokenIndex?: number;
  /**
   * Only needed for the rare pair of true homographs — two unrelated
   * dictionary entries that happen to share the exact same headword
   * spelling, like the adjective "foedus" ("foul") and the noun "foedus"
   * ("treaty") — where `headword` alone can't tell lookup()'s candidates
   * apart and the entry's own `pos` string is the only thing that can.
   */
  pos?: string;
  /**
   * Rarer still: two entries that share both `headword` and `pos` — e.g.
   * "frons, frontis" ("brow") and "frons, frondis" ("foliage") are both
   * nouns, so `pos` can't separate them either. Matches the dictionary
   * entry's own unique `id` directly, bypassing `headword`/`pos` entirely.
   */
  entryId?: string;
}

export const VOCAB_DISAMBIGUATION: VocabDisambiguationEntry[] = [
  // ---- quod: relative pronoun "qui" vs. the causal/explicative
  // conjunction "quod" ("because", "that", "in that") — by far the
  // highest-frequency case of real ambiguity in the corpus. Resolved by
  // reading each sentence: a "quod" that refers back to an explicit or
  // implicit antecedent (id quod, idem quod, a preceding noun) is the
  // relative pronoun; a "quod" that gives a REASON after a verb/phrase of
  // emotion or statement (gratum est, gratias ago, laetor, mirum est,
  // propterea, inde/deinde... quod, non fui reus nisi forte quod) is the
  // conjunction.
  { passageId: 'pliny-6-16-a', lineN: 3, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-16-a', lineN: 7, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-16-a', lineN: 9, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-16-a', lineN: 12, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-20-b', lineN: 11, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-20-b', lineN: 12, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-6-20-b', lineN: 16, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-16-b', lineN: 16, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-16-b', lineN: 17, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-6-7', lineN: 1, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-6-7', lineN: 2, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-7-27-a', lineN: 2, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-7-27-a', lineN: 4, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-7-27-b', lineN: 9, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-7-27-b', lineN: 14, word: 'quod', headword: 'quod', tokenIndex: 10 },
  { passageId: 'pliny-7-27-b', lineN: 14, word: 'quod', headword: 'qui', tokenIndex: 88 },
  { passageId: 'pliny-10-5', lineN: 2, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-10-6', lineN: 1, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-10-37', lineN: 3, word: 'quod', headword: 'qui' },
  { passageId: 'aen-1-1-33', lineN: 24, word: 'quod', headword: 'qui' },
  { passageId: 'aen-6-450-476', lineN: 466, word: 'quod', headword: 'qui' },
  { passageId: 'aen-11-532-594', lineN: 552, word: 'quod', headword: 'qui' },
  { passageId: 'aen-12-818-828', lineN: 819, word: 'quod', headword: 'qui' },
  { passageId: 'caesar-bg-1-1', lineN: 4, word: 'quod', headword: 'quod' },
  { passageId: 'caesar-bg-1-1', lineN: 5, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-1-6', lineN: 2, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-2-6', lineN: 4, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-7-5', lineN: 1, word: 'quod', headword: 'quod' },
  { passageId: 'pliny-7-24', lineN: 5, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-7-24', lineN: 8, word: 'quod', headword: 'qui', tokenIndex: 30 },
  { passageId: 'pliny-7-24', lineN: 8, word: 'quod', headword: 'quod', tokenIndex: 58 },
  { passageId: 'pliny-9-6', lineN: 1, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-9-6', lineN: 3, word: 'quod', headword: 'qui', tokenIndex: 22 },
  { passageId: 'pliny-9-6', lineN: 3, word: 'quod', headword: 'quod', tokenIndex: 68 },
  { passageId: 'pliny-10-39', lineN: 3, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-10-39', lineN: 6, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-10-40', lineN: 1, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-10-40', lineN: 2, word: 'quod', headword: 'qui' },
  { passageId: 'pliny-10-40', lineN: 3, word: 'quod', headword: 'qui' },

  // ---- quam: the adverb "quam" ("how", and its very common comparative
  // "than"/"as...as") vs. the relative/interrogative pronoun-adjective
  // "qui" in its feminine accusative singular. A "quam" paired with a
  // comparative, "tam", "magis", "prius", or standing between two
  // comparanda is the adverb; a "quam" that refers back to a feminine noun
  // (or asks "which [fem. noun]?") is "qui".
  { passageId: 'pliny-6-16-a', lineN: 5, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-6-16-b', lineN: 17, word: 'quam', headword: 'qui' },
  { passageId: 'pliny-6-16-b', lineN: 20, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-6-16-b', lineN: 21, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-6-7', lineN: 3, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-7-27-b', lineN: 15, word: 'quam', headword: 'qui' },
  { passageId: 'pliny-10-6', lineN: 2, word: 'quam', headword: 'qui' },
  { passageId: 'aen-1-1-33', lineN: 15, word: 'quam', headword: 'qui' },
  { passageId: 'aen-1-496-508', lineN: 499, word: 'quam', headword: 'qui' },
  { passageId: 'aen-4-165-197', lineN: 188, word: 'quam', headword: 'quam' },
  { passageId: 'aen-4-165-197', lineN: 193, word: 'quam', headword: 'quam' },
  { passageId: 'aen-6-450-476', lineN: 451, word: 'quam', headword: 'qui' },
  { passageId: 'aen-6-450-476', lineN: 471, word: 'quam', headword: 'quam' },
  { passageId: 'aen-7-783-792', lineN: 788, word: 'quam', headword: 'quam' },
  { passageId: 'aen-11-532-594', lineN: 556, word: 'quam', headword: 'qui' },
  { passageId: 'caesar-bg-1-1', lineN: 6, word: 'quam', headword: 'qui' },
  { passageId: 'pliny-1-6', lineN: 3, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-2-6', lineN: 3, word: 'quam', headword: 'qui' },
  { passageId: 'pliny-2-6', lineN: 5, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-2-6', lineN: 7, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-7-24', lineN: 4, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-7-24', lineN: 5, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-10-39', lineN: 2, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-10-39', lineN: 4, word: 'quam', headword: 'quam' },
  { passageId: 'pliny-10-39', lineN: 5, word: 'quam', headword: 'quam', tokenIndex: 24 },
  { passageId: 'pliny-10-39', lineN: 5, word: 'quam', headword: 'qui', tokenIndex: 38 },
  { passageId: 'aen-6-295-332', lineN: 309, word: 'quam', headword: 'quam' },
  { passageId: 'aen-6-295-332', lineN: 311, word: 'quam', headword: 'quam' },
  { passageId: 'aen-6-295-332', lineN: 325, word: 'quam', headword: 'qui' },
  { passageId: 'aen-6-295-332', lineN: 328, word: 'quam', headword: 'quam' },

  // ---- quo: the adverb "quo" ("to where", "for which reason", and the
  // "quo + comparative" purpose-clause idiom) vs. "qui" when it is really
  // an adjective agreeing with a following ablative noun ("quo genere",
  // "quo numine") or a pronoun standing for a person ("sub quo" = "under
  // whom").
  { passageId: 'pliny-6-16-a', lineN: 1, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-6-16-a', lineN: 3, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-6-16-a', lineN: 5, word: 'quo', headword: 'quo', tokenIndex: 26 },
  { passageId: 'pliny-6-16-a', lineN: 5, word: 'quo', headword: 'qui', tokenIndex: 48 },
  { passageId: 'pliny-6-16-a', lineN: 11, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-6-16-a', lineN: 12, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-6-4', lineN: 5, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-7-27-b', lineN: 14, word: 'quo', headword: 'qui' },
  { passageId: 'pliny-10-7', lineN: 0, word: 'quo', headword: 'qui' },
  { passageId: 'pliny-10-37', lineN: 2, word: 'quo', headword: 'quo' },
  { passageId: 'aen-1-1-33', lineN: 8, word: 'quo', headword: 'qui' },
  { passageId: 'pliny-2-6', lineN: 5, word: 'quo', headword: 'qui' },
  { passageId: 'pliny-7-5', lineN: 1, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-9-6', lineN: 1, word: 'quo', headword: 'qui' },
  { passageId: 'pliny-9-6', lineN: 2, word: 'quo', headword: 'quo' },
  { passageId: 'pliny-10-39', lineN: 4, word: 'quo', headword: 'qui' },
  { passageId: 'aen-2-268-297', lineN: 268, word: 'quo', headword: 'quo' },
  { passageId: 'aen-4-259-295', lineN: 283, word: 'quo', headword: 'quo' },
  { passageId: 'aen-6-295-332', lineN: 319, word: 'quo', headword: 'qui' },
  { passageId: 'aen-6-854-899', lineN: 892, word: 'quo', headword: 'qui' },

  // ---- qua: the adverb "qua" ("by which way/route", "for which reason")
  // vs. "qui" as a feminine adjective agreeing with an ablative noun, vs.
  // the indefinite pronoun/adjective "quis" ("any-") in its very common
  // "si qua"/"ne qua" construction (see "quis"'s own definition, which
  // flags exactly this use).
  { passageId: 'pliny-6-16-b', lineN: 14, word: 'qua', headword: 'qui' },
  { passageId: 'pliny-7-27-b', lineN: 13, word: 'qua', headword: 'qua' },
  { passageId: 'pliny-10-6', lineN: 2, word: 'qua', headword: 'qui' },
  { passageId: 'aen-1-1-33', lineN: 18, word: 'qua', headword: 'quis' },
  { passageId: 'aen-4-165-197', lineN: 174, word: 'qua', headword: 'qui' },
  { passageId: 'aen-4-305-361', lineN: 322, word: 'qua', headword: 'qui' },
  { passageId: 'aen-4-305-361', lineN: 327, word: 'qua', headword: 'quis' },
  { passageId: 'aen-6-450-476', lineN: 459, word: 'qua', headword: 'quis' },
  { passageId: 'aen-12-791-796', lineN: 796, word: 'qua', headword: 'qui' },
  { passageId: 'aen-12-919-952', lineN: 932, word: 'qua', headword: 'quis' },
  { passageId: 'caesar-bg-1-1', lineN: 5, word: 'qua', headword: 'qua' },
  { passageId: 'pliny-10-38', lineN: 0, word: 'qua', headword: 'qui' },
  { passageId: 'aen-1-34-87', lineN: 83, word: 'qua', headword: 'qua' },
  { passageId: 'aen-4-259-295', lineN: 271, word: 'qua', headword: 'qui' },
  { passageId: 'aen-6-854-899', lineN: 882, word: 'qua', headword: 'quis' },
  { passageId: 'aen-6-854-899', lineN: 894, word: 'qua', headword: 'qua' },

  // ---- eo: every occurrence in the corpus is the ablative/dative of the
  // pronoun "is" ("he, it, that"), never the unrelated verb "eo, ire" ("to
  // go") — but "eo" is also the verb's own headword, so (unlike prima,
  // animum, terras, etc. above) EXTRA_FORMS can't override this: the verb
  // always self-matches its own headword exactly no matter what else is
  // added, so only a per-line filter can rule it out.
  { passageId: 'pliny-6-16-a', lineN: 6, word: 'eo', headword: 'is' },
  { passageId: 'pliny-6-16-b', lineN: 20, word: 'eo', headword: 'is' },
  { passageId: 'pliny-6-4', lineN: 3, word: 'eo', headword: 'is' },
  { passageId: 'pliny-6-7', lineN: 3, word: 'eo', headword: 'is' },
  { passageId: 'pliny-7-27-a', lineN: 2, word: 'eo', headword: 'is' },
  { passageId: 'pliny-10-39', lineN: 3, word: 'eo', headword: 'is' },
  { passageId: 'pliny-10-40', lineN: 2, word: 'eo', headword: 'is' },

  // ---- ora: every occurrence is "ora", the nominative/accusative plural
  // of the 3rd-declension neuter "os, oris" ("mouth, face" — "ante ora
  // patrum", "before the faces of the fathers"), never "ora, orae" ("shore,
  // border"), the coincidentally identical 1st-declension noun that is
  // also its own headword and so, like "eo" above, can't be ruled out by a
  // global override.
  { passageId: 'aen-1-88-107', lineN: 95, word: 'ora', headword: 'os' },
  { passageId: 'aen-2-201-249', lineN: 211, word: 'ora', headword: 'os' },
  { passageId: 'aen-2-201-249', lineN: 247, word: 'ora', headword: 'os' },
  { passageId: 'aen-4-165-197', lineN: 183, word: 'ora', headword: 'os' },
  { passageId: 'aen-4-165-197', lineN: 195, word: 'ora', headword: 'os' },
  { passageId: 'aen-6-295-332', lineN: 308, word: 'ora', headword: 'os' },

  // ---- alta: overwhelmingly the adjective altus ("high, deep") agreeing
  // with a noun in the same line (arx alta, tecta alta, galea alta, nemora
  // alta, stagna alta) — except Aeneid 2.203 "tranquilla per alta", the one
  // place it is the substantive noun altum ("the deep [sea]") instead, the
  // same poetic usage as "alto" in the opening line's "terris iactatus et
  // alto".
  { passageId: 'aen-1-1-33', lineN: 26, word: 'alta', headword: 'altus' },
  { passageId: 'aen-2-40-56', lineN: 56, word: 'alta', headword: 'altus' },
  { passageId: 'aen-2-201-249', lineN: 203, word: 'alta', headword: 'altum' },
  { passageId: 'aen-4-305-361', lineN: 343, word: 'alta', headword: 'altus' },
  { passageId: 'aen-7-783-792', lineN: 785, word: 'alta', headword: 'altus' },
  { passageId: 'aen-12-919-952', lineN: 929, word: 'alta', headword: 'altus' },
  { passageId: 'aen-6-295-332', lineN: 323, word: 'alta', headword: 'altus' },

  // ---- alto: the same altus/altum split as "alta" above, at the same
  // ablative singular spelling — substantive "the deep [sea]" when it
  // stands alone with nothing to agree with (Aeneid 1.3's famous "et
  // altō", tossed "on the deep"), adjective when it agrees with an
  // explicit ablative noun in the same line (umero, culmine, gurgite).
  { passageId: 'aen-1-1-33', lineN: 3, word: 'alto', headword: 'altum' },
  { passageId: 'aen-12-919-952', lineN: 941, word: 'alto', headword: 'altus' },
  { passageId: 'aen-2-268-297', lineN: 290, word: 'alto', headword: 'altus' },
  { passageId: 'aen-6-295-332', lineN: 310, word: 'alto', headword: 'altus' },

  // ---- foedera: always the noun foedus, foederis ("treaty, covenant"),
  // never foedero (not a real word) or the unrelated homograph adjective
  // "foedus, -a, -um" ("foul") — its own neuter plural is "foeda", not
  // "foedera", so it never actually matches this spelling at all; `pos`
  // is needed only because both the adjective and the noun otherwise
  // share the bare headword string "foedus".
  { passageId: 'aen-4-305-361', lineN: 339, word: 'foedera', headword: 'foedus', pos: 'noun' },
  { passageId: 'aen-12-818-828', lineN: 822, word: 'foedera', headword: 'foedus', pos: 'noun' },

  // ---- secum: always the reflexive "sui" ("with himself/herself/
  // themselves") plus the postpositive enclitic "-cum" — every occurrence
  // in the corpus. This can't be a global SUPPLEMENTARY_EXTRA_FORMS
  // override (one already exists) because Whitaker's data also carries an
  // unrelated noun "secum" (a variant spelling of "sebum", tallow) as its
  // own headword, which always self-matches exactly no matter what else is
  // added — the same architectural wrinkle as "eo" and "ora" above.
  { passageId: 'aen-4-74-89', lineN: 74, word: 'secum', headword: 'sui' },
  { passageId: 'aen-11-532-594', lineN: 550, word: 'secum', headword: 'sui' },
  { passageId: 'aen-1-34-87', lineN: 37, word: 'secum', headword: 'sui' },
  { passageId: 'aen-1-34-87', lineN: 50, word: 'secum', headword: 'sui' },
  { passageId: 'aen-1-34-87', lineN: 59, word: 'secum', headword: 'sui' },

  // ---- mei: the personal pronoun ego's own genitive ("mindful of myself")
  // in the one place it's reflexive-ish, but the possessive adjective
  // meus's genitive ("of my uncle", "my freedmen") everywhere else — the
  // same kind of split as "tui" above, just not lopsidedly one-sided
  // enough in this corpus to give it a single global answer.
  { passageId: 'pliny-6-16-a', lineN: 1, word: 'mei', headword: 'meus' },
  { passageId: 'pliny-6-20-a', lineN: 1, word: 'mei', headword: 'meus' },
  { passageId: 'aen-4-305-361', lineN: 336, word: 'mei', headword: 'ego' },
  { passageId: 'pliny-2-6', lineN: 4, word: 'mei', headword: 'meus' },

  // ---- medio: the adjective medius ("middle") when it agrees with an
  // explicit noun in the same case ("sinu medio", "medio sermone"), the
  // substantive noun medium ("the middle [part]") governing a genitive
  // when it doesn't ("caeli medio" = "the middle of the sky", "fugae
  // medio" = "the middle of the ford/flight") — the same distinction as
  // "medio"'s sibling forms would draw, worked out case by case since nothing
  // here makes one answer right everywhere.
  { passageId: 'pliny-6-16-a', lineN: 12, word: 'medio', headword: 'medius' },
  { passageId: 'aen-4-165-197', lineN: 184, word: 'medio', headword: 'medium' },
  { passageId: 'aen-11-532-594', lineN: 547, word: 'medio', headword: 'medium' },
  { passageId: 'aen-4-259-295', lineN: 277, word: 'medio', headword: 'medius' },

  // ---- solum: the adverb "only" (from solus's own neuter accusative,
  // idiomatic in "non solum...verum/sed etiam", "not only...but also")
  // everywhere except Letters 10.39.2, where it is instead the noun
  // "solum" ("ground, soil") — added by hand to build-supplement.mjs
  // specifically because the core list's own stem-collision with solus
  // meant this word never showed up as a no-match word for the generated
  // pass to find on its own.
  { passageId: 'pliny-6-20-a', lineN: 1, word: 'solum', headword: 'solus' },
  { passageId: 'pliny-10-6', lineN: 2, word: 'solum', headword: 'solus' },
  { passageId: 'aen-4-305-361', lineN: 324, word: 'solum', headword: 'solus' },
  { passageId: 'pliny-10-39', lineN: 2, word: 'solum', headword: 'solum', pos: 'noun' },
  { passageId: 'pliny-10-39', lineN: 6, word: 'solum', headword: 'solus' },

  // ---- uerum (verum): the conjunction "but, but also" (see the hand-added
  // entry in build-supplement.mjs) in every occurrence here, all of them
  // the "non solum/modo... verum etiam" idiom or its bare "verum age"
  // cousin — never verus ("true") or vero ("indeed"), the stem-collision
  // candidates the core list offered before this word had its own entry.
  { passageId: 'pliny-6-20-a', lineN: 1, word: 'uerum', headword: 'uerum' },
  { passageId: 'aen-11-532-594', lineN: 587, word: 'uerum', headword: 'uerum' },
  { passageId: 'pliny-10-39', lineN: 6, word: 'uerum', headword: 'uerum' },

  // ---- oris: with macrons stripped, "ōrīs" (ablative plural of ora, -ae,
  // "shore") and "ōris" (genitive singular of os, oris, "face/mouth") are
  // spelled identically. "Troiae qui primus ab oris" (Aen. 1.1) is "from
  // the shores of Troy" — ora, not os. (Its converse, "ante ora patrum" at
  // Aen. 1.95, os not ora, is already covered in the "ora" block above.)
  { passageId: 'aen-1-1-33', lineN: 1, word: 'oris', headword: 'ora' },

  // ---- parent: two lines apart, two different verbs that happen to share
  // this 3rd-plural-present spelling. Line 290 is jussive "arma parent"
  // ("let them prepare arms" — paro). Line 295 is "imperio laeti parent"
  // ("gladly they obey the command" — pareo). pareo itself was missing
  // from both dictionaries entirely before this pass (only the compound
  // appareo existed) — added to supplementaryVocabulary.ts alongside this
  // entry, since it is not on the CED's required list.
  { passageId: 'aen-4-259-295', lineN: 290, word: 'parent', headword: 'paro' },
  { passageId: 'aen-4-259-295', lineN: 295, word: 'parent', headword: 'pareo' },

  // ---- reliqui: "nihil ipsa reliqui" (Aen. 4.315) is relinquo's first-
  // singular perfect ("I myself have left nothing"), not a form of
  // reliquiae ("remains"), which the stem-matcher offers first because the
  // core list has no exact inflected-form entry for this perfect tense.
  { passageId: 'aen-4-305-361', lineN: 315, word: 'reliqui', headword: 'relinquo' },

  // ---- frons: a true homograph — frons, frontis (f.) "brow" and frons,
  // frondis (f.) "foliage" share not just their headword spelling but also
  // `pos` ("noun" for both), so `pos` alone can't tell them apart either;
  // pinned by the supplementary entry's own id. "sed frons laeta parum"
  // (Aen. 6.862) is Marcellus's brow, not foliage.
  { passageId: 'aen-6-854-899', lineN: 862, word: 'frons', headword: 'frons', entryId: 'sup-21087' },

  // ---- propago: "sit Romana potens Itala virtute propago" (Aen. 12.827)
  // is the noun ("stock, offspring" — Rome's future line), not the verb
  // "to propagate, extend" that the supplementary index returns first.
  { passageId: 'aen-12-818-828', lineN: 827, word: 'propago', headword: 'propago', pos: 'noun' },

  // ---- victum: "victum tendere palmas" (Aen. 12.936) is vinco's perfect
  // passive participle used as a substantive ("[Turnus] beaten, stretching
  // out his hands") — the correct reading for this line. A form of victus,
  // -us (m.), "livelihood" (itself derived from vivo), is also an exact
  // match for the bare spelling and is left in the dictionary as the
  // right answer elsewhere; this pins only this one occurrence.
  { passageId: 'aen-12-919-952', lineN: 936, word: 'uictum', headword: 'uinco' },

  // ---- sipo: "nullus usquam in publico sipo" (Pliny 10.33.2) is the
  // noun — "no fire-engine/siphon anywhere in public" — not the verb
  // "to throw, pour, scatter" the supplementary index returns first.
  { passageId: 'pliny-10-33', lineN: 2, word: 'sipo', headword: 'sipo', pos: 'noun' },

  // ---- spirisque: "corripiunt spirisque ligant ingentibus" (Aen. 2.217)
  // is spira, -ae ("coil" — the serpents bind Laocoon "with huge coils"),
  // not a form of spiro ("breathe"), which core lookup returns first via
  // the shared "spir-" stem.
  { passageId: 'aen-2-201-249', lineN: 217, word: 'spirisque', headword: 'spira' },
];
