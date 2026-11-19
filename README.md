# Biblica 📖✨

> **A Gamified Bible Verse Memorization & Trivia Progressive Web App (PWA)**

Biblica turns Scripture memorization into an engaging, gamified experience using proven cognitive recall methodologies—including progressive cloze deletion (fill-in-the-blanks), interactive 3D flashcards with spaced repetition, word scramble puzzles, and fast-paced trivia quizzes.

---

## 🌟 Key Features

### 1. 🧩 Progressive Fill-in-the-Blank (Cloze Deletion)
- **Leading Context Recall**: Shows the verse leading up to the blank `[ ___ ]` and presents intelligent word choices or typing prompts.
- **Gradual Erasure Stages**:
  - **Gentle (25% blanks)**: Key keywords blanked out.
  - **Standard (33% blanks)**: Every third word blanked out.
  - **Advanced (50% blanks)**: Every other word blanked out.
  - **Master (100% blanks)**: Total blank recall.
- **Audio Recitation**: Built-in speech synthesis to listen to verses aloud.

### 2. 📇 3D Flashcards & Spaced Repetition
- 3D card-flip animations.
- Dual prompt modes:
  - **Reference ➔ Scripture**: See the citation (e.g. *John 3:16*) and test your recall of the text.
  - **Scripture ➔ Reference**: Read the passage and guess which book, chapter, and verse it belongs to.
- Self-rated recall (**Again**, **Hard**, **Good**, **Easy**) adjusting your mastery score and spaced repetition cadence.

### 3. 🎲 Word Scramble & Verse Rebuilder
- Scrambles verse words into interactive floating tiles.
- Tap tiles in the correct sequence to reconstruct the scripture sentence.
- Intelligent hints highlight the next word if you're stuck.

### 4. ⚡ Rapid Bible Trivia Quiz
- Fast-paced 15-second countdown timer per question.
- Dynamic question generation:
  - Reference Matching
  - Verse Completion
- **Combo Multipliers** (1.0x up to 3.0x) for rapid streaks.

### 5. 📚 Scripture Library & the Whole Bible
- Curated collection across thematic categories:
  - *Essential Classics*, *Peace & Anxiety*, *Strength & Courage*, *Love & Kindness*, *Faith & Salvation*, *Wisdom & Guidance*, *Hope & Comfort*.
- **The whole Bible in three translations**: KJV, BSB (Berean Standard Bible) and WEB (World English Bible). The built-in verses follow your default translation.
- **Amharic Bible (1962)**: pick አማርኛ to learn verses in Amharic, from the Old and New Testaments. Built-in verses whose Amharic text was lost are left out of the Amharic library, which has extra New Testament verses on the same themes.
- **Add any verse**: type a reference (`Romans 12:1-2`, `1 jn 4:19`, `ps 23:1–3`, `ዮሐንስ 3፡16`) and the text is looked up for you.

### 6. 🏆 Gamification Engine
- **XP & Levels**: Earn XP for each correct word, card reviewed, and quiz completed. Level up from *Devoted Reader* to *Disciple of the Word*.
- **Daily Streak Tracker**: Tracks consistent daily scripture practice.
- **Synthesized Web Audio**: Harmonic crystal bells for correct answers, soft low tones for incorrect, paper-like card flips, and celebratory fanfares—100% offline with zero external audio assets.
- **Celebratory Confetti**: Visual rewards upon mastering stages.

### 7. 📱 Offline Progressive Web App (PWA)
- Installable on iOS (Safari Add to Home Screen), Android (Chrome install prompt), macOS, and Windows.
- Full offline capability powered by Service Workers and CacheStorage.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Audio**: Native HTML5 Web Audio API (Synthesized)

---

## 📖 Bible Data

The Bible ships as static JSON, one file per book per translation:

```
public/bible/v1/<KJV|BSB|WEB|AMH>/<USFM book code>.json   // (string|null)[][]: [chapter-1][verse-1] -> text
```

- Files are immutable for a data version (`BIBLE_DATA_VERSION` in `src/data/translations.ts`). Vercel serves them with a one-year `immutable` cache header (`vercel.json`), and the service worker caches each book the first time it is opened, so it then works offline.
- They are generated from the eBible.org USFM sources by `npm run build:bible` (needs Node 23.6+ and `unzip`). The script drops Psalm titles, headings and footnotes, checks every book's chapter count, and writes the built-in verses' text to `src/data/curatedText.json`. A verse a translation leaves out (the BSB omits verses missing from the oldest manuscripts, such as Matthew 17:21) is stored as `""`.
- Only translations that may be redistributed are included. NIV, ESV, NLT, NASB and NKJV need a publisher licence.

### Amharic

The Amharic New Testament is the 1962 text from eBible.org (`amh`): © 1962, 2003 United Bible Societies, used with the Bible Society of Ethiopia's permission for **non-commercial** use, on condition that the full copyright statement is shown (Settings → Bible texts). Any commercial use of Biblica needs the Bible Society of Ethiopia's written permission first.

The digital text is damaged in 254 places: it marks 3-5 verses as printed together (`\v 14-16`) but keeps only one verse's words, sometimes the first and sometimes the last (John 3:14-16 holds only 3:16). John 1:41-52 are also numbered one too high. Every verse in those places, 857 in all, is stored as `null` and shown as not available rather than under a guessed number.

The Amharic Old Testament is the same 1962 Bible, from [WordProject](https://www.wordproject.org/bibles/am/) (credited in Settings → Bible texts). `npm run build:bible` reads its chapter pages one at a time, 1.5 s apart, and caches them; 1 Kings 21, whose live page repeats chapter 22, comes from WordProject's zip archive. Its text is damaged too, and the same rule applies, so 804 of its 23,145 verses are `null`:
- An empty verse was printed together with a neighbour, but the text doesn't say which one holds both (usually the next: Genesis 7:3 holds 7:2-3), so the empty verse and the verse on each side are unavailable.
- A verse with left-over transliteration code (Latin letters, digits) is unavailable, and so are its neighbours when the code is a verse number.
- Where the text follows the Hebrew numbering (2 Kings 12, Job 40:25-41:26, Song 7, Hosea 2 and 12, Jonah 2), adds verses (Psalm 14:4-10) or keeps a title as a verse (Psalm 140:1), those verses are unavailable rather than shown under the wrong English number.

Restoring them goes through a native Amharic reader. `scripts/amharic-repairs.json` proposes, for each damaged place, the one verse its surviving text belongs to; the build applies only entries marked `confirmed`. To run a review round:

1. `npm run amharic:sheet -- review.html` and send `review.html` to the reader. It works offline in any browser, keeps their progress, and makes an answers text to send back.
2. Save their answers as a file and run `npm run amharic:apply -- answers.txt`. "Yes", or another verse the reader picks, confirms an entry; "None" and "Not sure" leave it unavailable.
3. Run `npm run build:bible`, bumping `BIBLE_DATA_VERSION` if the Amharic files are already deployed, and commit.

To add a translation: add it to `TRANSLATIONS` in `src/data/translations.ts` with its eBible.org id, run `npm run build:bible`, and commit the output. If a run would change files that are already published (eBible revises its texts), the script stops: bump `BIBLE_DATA_VERSION` so readers get the new files instead of their cached copies.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Yohannes33/biblica.git
cd biblica
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production & PWA
```bash
npm run build
npm run preview
```

---

## 📜 License

MIT License. Scripture texts are public domain: King James Version, Berean Standard Bible, and World English Bible (a trademark of eBible.org), sourced from [eBible.org](https://ebible.org).
