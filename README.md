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
- **Add any verse**: type a reference (`Romans 12:1-2`, `1 jn 4:19`, `ps 23:1–3`) and the text is looked up for you.

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
public/bible/v1/<KJV|BSB|WEB>/<USFM book code>.json   // string[][]: [chapter-1][verse-1] -> text
```

- Files are immutable for a data version (`BIBLE_DATA_VERSION` in `src/data/translations.ts`). Vercel serves them with a one-year `immutable` cache header (`vercel.json`), and the service worker caches each book the first time it is opened, so it then works offline.
- They are generated from the eBible.org USFM sources by `npm run build:bible` (needs Node 23.6+ and `unzip`). The script drops Psalm titles, headings and footnotes, checks every book's chapter count, and writes the built-in verses' text to `src/data/curatedText.json`. A verse a translation leaves out (the BSB omits verses missing from the oldest manuscripts, such as Matthew 17:21) is stored as `""`.
- Only translations that may be redistributed in full are included. NIV, ESV, NLT, NASB and NKJV need a publisher licence.

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
