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

### 5. 📚 Scripture Library & Custom Verses
- Curated collection across thematic categories:
  - *Essential Classics*, *Peace & Anxiety*, *Strength & Courage*, *Love & Kindness*, *Faith & Salvation*, *Wisdom & Guidance*, *Hope & Comfort*.
- **Add Custom Verse**: Add any translation (KJV, NIV, ESV, NLT) and verse of your choice with automatic deck persistence.

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

MIT License. Public domain scripture texts (KJV).
