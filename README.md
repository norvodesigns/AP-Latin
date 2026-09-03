# Lectio

A study environment for the AP Latin exam under the **2025–26 framework** — Vergil's *Aeneid* and
Pliny the Younger's *Letters*. Built for one student, one exam: **Friday, 14 May 2027**.

Deployed at **lectio.norvodesigns.com**.

Next.js (App Router) · TypeScript · Tailwind v4 · Zustand · Vercel AI SDK.

---

## What's in it

| Section | What it does |
| --- | --- |
| **Dashboard** | Countdown, mastery by unit and skill category, recent scores, what to study next, streak |
| **Reading Room** | Every syllabus passage with click-any-word glossary, notes, bookmarks, line flagging, cold-read toggle |
| **Translate** | Literal-translation drills in the exam's own 15-segment shape, with self- and AI-grading |
| **Sight Reading** | Timed unseen passages from the CED's recommended authors, plus an AI generator |
| **Quiz Engine** | Configurable MCQ sets filtered by author, passage, unit, skill or question type; review queue |
| **Vocabulary** | SM-2 spaced repetition over all 990 words of the official required list |
| **Grammar & Syntax** | The constructions AP tests, with examples from the real passages |
| **Scansion Lab** | Interactive dactylic hexameter with a rules tutorial |
| **Literary Devices** | Reference cards plus a spot-the-device drill |
| **Context & Culture** | Vergil, Augustan Rome, Pliny's world, Vesuvius, provincial administration |
| **FRQ Workshop** | All five free-response types, timed, with official rubrics and a Course Project mode |
| **Practice Exam** | 52 MCQ / 65 min, then 5 FRQ / 115 min, with a scored breakdown |
| **Study Plan** | Phases measured backwards from exam day |
| **Settings** | Theme, data export/import, AI usage meter |

### Keyboard

`⌘K` / `Ctrl+K` opens the command palette. `g` then a letter jumps to a section (`g` `r` for Reading
Room, `g` `v` for Vocabulary, and so on — each section's letter is shown on hover in the sidebar).
In the Reading Room: `c` cold read, `n` notes, `s` summary, `b` bookmark. In the Quiz Engine,
`1`–`4` answer and `↵` advances. In Vocabulary, `space` reveals and `1`–`4` grade.

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then paste your key in (see below)
npm run dev                    # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run verify      # content integrity checks — see below
```

`npm run verify` is worth knowing about. It checks that every answer key resolves to a real option,
that every translation segment appears contiguously in its passage, that every grammar or device
example really occurs in the passage it cites, that scansion feet add up and reconstruct their line,
and that FRQ rubrics total the points the exam actually awards. It caught fifteen real content
errors the first time it ran. Run it after editing anything under `src/data`.

---

## Getting a free Gemini API key

1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)** and sign in with a Google
   account.
2. Click **Create API key**. Pick an existing Google Cloud project or let it make one.
3. Copy the key. You will not be shown it again.

Then, for local development, paste it into `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

### Adding it to Vercel

1. Open your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. **Settings → Environment Variables**.
3. Add `GOOGLE_GENERATIVE_AI_API_KEY` with your key as the value. Tick **Production**, **Preview**
   and **Development**.
4. Redeploy — environment variables are read at build and run time, so an existing deployment will
   not pick up a new variable until it is redeployed.

> **Never prefix these with `NEXT_PUBLIC_`.** Anything with that prefix is inlined into the
> JavaScript bundle and served to every visitor. These keys are read only inside route handlers
> under `src/app/api/`, which run on the server. No client component references them, and
> `src/lib/ai/provider.ts` imports `server-only` so a stray client import fails the build rather
> than leaking the key.

### A note on the free tier and your data

Google's free tier for the Gemini API is free because **your prompts and responses may be used to
improve their models**. Paid tiers are not. Everything this app sends is Latin passages and your own
translations and essays, so there is nothing sensitive in it — but it is worth knowing, and it is
why nothing in this app sends anything you have not explicitly asked it to grade.

Free-tier model availability also changes without much notice: models get renamed, deprecated, or
have their quotas moved. That is exactly why the provider is behind an abstraction.

---

## Switching providers

Everything goes through `src/lib/ai/provider.ts`. To change the primary provider, edit one line:

```ts
const PRIMARY: ProviderName = 'google';   // change to 'groq'
```

**Groq is already wired up as an automatic fallback.** When Gemini returns a 429 (rate limit or
quota exhausted) or a 404 (model retired or renamed), the request is retried on Groq transparently.
Get a key at [console.groq.com/keys](https://console.groq.com/keys) and set:

```bash
GROQ_API_KEY=your-key-here
```

The fallback is optional. With no Groq key the app just surfaces a clear rate-limit message instead.

To change models without touching code:

```bash
GEMINI_MODEL=gemini-2.0-flash
GROQ_MODEL=llama-3.3-70b-versatile
```

To add a third provider, install its AI SDK package, add a branch to `model()` and a name to
`ProviderName`. Nothing outside that file needs to change — the route handlers only ever see a
`LanguageModel`.

---

## AI is an enhancement, not a dependency

**The app is fully usable with no API key at all.** Every AI surface has a self-grading path that
does the same job:

- Translation drills reveal a segment-by-segment model with the scoring criteria; you mark each
  segment yourself, and the missed-segment analytics work identically.
- The FRQ Workshop shows the official rubric rows and a strong sample response for self-scoring.
- The Reading Room glossary is offline — it runs against the parsed CED vocabulary list, not a model.
- Sight reading has six human-vetted passages that need no generation.

`/api/ai/status` reports whether any provider is configured, and the UI checks it before offering an
AI button, so you never get a button that fails.

### Endpoint protection

The deployed URL is public, so every AI route:

- caps the request body at 24 KB and rejects oversized fields with a specific message;
- rate-limits per IP in memory — 20 grading calls, 30 tutor questions and 10 sight generations per
  10 minutes;
- returns a clear, human error and never a stack trace;
- caches generated sight passages so repeated requests cost no quota.

In-memory limiting is per serverless instance, so it is a brake on runaway usage rather than a
security boundary. For a single-user study app that is the right size of solution.

---

## Deploying

The repo is set up so that **pushes to `main` deploy automatically**.

If you are wiring it up from scratch:

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project**, import the repository.
3. Framework preset: **Next.js**. The defaults are correct — no build command overrides needed.
4. Add `GOOGLE_GENERATIVE_AI_API_KEY` (and optionally `GROQ_API_KEY`) under Environment Variables
   before the first deploy, or redeploy after adding them.
5. Deploy. Every subsequent push to `main` redeploys; pull requests get preview URLs.

---

## Accuracy

This matters more than anything else in a study app, so:

- **The reading list comes from the official Course and Exam Description** (Effective Fall 2025),
  parsed directly from the PDF rather than remembered. So do the exam blueprint, the skill
  weightings, the FRQ point totals, and all 990 words of the required vocabulary list.
- **All Latin is real.** Aeneid books 1, 2, 4, 6, 7, 11 and 12 and Pliny *Letters* books 1, 2, 6, 7,
  9 and 10 were extracted from [The Latin Library](https://www.thelatinlibrary.com) (public domain).
  Every line number is validated against the printed numerals in the source. Two hexameters that the
  source had split across line breaks (*Aen.* 4.540 and 7.45) are repaired; lines that editors
  athetize and the source omits are preserved as numbering gaps rather than silently renumbered.
- **Nothing is paraphrased into Latin.** Where a passage could not be obtained reliably it is left
  out, not invented.
- **Scansion is derived, not guessed.** *Aeneid* 1.1–33 is the one passage whose source text carries
  macrons, so quantities come from the text itself plus the standard positional rules. A line is
  included only when exactly one foot division is metrically legal; 22 of the 33 lines resolve
  uniquely and the other 11 are omitted.
- **Machine-generated content is always labelled.** Sight passages produced by the AI generator
  carry a persistent "machine-selected" warning and the model's own confidence rating, because
  nobody has checked them against a printed text.
- **AI grading is measured, not assumed.** `npm run eval:grading` scores the grader against cases
  whose outcome is known in advance. See below.

### Measuring the AI grader

AI-graded work counts towards your record, so "it seems to work" is not good enough. A grader that
marks a correct translation wrong costs you real standing and teaches you to distrust a right
answer; one that waves errors through teaches nothing. Those two failures are not equally bad, so
the harness reports them separately.

```bash
npm run dev                       # in one terminal
npm run eval:grading              # in another
npm run eval:grading -- --base http://localhost:3160 --runs 3
```

Every case is built from the drill data itself, so the expected outcome does not depend on anyone's
opinion:

| case | submission | what must happen |
| --- | --- | --- |
| `perfect` | the drill's own continuous model translation | every segment awarded — any miss is a false negative |
| `truncated` | only the opening of that translation | the closing segments must fail, the opening ones must still pass |
| `empty` | an irrelevant sentence | everything must fail |

Two things are worth knowing about this harness.

**Its first version was unsound, and it mattered.** It built "correct" submissions by concatenating
each segment's accepted literal. For these drills that produces text no honest grader should pass —
one literal is an ellipsis placeholder (`"I … that you"`), several carry editorial glosses in
parentheses, and two overlap. It reported a pile of false negatives that were really defects in the
script. If you extend the harness, derive cases from `modelTranslation`, which is what a student
actually submits: unlabelled English prose, not a list of segments.

**It waits out the rate limiter rather than bypassing it.** The grading route allows 20 calls per
10 minutes per IP. Adding a test-only bypass would put an authentication surface into a production
route for the sake of a script, so the eval simply sleeps when it is told to. A full run therefore
takes upwards of ten minutes, and the limiter gets exercised too.

Both providers are exercised through the normal fallback path, so check the `[provider]` tag in the
output. If one provider's quota is exhausted every row will silently read as the other one, and you
will be measuring a model you did not think you were measuring.

### Where this app's reading list differs from your notes

The official 2025 CED requires **10 Pliny letters** (6.4, 6.7, 6.16, 6.20, 7.27, 10.5, 10.6, 10.7,
10.37, 10.90) and these Aeneid lines: 1.1–33, 1.88–107, 1.496–508; 2.40–56, 2.201–249; 4.74–89,
4.165–197, 4.305–361; 6.450–476, 6.788–800, 6.847–853; 7.45–58, 7.783–792, 7.803–817; 11.532–594;
12.791–796, 12.803–812, 12.818–828, 12.919–952.

A number of passages in wide circulation — Aeneid 2.268–297, 4.160–164, 4.259–304, 6.295–332,
6.384–425, 6.854–899, and Pliny 1.6, 2.6, 7.5, 7.24, 9.6, 10.33, 10.34, 10.38, 10.39, 10.40 — are
**not** on the 2025 required list. The Vergil ones were required under the previous (2012–2025)
syllabus. They are all loaded here as **supplementary**, flagged in the UI, and excluded from
"required" counts, because several sit immediately beside required passages and are genuinely useful
context. They just will not appear on the exam as syllabus reading.

---

## Data and privacy

There is no account, no database and no server-side storage of anything you write. Progress lives in
`localStorage` under `ap-latin-store`. **Clearing your browser data deletes it**, so use the export
button in Settings periodically — that JSON file is your only backup, and Import restores it.

---

## Adding your own content

See **[CONTENT.md](./CONTENT.md)** for the schema of every data file, worked examples, and the rules
the verifier enforces.
