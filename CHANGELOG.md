# Changelog

## v1.0.0 (2026-11-18)

First versioned release. Biblica now carries the whole Bible instead of a hand-picked list, and speaks Amharic.

### The whole Bible
- KJV, BSB (Berean Standard Bible) and WEB (World English Bible), all 66 books, bundled as static files and cached for offline use. NIV, ESV, NLT, NASB and NKJV were dropped: they can't be redistributed without a publisher licence. (#31)
- The Amharic New Testament (1962), used with the Bible Society of Ethiopia's permission for non-commercial use; its full copyright statement is in Settings → Bible texts. 857 verses lost or misnumbered in the digital source show as "not available yet". (#33)
- A review sheet and repair pipeline so a native reader can restore those verses; nothing goes live until confirmed. (#35)

### Getting started
- Onboarding: new users choose a Bible, then a first verse, either a popular one or any passage from the whole Bible. People who already practised skip it. (#37)
- A Bible browser (book, chapter, up to 10 verses) in onboarding and in the Library's new "Bible" view. (#37)

### Amharic
- Every built-in verse is in Amharic when አማርኛ is chosen: verses the Amharic New Testament lacks are swapped for New Testament verses on the same theme. (#38)
- The whole interface switches to Amharic with the Amharic Bible. The wording is a draft for a native reader to check (`src/i18n/`). (#40)
- Read-aloud and recitation in Amharic, with letters that sound alike scored as the same.

### Fixes
- A rejected sign-in or sign-up now says so instead of "Signed in.", and no sync starts. (#43)
- Switching Bible keeps the library's order and doesn't give a second day's worth of new cards. (#38)

### Earlier work (before versioning)
Fill-in, Cards with spaced repetition, Scramble and Trivia modes; recite-and-check and read-aloud; streaks, levels and badges; light and dark themes; Google and email sign-in with Supabase cloud sync; installable PWA.
