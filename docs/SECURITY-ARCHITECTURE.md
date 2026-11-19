# Security architecture: Bible text and user data

Decision record, November 2026 (Biblica v1.0.0). Status: accepted.

## Context

Biblica is a static, offline-first PWA (Vite + React, deployed on Vercel). It has no server of its own. Two kinds of data matter:

| Data | Where it lives | Who may read it |
| --- | --- | --- |
| Bible text: KJV, BSB, WEB (66 books each), Amharic New Testament 1962 (27 books) | `public/bible/v1/<TR>/<BOOK>.json`, served by Vercel's CDN, cached by the service worker | Anyone. KJV, BSB and WEB are public domain; the Amharic text is published openly on eBible.org |
| Each user's profile, stats, verse progress and custom verses | The browser's `localStorage`; Supabase (`profiles`, `user_stats`, `verse_progress`, `custom_verses`) once signed in | Only that user |

A brief proposed for a sibling Next.js project asked for the Bible dataset to be encrypted (AES-256-GCM or XChaCha20-Poly1305, Argon2id/scrypt/HKDF keys), decrypted only on a server, served one chapter at a time with bot blocking, rate limits and `no-store`. This record explains which of that applies here.

## Decision 1: the Bible text stays plain, static and cacheable

We do **not** encrypt the Bible files.

- **Nothing secret to protect.** Three translations are public domain and the fourth is freely downloadable from its publisher's partner. The Amharic licence (United Bible Societies / Bible Society of Ethiopia) permits non-commercial use with the full copyright statement shown in the app (Settings → Bible texts), and commercial use with the Society's written permission. It asks for attribution, not secrecy.
- **Encryption in the browser protects nothing.** Whatever key decrypts the text has to reach the browser too, and the decrypted verse is on screen anyway. AEAD with AAD binding is the right tool for integrity of data at rest on a server or device; it does not stop a reader from copying what they are shown.
- **Server-only decryption would cost the core feature.** Serving chapters from a function with `Cache-Control: no-store` means no offline reading, no CDN caching (one function call per chapter), cold starts on a phone connection, and a server to run and pay for. Biblica's books download once and then work offline.
- **Anti-scraping only raises the cost.** Chapters must arrive readable, so a determined scraper still gets them by driving a real browser. User-agent and `Sec-Fetch-*` checks stop only naive scripts.

What we do instead:

- **Integrity through the build.** `scripts/build-bible.ts` builds the files from eBible.org's USFM sources and refuses to change already-published files unless `BIBLE_DATA_VERSION` is bumped or it is run with `--force`. It runs only through `npm run build:bible`, not in `npm run build` or on Vercel, so a hand edit to `public/bible/v1/*.json` would deploy unchecked, and devices that cached the old file would keep it. Change Bible files only through the script, with a version bump.
- **Immutable, versioned URLs.** `/bible/v1/...` files are served with `Cache-Control: public, max-age=31536000, immutable`.
- **Not indexed.** The same files carry `X-Robots-Tag: noindex, nofollow, noarchive`, so search engines don't list raw JSON (`vercel.json`).
- **Attribution.** Every translation's credit is in Settings → Bible texts.

**Revisit if** a publisher licence ever requires access control (for example a licensed modern Amharic or English translation). Then: serve that translation through a Vercel Function that checks the signed-in Supabase user, rate-limit it with the Vercel Firewall, and keep only that translation out of the public folder. A server-held key with HKDF-derived per-book subkeys and AES-256-GCM (AAD = translation, data version, book) is then the right shape, with Argon2id only if a key is ever derived from a password.

## Decision 2: user data is protected by Supabase auth and row-level security

- Every user table has row-level security enabled, with policies on `auth.uid()` so a user can read and write only their own rows (`supabase/schema.sql`).
- The browser holds only the Supabase URL and the anon key (`VITE_SUPABASE_*`), which are public by design. No service-role key exists in the app or the repo.
- Sign-in is Google OAuth or email and password through Supabase Auth. A rejected sign-in now shows an error instead of continuing (#43).
- Backups are a JSON download the user triggers; nothing is sent elsewhere.

## Decision 3: a future Android app reuses the same files

The PWA already installs on Android (and iOS) and works offline. If a Play Store app is wanted:

1. **Packaging.** Wrap the PWA as a Trusted Web Activity, which needs Digital Asset Links at `/.well-known/assetlinks.json` with the app's signing-certificate SHA-256. Alternatively, build a native app that ships the same JSON in `assets/` or imports it into Room. Add the asset-links file only once the app's signing certificate exists.
2. **No encryption for public-domain or openly published text**, for the same reasons as Decision 1. A key inside an APK can be recovered with jadx or Frida, so APK-embedded keys are obfuscation, not security.
3. **If a licensed text must be protected on device:** store it encrypted at rest (SQLCipher for a Room database, or Tink's streaming AEAD for files). Wrap the data key with a key held in the Android Keystore (StrongBox where available). Deliver the data key from a server only after a Play Integrity verdict confirms a genuine app and device. Never hardcode it. Use Tink or DataStore with Tink rather than Jetpack Security's `EncryptedSharedPreferences`, which Google has deprecated.
4. **Push reminders** would need a sender: Firebase Cloud Messaging for a native or TWA app, or Web Push with a small function for the PWA. Neither exists today.

## Out of scope today

An encrypted dataset, a server-side reading API, per-IP rate limiting, bot blocking, Web Push and TWA asset links were all deliberately left out. A server-side reading API (and decrypting only on a server) would end offline reading. Encrypting with a key shipped to the browser would protect nothing, as above. Rate limiting and bot blocking could be added at Vercel's firewall without a server, and would not affect offline reading, but there is no scraping problem to justify them yet. Web Push and asset links need a sender or an Android app that don't exist.
