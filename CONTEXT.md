# Quran Hifz Helper — Full App Context

> **Live**: https://quran.shakeeb.in  
> **Repo**: github.com/ShakesVision/quran  
> **Author**: Shakeeb Ahmad  
> **Stack**: Angular 13 · Ionic 6 · TypeScript 4.5 · SCSS · PWA  
> **Deploy**: GitHub Pages (auto-deploy from `master`); rollback tag `pre-ramadan-2026-merge` → `af157a7`

---

## Architecture Overview

### Tech Stack
- **Framework**: Angular 13 + Ionic 6 (standalone PWA, no Capacitor runtime)
- **State**: `BehaviorSubject`/`Observable` in services, `@ionic/storage-angular` (IndexedDB) for persistence
- **Service Worker**: `@angular/service-worker` with `ngsw-config.json` — caches app shell, fonts, icons, API responses, audio CDN
- **Build**: `ng build --prod` → `www/` output → GitHub Pages
- **Node**: v16.17.0 (via nvm)

### Project Structure
```
src/app/
├── home/                  # Dashboard (home.page.*)
├── pages/
│   ├── read/              # Main Quran reader (read.page.* — ~3400 lines TS)
│   ├── discover/          # Instagram-reels-style ayah cards (discover.page.*)
│   ├── memorize/          # Hifz tracker with gamification (memorize.page.*)
│   ├── juz/               # Browse/selector grid for Juz & Surah (juz.page.*)
│   ├── scanned/           # Scanned mushaf image viewer (scanned.page.*)
│   ├── listen/            # Audio player page (listen.page.*)
│   ├── progress/          # Reading progress tracker (progress.page.*)
│   ├── surah/             # Surah list (legacy)
│   └── surah-details/     # Surah detail (legacy)
├── components/
│   └── tafseer-modal.*    # Ayah translation/tafseer modal with word-by-word
├── services/
│   ├── quran-data.service.ts  # Central data service (~1160 lines) — multi-source loading, caching, text building
│   ├── surah.service.ts       # Utility: Arabic numbers, diacritics, surah names, toasts
│   ├── morphology.service.ts  # Offline Arabic morphology (corpus.quran.com data)
│   └── app-data.service.ts    # App-level data (export/import)
├── models/
│   ├── text-sources.ts     # TextSource, QuranComWord, QuranComVerse interfaces
│   ├── common.ts           # Search, RukuLocationItem, etc.
│   ├── bookmarks.ts        # Bookmark model
│   ├── ayah-card.ts        # Discover card model
│   ├── mushaf-versions.ts  # MushafLines enum
│   └── app-data.ts         # App data model
├── lib/tajweed/            # Offline tajweed highlighting engine
│   ├── characters.ts       # Unicode constants (SUKUN=0x0652, SHADDA, etc.)
│   ├── rules.ts            # Idgham, Ikhfa, Iqlab, Qalqala, Ghunna, Madd rules
│   ├── models.ts           # TajweedMatch, TajweedRule interfaces
│   └── index.ts            # applyTajweed() entry point
└── guard/route.guard.ts    # Route guard
```

### Key Data Files (in `src/assets/`)
- `assets/fonts/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2` — for Quran.com IndoPak text
- `assets/fonts/UthmanicHafs1Ver18.woff2` — for Uthmani text
- `assets/data/morphology/{1-114}.json` — offline morphology per surah
- `assets/paper-texture-light.svg`, `assets/paper-texture-dark.svg` — reader backgrounds

---

## Routes (URL-based, refresh-safe)

| Route | Mode | Description |
|-------|------|-------------|
| `/` | — | Home dashboard |
| `/quran` | full | Full Quran reader |
| `/quran/page/:page` | full | Jump to specific page |
| `/juz/:id` | juz | Read specific Juz (1–30) |
| `/juz/:id/ruku/:ruku` | juz | Juz at specific ruku |
| `/surah/:id` | surah | Read specific Surah |
| `/surah/:id/ayah/:ayah` | surah | Jump to specific ayah |
| `/browse` | — | Juz/Surah grid selector |
| `/discover` | — | Swipeable ayah cards |
| `/memorize` | — | Hifz tracker |
| `/listen` | — | Audio player |
| `/scanned` | — | Scanned mushaf images from Archive.org |
| `/progress` | — | Reading progress |

---

## Multi-Source Text System

### Sources (user-selectable in reader settings)
1. **archive-15** (default): 15-line IndoPak from GitHub archive, font: Muhammadi (`ar2` CSS class)
2. **archive-16**: 16-line IndoPak from GitHub archive, font: Muhammadi
3. **qurancom-15**: 15-line IndoPak from Quran.com API (mushaf=6), font: IndoPak Waqf Lazim (`ar-qurancom` CSS class)
4. **qurancom-16**: 16-line IndoPak from Quran.com API (mushaf=7), font: IndoPak Waqf Lazim

### Data Flow (QuranDataService)
- `loadFullQuran(source)` → fetches all 114 surahs → builds pages from word-level data
- `buildQuranComText()` → iterates `verses[].words[]`, assembles text per `page_number:line_number`
  - Uses `word.text` for rendering (preserves original API text — **never manipulate API text**)
  - Collects metadata: `quranComRukuPositions[]` and `quranComAyahMap` (Map<pageIndex, {line, surah, ayah}[]>)
- `pickQuranComWordText(word, source)` → selects correct text field per source
- Page index mapping: `quranComPageIndexByNumber` Map<mushafPageNum, arrayIndex>
- Caching: IndexedDB via `@ionic/storage-angular`, keyed by source ID

### Font Pairing (CRITICAL)
| Source | Font | CSS Class |
|--------|------|-----------|
| archive-15, archive-16 | Muhammadi Quranic (local) | `ar2` |
| qurancom-15, qurancom-16 | IndoPak Nastaleeq Waqf Lazim v4.2.1 | `ar-qurancom` |
| uthmani | UthmanicHafs1Ver18 | `ar-uthmani` |

---

## Reader Page (read.page.ts — ~3400 lines)

### Core Features
- **Page navigation**: Swipe gestures (Hammer.js via Ionic), arrow buttons, page number input
- **Multi-mode**: Full mushaf, Juz, Surah — determined by route `data.mode`
- **Scan View toggle**: Loads Archive.org scanned page images via pinch-zoom
- **Text justification**: Tatweel (kashida) insertion for Arabic text (`enableTatweel` flag, `applyTatweel()` method)
- **Font size auto-adjustment**: `adjustFontSize()` to fit text within page width
- **Bookmarks**: Auto-bookmark (last page), manual bookmarks with notes
- **Search**: Full-text search across all pages with result highlighting

### Indicators (Margin Marks)
- **Ruku marks**: For archive — detected via `ۧ` in text. For Quran.com — detected via `_quranComRukuLineSet` (Set of `"pageNum:lineIndex"` from metadata)
- **Sajdah marks**: Detected via `۩` in text
- **Waqf Lazim marks**: Detected via `\u06D8` in text
- **Ruku ayah count**: Shown inside ruku wrapper, CSS: `position: absolute; top: 5px; font-size: small;`
- `hasIndicator(line, lineIndex)` method checks all three for correct source

### Ayah Detection (Quran.com vs Archive)
- **Quran.com**: Uses `quranComAyahMap` metadata (line→surah:ayah mapping per page)
- **Archive**: Text scanning for `۝` + Arabic number pattern
- Methods: `getNextAyahNumberFromCurrentLine()`, `getCorrectedSurahNumberWithRespectTo()`, `getFirstAndLastAyahNumberOnPage()`, `getAyahCountForRuku()`

### Translation & Word-by-Word
- **Ayah click** → opens `TafseerModalComponent` with multiple configurable translations
- **Inline translation mode** (`inlineTransMode`): Shows translation below each line
- **Word-by-word mode** (`wbwMode`): Shows Arabic word + English translation pairs
- **Tajweed mode** (`tajweedMode`): Highlights tajweed rules with color coding

### Reader Themes (10 themes)
golden, paper, ivory, sage, ocean, lavender, rose, midnight, charcoal, sepia — applied via CSS variables on `.content-wrapper`

### Reader Customization
- Background color/gradient/image inputs (CSS `background` property — **these must exist, do not remove**)
- Text color input
- Theme selector grid
- Immersive/fullscreen mode toggle

---

## Tafseer Modal (tafseer-modal.ts)

- **Bottom toolbar** (not top — for thumb accessibility)
- **Multiple translations**: Loaded from Quran.com API, configurable in settings
- **Translation ordering**: Drag reorder via up/down buttons + priority number input
- **Translation visibility**: Toggle show/hide per translation
- **Word-by-word display**: Arabic word + transliteration + English meaning
- **Morphology integration**: Tap a word → shows root, lemma, POS tag from offline data
- **Navigation**: Next/prev ayah buttons, direct ayah jump input

---

## Discover Page (discover.page.ts)

- Instagram Reels-style vertical swipeable ayah cards
- Random ayah selection with beautiful themed cards
- **Configurable translations**: User selects preferred Urdu + English translators from full API list
- **Share as image**: html2canvas screenshot capability
- **Open in reader**: Navigates to `/surah/:id/ayah/:ayah` with highlight
- **Surah name display**: English name left, Arabic name right
- **Decorative brackets**: `﴾` / `﴿` as `::before`/`::after` pseudo-elements (inline, not block)

---

## Home Page (home.page.ts)

- Hero banner with resume reading
- Feature grid: Read Quran, Browse, Discover, Memorize, Listen, Scanned
- **Targets section**: Daily tilawat (pages) and hifz (lines) progress with progress bars
- **Log Progress** button → alert with inputs
- Source selector for mushaf version
- Ramadan countdown/information

---

## Memorize Page (memorize.page.ts)

- Juz + Surah memorization tracking
- **Spaced repetition**: Review scheduling based on Ebbinghaus forgetting curve
- **Review heatmap**: Activity visualization
- **Mastery levels**: Tracking per-item mastery (new → learning → reviewing → mastered)
- **Gamification**: Badges, streaks, progress rings, level system
- **Due for Review** section at top

---

## Scanned Page Reader (scanned.page.ts)

- Loads scanned mushaf images from Archive.org (15-line Saudi print)
- Pinch-zoom support
- Header: Surah jump, Juz jump with section (¼, ½, ¾), image quality selector
- Footer: Page navigation (prev/next/input)
- **Known issues**: Needs UX modernization, performance improvements, better error handling

---

## PWA Configuration

### manifest.webmanifest
- name: "Quran: Hifz Helper", short_name: "Quran Hifz"
- display: standalone, orientation: portrait
- Icons: 72, 96, 128, 144, 152, 192, 384, 512 (maskable + any)
- Shortcuts: Full Quran, Browse, Discover, Memorize

### ngsw-config.json Cache Strategy
| Group | Strategy | Max Age | Content |
|-------|----------|---------|---------|
| app (shell) | prefetch | — | HTML, CSS, JS |
| assets | prefetch | — | Images, fonts, SVGs |
| morphology | lazy | — | 114 morphology JSONs |
| ionicons | performance | 90d | CDN SVG icons |
| quran-archive | performance | 30d | GitHub raw text files |
| quran-api | freshness | 30d | Quran.com API responses |
| audio-cdn | performance | 90d | Audio files |
| archive-org | freshness | 7d | Scanned page metadata |

### index.html PWA Meta Tags
- apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style (black-translucent)
- theme-color for light (#055533) and dark (#0f588c)
- Preconnect: raw.githubusercontent.com, unpkg.com; DNS-prefetch: api.quran.com, verses.quran.com

---

## Key Services

### SurahService (surah.service.ts)
- `surahNames[]`: All 114 Arabic surah names
- `e2a(num)` / `a2e(num)`: English↔Arabic number conversion
- `diacritics`: Constants for BISM, AYAH_MARK (۝), RUKU_MARK (ۧ), SAJDAH_MARK (۩)
- `getPaddedNumber()`, `presentToastWithOptions()`
- `surahPageNumbers[]`, `juzPageNumbers[]`: Page mappings for 15-line mushaf

### MorphologyService (morphology.service.ts)
- Loads offline per-surah JSON from `assets/data/morphology/`
- `getMorphology(surah, ayah, word)` → returns root, lemma, POS, features
- Data sourced from corpus.quran.com

### AppDataService (app-data.service.ts)
- Export/import all app data (bookmarks, settings, progress)
- JSON serialization

---

## Known Issues / Pending Work

1. **Word-by-word, Tajweed, Inline translation**: Buttons exist but may not work fully on both archive and qurancom sources — needs testing and fixing
2. **Scanned page reader**: Needs UX modernization (better navigation, loading states, error handling, responsive design)
3. **Discover watermark**: "quran.shakeeb.in" watermark for share/screenshot not yet implemented
4. **Share button visibility**: 3 action buttons should optionally hide during screenshot
5. **Targets**: Ramadan date calculation needs fixing (should use English dates), khatam count should be user-configurable
6. **Reader bg/color inputs**: Custom background color, gradient, and image CSS inputs existed previously — **must not be removed** when adding themes
7. **Gamification depth**: Psychology-based gamification (variable rewards, social comparison, achievement system) needs deeper implementation

---

## Critical Rules (NEVER Violate)

1. **NEVER manipulate API text** — `word.text` from Quran.com API must be used as-is. Ruku/ayah detection should use metadata, not text modification.
2. **NEVER remove existing features** when adding new ones — always add alongside. Ask before replacing.
3. **Font pairing is exclusive** — Muhammadi for archive, Waqf Lazim for qurancom, UthmanicHafs for uthmani. Mixing causes rendering issues.
4. **Master auto-deploys** — always tag before merge for rollback safety.
5. **Offline-first** — all core reading functionality must work without network.

---

## Git Info

- **Branch**: `feature/ramadan-2026-modernization` (active development)
- **Master**: Auto-deploys to https://quran.shakeeb.in
- **Rollback tag**: `pre-ramadan-2026-merge` → commit `af157a7`
- **Rollback command**: `git checkout master && git revert <merge-commit> --no-edit && git push origin master`

