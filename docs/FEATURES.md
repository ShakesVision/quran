# Quran Hifz Helper — Complete Feature Inventory

> **Version**: 1.0.0  
> **Live**: https://quran.shakeeb.in  
> **Repository**: github.com/ShakesVision/quran  
> **Stack**: Angular 13 · Ionic 6 · TypeScript 4.5 · SCSS · PWA  
> **Author**: Shakeeb Ahmad

---

## Table of Contents

1. [Home Dashboard](#1-home-dashboard)
2. [Quran Reader](#2-quran-reader)
3. [Browse (Juz & Surah)](#3-browse-juz--surah)
4. [Discover (Ayah Reels)](#4-discover-ayah-reels)
5. [Tafseer / Translation Modal](#5-tafseer--translation-modal)
6. [Memorize (Hifz Tracker)](#6-memorize-hifz-tracker)
7. [Listen (Audio Player)](#7-listen-audio-player)
8. [Scanned Mushaf Viewer](#8-scanned-mushaf-viewer)
9. [Tajweed Highlighting Engine](#9-tajweed-highlighting-engine)
10. [Morphology Service](#10-morphology-service)
11. [Data Sources & Caching](#11-data-sources--caching)
12. [PWA & Offline Capabilities](#12-pwa--offline-capabilities)
13. [Themes & Customization](#13-themes--customization)
14. [Gamification & Psychology](#14-gamification--psychology)
15. [Accessibility & UX](#15-accessibility--ux)

---

## 1. Home Dashboard

**Route**: `/`

### Features
- **Hero Banner Slideshow**: Rotating promotional banners fetched from a remote JSON endpoint. Supports multiple banners with auto-rotation, dot indicators, and configurable click actions (open internal routes or external URLs). Banners can include custom HTML text, images, and action buttons.
- **Dark Mode Toggle**: Instantly switch between light and dark themes (persisted in storage).
- **Feature Grid ("Read & Learn")**:
  - **Full Quran**: Quick-open to last-used mushaf; dropdown to choose mushaf source.
  - **Browse**: Jump to Juz/Surah grid selector.
  - **Scanned**: Open scanned mushaf image viewer.
  - **Listen**: Audio recitation player.
  - **Memorize**: Hifz tracking and spaced repetition.
- **Discover Section**: Prominent card linking to Instagram-reels-style ayah viewer.
- **Daily Targets**:
  - Configurable tilawat (pages) and hifz (ayahs) daily targets.
  - Circular progress rings showing daily completion.
  - Khatm projection: User sets number of khatm completions and target days.
  - Weekly heatmap showing 7-day activity (dot intensity based on pages read).
  - Day streak counter with flame icon.
  - Tap-to-log: Click target cards to log pages/ayahs via alert input.
- **Gamification Section**:
  - 10-level system (Beginner → Master) based on total pages read.
  - Level progress bar with percentage.
  - Achievement badges (First Steps, Week Warrior, Century, Devoted Reader, etc.).
  - Achievement unlock popup notifications.
  - Motivational quotes (Islamic and inspirational).
- **Tools Section**: Download, Translation (legacy), Progress tracker.
- **Footer**: Help, About, Feedback (Telegram), Attribution link.
- **Mushaf Source Selector**: Choose from archive-15, archive-16, qurancom-15, qurancom-16 text sources.

---

## 2. Quran Reader

**Routes**: `/quran`, `/quran/page/:page`, `/juz/:id`, `/juz/:id/ruku/:ruku`, `/surah/:id`, `/surah/:id/ayah/:ayah`

### Core Reading
- **Multi-mode Navigation**: Full Mushaf (611 pages), Juz mode (30 juz), Surah mode (114 surahs).
- **Swipe Navigation**: Horizontal swipe gestures for page-turning (RTL: swipe right = next page).
- **Page Navigation Controls**: Previous/next buttons, page number input, font size +/- buttons in bottom toolbar.
- **Footer Overflow Menu**: First page/last page jump buttons in a popover (protected from accidental taps).
- **Immersive Mode**: Toggle to hide toolbars for distraction-free reading (accessible from top toolbar and settings).
- **Auto-Bookmark**: Automatically saves current page position; restores on next visit.
- **Manual Bookmarks**: Long-press a line → "Add Bookmark" with optional notes. Bookmarks organized in folders. Bookmark drawer accessible from toolbar.
- **Full-Text Search**: Search across all pages with highlighted results. Search modal with keyboard-friendly interface.

### Text Display
- **Multi-Source Text**: 4 sources — archive-15, archive-16, qurancom-15, qurancom-16. Each with exclusive font pairing.
- **Tatweel (Kashida) Justification**: Automatic Arabic text stretching for justified alignment. Smart exceptions for:
  - **Lam-Alef**: No tatweel between Lam and Alef.
  - **Allah Ligature**: Protected for archive text to preserve tashdeed and khada zabar.
  - **Hamzah**: No tatweel after hamzah character.
  - **Non-joining letters**: Alef, Waw, Dal, etc.
- **Flicker Prevention**: Text hidden during tatweel application, revealed only after processing.
- **Scan View Toggle**: Switch between Unicode text and scanned Archive.org page images with pinch-zoom.
- **Font Size Control**: Adjustable font size from sidebar and bottom toolbar. Auto-fit capability.
- **Line Numbering**: Each line shows its position for reference.

### Indicators & Marks
- **Ruku Marks (ع)**: Detected from text (archive) or metadata (qurancom). Displayed as decorated margin indicators with ayah count overlay.
- **Sajdah Marks (۩)**: Visual indicator for sajdah-required ayahs.
- **Waqf Lazim Marks**: Detected and highlighted.
- **Page Header Info**: Current Juz number, page number (Arabic numerals), Surah name.

### Inline Features
- **Tajweed Highlighting**: Offline color-coded tajweed rules (ghunna, ikhfa, idgham, iqlab, qalqalah, madd variants). Customizable colors. Legend display.
- **Inline Translation**: Shows English or Urdu translation below each line. Fetched from Quran.com API by verse range.
- **Word-by-Word**: Shows Arabic word with English translation/transliteration pairs. Fetched from Quran.com API.
- **Text Selection Mode**: Long-press context menu option to enable native text selection across lines.

### Audio
- **Verse Audio Playback**: Play audio for individual ayahs via Quran.com CDN.
- **Qari Selection**: 10 hardcoded popular reciters (alphabetically sorted) as fallback; API-fetched full list when available. Interface: action sheet.
- **Playback Speed**: Adjustable audio speed.

### Reader Settings (Sidebar Popover)
- Quick toggles: Immersive, Translate, Inline, Tajweed.
- Tajweed legend with customizable colors (color picker per rule).
- Font size controls.
- Tatweel toggle.
- Word-by-word toggle.
- Inline translation language selector (English/Urdu).
- Theme selector grid (10 themes).
- Custom background color/gradient/image CSS input.
- Custom text color input.
- Qari selector.
- Mushaf source selector.

---

## 3. Browse (Juz & Surah)

**Route**: `/browse`

### Features
- **Segmented View**: Toggle between Juz list and Surah list (ion-segment).
- **Juz Grid**: 30 juz cards showing juz number, first surah, page range.
- **Surah List**: 114 surahs with Arabic name, English name, ayah count, revelation type.
- **Quick Navigation**: Tap any juz/surah → opens reader at that position.
- **Deep Link Support**: `?tab=surah` query param to open directly on Surah tab (used by Memorize page "Browse Surahs" link).

---

## 4. Discover (Ayah Reels)

**Route**: `/discover`

### Features
- **Instagram Reels UX**: Full-screen, vertically swipeable ayah cards with smooth transitions.
- **Beautiful Card Designs**: Each card has unique gradient backgrounds, geometric patterns, accent colors. Text adapts to light/dark depending on background.
- **Surah Badge**: Shows English name, Arabic name, and verse key on each card.
- **Dual Translation**: Arabic text + Urdu translation + English translation on every card.
- **Translation Settings**: Configurable English and Urdu translator selection (all API-available translations shown).
- **Action Bar**:
  - **Share**: Copy ayah text (Arabic + translations) to clipboard with watermark.
  - **Read in Context**: Navigate to the ayah's surah in the reader.
  - **Translation Settings**: Open settings panel.
- **Keyboard Navigation**: Arrow keys for desktop browsing.
- **Pre-loading Buffer**: Cards pre-loaded ahead for smooth scrolling.
- **Loading & Empty States**: Graceful loading spinner and fallback UI.
- **Scroll Hint**: "Swipe up" prompt on first card.

---

## 5. Tafseer / Translation Modal

**Trigger**: Tap any ayah line in reader → opens bottom-sheet modal.

### Features
- **Arabic Ayah Card**: Full Arabic text with individual word display (`inline-block` per word). Tap any word to hear its pronunciation.
- **Word-by-Word Section**: Collapsible table immediately after Arabic card showing Arabic word, transliteration, and English meaning for each word. Tap to play audio.
- **Multiple Translations**: Loaded from Quran.com API. Each displayed in a colored, collapsible block with:
  - Language label (English/Urdu).
  - Expand/collapse chevron.
  - Color-coded accent bar (deterministic by language).
  - Known translation icon.
- **Translation Ordering**: Config mode to reorder translations via up/down buttons or numeric priority input.
- **Translation Visibility**: Toggle show/hide per translation (persisted to storage).
- **Tafsir Section**: Load Ibn Kathir (Arabic/Urdu) and Ma'arif ul Quran (English) on demand from CDN.
- **Navigation**: Next/previous ayah buttons, direct ayah key jump input.
- **Swipe Gestures**: Horizontal swipe to navigate between ayahs (right = next, left = previous in RTL).
- **Back Button Handling**: Hardware/browser back button dismisses modal (not app).
- **External Link**: Open on tafsir.app for comprehensive commentary.
- **Verse Audio**: Built-in audio player for the current verse.

---

## 6. Memorize (Hifz Tracker)

**Route**: `/memorize`

### Features
- **Dual Tracking**: Track memorization progress by Juz (30 items) or by Surah (114 items).
- **Progress Input**: Modal to set completed pages/ayahs per juz/surah.
- **Completion Animation**: Confetti celebration on 100% completion.
- **Recommended Chapters**: Quick access to commonly memorized surahs (Fatiha, Yaseen, Rahman, Waqiah, Mulk, Kahf).
- **Spaced Repetition**: Review scheduling based on Ebbinghaus forgetting curve. Intervals increase with each successful review (1, 3, 7, 14, 30, 60 days).
- **Due for Review**: Section showing items that are due for review today.
- **Review Heatmap**: 7-day activity grid showing review activity per day.
- **Mastery Categories**: Items classified as New, Learning, Reviewing, Mastered based on spaced repetition state.
- **Gamification**:
  - Streak counter.
  - Overall progress ring.
  - Motivational quotes (Islamic hadith and encouragement).
  - Badge system.
- **Browse Surahs Link**: Quick link to Browse page (Surah tab).
- **Progress Tracking**: All data persisted in IndexedDB via Ionic Storage.

---

## 7. Listen (Audio Player)

**Route**: `/listen`

### Features
- **Surah List**: All 114 surahs displayed with Arabic name, English name, ayah count.
- **Search**: Filter surahs by name.
- **Audio Playback**: Tap any surah to play complete surah recitation.
- **Now Playing**: Displays currently playing surah with audio controls.
- **Qari Selection**: Dropdown with 10 hardcoded popular reciters (API fallback). Sorted alphabetically with ID shown.
- **Continuous Playback**: Audio element always present in DOM for uninterrupted playback.
- **Error Handling**: Graceful null-safe audio operations.

---

## 8. Scanned Mushaf Viewer

**Route**: `/scanned`, `/scanned/page/:page`

### Features
- **Multi-Source Scanned Images**: 7 different scanned Quran sources from Archive.org:
  1. 15-Line Saudi Mushaf (611 pages) — with juz/surah jump controls.
  2. 16-Line Darussalam (548 pages).
  3. 13-Line Taj Company (850 pages).
  4. 16-Line Taj Company (548 pages).
  5. 17-Line Taj Company (520 pages).
  6. 18-Line Taj Company (490 pages).
  7. 21-Line Taj Company (370 pages).
- **Source Selector**: Dropdown to switch between scanned sources.
- **Pinch-Zoom**: Two-finger zoom on scanned page images.
- **Navigation Controls**: Previous/next page buttons, page number input.
- **Conditional Controls**: Juz/Surah jump buttons only shown for 15-line Saudi source (which has known page-to-juz/surah mappings).
- **Image Quality**: Configurable image quality.
- **Bookmark Support**: Save current page position.

---

## 9. Tajweed Highlighting Engine

**Library**: `src/app/lib/tajweed/`

### Features
- **Fully Offline**: No API calls; all rules processed client-side on Arabic text.
- **Rules Implemented**:
  - Ghunnah (غنہ) — Green
  - Ikhfa (اخفا) — Gold/Yellow
  - Idgham with Ghunnah (ادغام) — Green
  - Idgham without Ghunnah — Gray
  - Iqlab (اقلاب) — Green
  - Qalqalah (قلقلہ) — Blue
  - Meem Ikhfa (اخفا شفوی) — Gold/Yellow
  - Meem Idgham (ادغام شفوی) — Green
  - Madd Long/مد لازم (6 harakaat) — Dark Red
  - Madd Munfassil/Muttassil (4-5 harakaat) — Red
  - Madd Sukoon (2-6 harakaat) — Orange
  - Madd Sila — Amber
- **Safe Text Handling**: Original Arabic text is NEVER modified. Only wrapped in `<span>` tags.
- **Mode**: Class-based (`<span class="tj-ghunna">`) or inline style.
- **Caching**: Per-page tajweed results cached in memory.
- **Customizable Colors**: Users can customize colors for each rule via color pickers in reader settings. Custom palettes saved to storage. Dark mode has separate default palette.
- **Legend Display**: Visual legend showing all active rules with color dots.

---

## 10. Morphology Service

**Service**: `src/app/services/morphology.service.ts`

### Features
- **Offline Arabic Morphology**: Per-surah JSON data from corpus.quran.com.
- **Word Analysis**: Root letter, lemma, part of speech, grammatical features.
- **Integration**: Tap any word in tafseer modal → morphology popup.
- **114 Surah Files**: Loaded lazily on demand.

---

## 11. Data Sources & Caching

### Text Sources
| Source | Lines | Font | Data Origin |
|--------|-------|------|-------------|
| archive-15 | 15/page | Muhammadi | GitHub raw files |
| archive-16 | 16/page | Muhammadi | GitHub raw files |
| qurancom-15 | 15/page | IndoPak Waqf Lazim | Quran.com API (mushaf=6) |
| qurancom-16 | 16/page | IndoPak Waqf Lazim | Quran.com API (mushaf=7) |

### Caching Strategy
- **IndexedDB**: Full Quran text cached per source. Translations cached. Settings persisted.
- **Service Worker** (ngsw-config.json):
  - App shell: prefetch (always latest).
  - Assets & fonts: prefetch.
  - Morphology JSON: lazy load.
  - Ionicons CDN: performance cache (90 days).
  - Quran archive text: performance cache (30 days).
  - Quran.com API: freshness first (30 day fallback).
  - Audio CDN: performance cache (90 days).
  - Archive.org images: freshness first (7 days).

---

## 12. PWA & Offline Capabilities

### Installation
- **PWA Install**: Browser "Add to Home Screen" or install prompt.
- **Standalone Mode**: Runs as native app with no browser chrome.
- **Portrait Lock**: Orientation locked to portrait.
- **PWA Shortcuts**: Long-press app icon shows:
  - Read (Full Quran) — custom SVG icon.
  - Browse (Juz & Surah) — custom SVG icon.
  - Discover — custom SVG icon.
  - Memorize — custom SVG icon.

### Offline Support
- Core reading works fully offline after initial data download.
- Tajweed, morphology, and text rendering are all client-side.
- Audio requires network (CDN-based).
- Translations may require network for non-cached ones.

---

## 13. Themes & Customization

### Reader Themes (10 Built-in)
| Theme | Background | Text | Accent |
|-------|-----------|------|--------|
| Golden | #FDF5E6 | #2C1810 | #C9A227 |
| Paper | #FFF9F0 | #1A1A1A | #8B7355 |
| Ivory | #FFFFF0 | #1C1C1C | #A0855B |
| Sage | #F0F4ED | #1B2E1B | #6B8E6B |
| Ocean | #EDF4F8 | #0D2137 | #3A7CA5 |
| Lavender | #F3EFF8 | #2D1B4E | #7B5EA7 |
| Rose | #FFF0F3 | #3B1A24 | #C75C7A |
| Midnight | #1A1A2E | #E0E0E0 | #4A90D9 |
| Charcoal | #2D2D2D | #DADADA | #8BBABB |
| Sepia | #F5EDDF | #3E2723 | #A1887F |

### Custom CSS Inputs
- Background: Any CSS value (color, gradient, `url()` for images).
- Text color: Any CSS color value.

### Dark Mode
- Global dark mode toggle (persisted).
- All components adapt to dark palette.
- Tajweed colors have dedicated dark mode palette.

---

## 14. Gamification & Psychology

### Level System (Mastery Curve)
Uses logarithmic progression — early levels easy (immediate reward), later levels require sustained effort.

| Level | Pages | Title | Icon |
|-------|-------|-------|------|
| 1 | 0 | Beginner | 🌱 |
| 2 | 20 | Seeker | 🔍 |
| 3 | 100 | Reader | 📖 |
| 4 | 300 | Devoted | 💫 |
| 5 | 604 | Khatm Complete | 🏆 |
| 6 | 1208 | Double Khatm | ⭐ |
| 7 | 1812 | Triple Khatm | 🌟 |
| 8 | 3000 | Hafiz Path | 👑 |
| 9 | 5000 | Scholar | 🎓 |
| 10 | 10000 | Master | 💎 |

### Achievements
- First Steps, Week Warrior, Century, Devoted Reader, Khatm Complete, Night Owl, and more.
- Variable-ratio reinforcement: some achievements are hidden/surprise unlocks.
- Unlock popup notifications with icons.

### Psychological Principles
- **Immediate Rewards**: Easy early levels for instant gratification.
- **Streak Motivation**: Daily streak counter with visual flame.
- **Social Proof**: Motivational Islamic quotes and hadith.
- **Variable Rewards**: Hidden achievements for surprise dopamine hits.
- **Progress Visualization**: Rings, bars, heatmaps for visible progress.

---

## 15. Accessibility & UX

### Navigation
- **URL-based routing**: All routes are refresh-safe and shareable.
- **Back button handling**: Universal — modals/popovers dismiss on back (not app).
- **Swipe gestures**: Reader pages, Discover cards, Tafseer modal ayah navigation.

### Performance
- **Lazy Loading**: All page modules loaded on demand.
- **Preload Strategy**: PreloadAllModules for smooth navigation after initial load.
- **Font Display Swap**: All custom fonts use `font-display: swap`.
- **Image Optimization**: Archive.org images loaded with quality settings.

### Responsive Design
- Optimized for mobile-first (portrait orientation).
- Touch-friendly targets (min 44px tap areas).
- Safe area insets for notched devices.

### Fonts
| Font | Usage |
|------|-------|
| Muhammadi Quranic | Archive text (ar2 class) |
| IndoPak Waqf Lazim v4.2.1 | Quran.com text (ar-qurancom class) |
| Uthmanic Hafs v18 | Uthmani text |
| Mehr | Urdu translations |
| Indopak (QuranWBW) | Secondary Arabic |

---

*Document generated: February 2026*
*App version: 1.0.0*

