# Quran Hifz Helper — Play Store Launch Guide

> **App Name**: Quran Hifz Helper  
> **Package Name**: `in.shakeeb.quran.twa` (or your chosen package)  
> **Developer**: Shakeeb Ahmad  
> **Category**: Education / Books & Reference  
> **Target**: Android 5.0+ (API 21+)

---

## Table of Contents

1. [Overview: PWA → Android App](#1-overview-pwa--android-app)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Generate Digital Asset Links](#3-step-1-generate-digital-asset-links)
4. [Step 2: Create the TWA Wrapper](#4-step-2-create-the-twa-wrapper)
5. [Step 3: Configure the Android Project](#5-step-3-configure-the-android-project)
6. [Step 4: Build & Sign the APK/AAB](#6-step-4-build--sign-the-apkaab)
7. [Step 5: Google Play Console Setup](#7-step-5-google-play-console-setup)
8. [Step 6: Store Listing Content](#8-step-6-store-listing-content)
9. [Step 7: Upload & Submit for Review](#9-step-7-upload--submit-for-review)
10. [Step 8: Post-Launch](#10-step-8-post-launch)
11. [Alternative: Using PWABuilder](#11-alternative-using-pwabuilder)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview: PWA → Android App

Since Quran Hifz Helper is a **Progressive Web App (PWA)**, we can wrap it as an Android app using **Trusted Web Activity (TWA)**. This means:

- ✅ **No code changes needed** to the web app itself.
- ✅ The Android app loads the PWA in a full-screen Chrome Custom Tab (no browser UI).
- ✅ Updates to the web app are instantly reflected in the Android app.
- ✅ Service worker and offline capabilities work exactly the same.
- ✅ Meets Play Store requirements for apps.

**Key Advantage**: You ship updates via your web deployment, not through the Play Store review process. The Android wrapper just needs to be published once.

---

## 2. Prerequisites

### Accounts & Tools
- [ ] **Google Play Developer Account** ($25 one-time fee) — https://play.google.com/console
- [ ] **Android Studio** installed (for building AAB) — https://developer.android.com/studio
- [ ] **Java JDK 11+** (bundled with Android Studio)
- [ ] **Node.js 16+** and npm (for PWABuilder CLI or Bubblewrap)

### PWA Requirements ✅
Your PWA must meet these criteria (Quran Hifz Helper already does):
- [x] Valid `manifest.webmanifest` with name, icons, start_url, display: standalone
- [x] Service worker registered and caching app shell
- [x] HTTPS (quran.shakeeb.in uses HTTPS)
- [x] App icons: 192×192 and 512×512 (maskable + any purpose)
- [x] Lighthouse PWA score > 90

### Signing Key
You will need a **keystore** for signing the APK/AAB. This key is permanent — you can never change it after publishing.

```bash
# Generate a new keystore (do this ONCE, save the keystore file securely!)
keytool -genkeypair -v \
  -keystore quran-hifz-helper.keystore \
  -alias quran-release \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Shakeeb Ahmad, O=ShakesVision, L=City, ST=State, C=IN"
```

⚠️ **CRITICAL**: Back up the keystore file and passwords in multiple secure locations. If lost, you cannot update the app.

---

## 3. Step 1: Generate Digital Asset Links

Digital Asset Links prove you own both the website and the Android app. This is required for TWA to display without the browser URL bar.

### Get Your SHA-256 Fingerprint

```bash
keytool -list -v -keystore quran-hifz-helper.keystore -alias quran-release
```

Copy the **SHA-256 fingerprint** (looks like: `14:6D:E9:...`).

### Create `assetlinks.json`

Create this file and host it at `https://quran.shakeeb.in/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.shakeeb.quran.twa",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

### Deploy assetlinks.json

Since the app deploys to GitHub Pages, add the file to:
```
src/assets/.well-known/assetlinks.json
```

And update `angular.json` to include it in the build output:
```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  { "glob": "assetlinks.json", "input": "src/assets/.well-known", "output": "/.well-known" }
]
```

Verify it's accessible at `https://quran.shakeeb.in/.well-known/assetlinks.json`.

---

## 4. Step 2: Create the TWA Wrapper

### Option A: Using Bubblewrap (Recommended)

```bash
# Install Bubblewrap globally
npm install -g @nicedoc/bubblewrap

# Initialize a new TWA project
bubblewrap init --manifest="https://quran.shakeeb.in/manifest.webmanifest"
```

Bubblewrap will ask you to configure:
- **Package name**: `in.shakeeb.quran.twa`
- **App name**: `Quran Hifz Helper`
- **Short name**: `Quran Hifz`
- **Start URL**: `https://quran.shakeeb.in/`
- **Theme color**: `#055533`
- **Background color**: `#055533`
- **Signing key**: Path to your keystore

### Option B: Using PWABuilder (Easier)

1. Go to https://www.pwabuilder.com/
2. Enter `https://quran.shakeeb.in`
3. Click **"Package for stores"** → **"Android"**
4. Choose **"Google Play"** (TWA)
5. Fill in the details
6. Download the generated Android project

---

## 5. Step 3: Configure the Android Project

### `twa-manifest.json` (if using Bubblewrap)

```json
{
  "packageId": "in.shakeeb.quran.twa",
  "host": "quran.shakeeb.in",
  "name": "Quran Hifz Helper",
  "launcherName": "Quran Hifz",
  "display": "standalone",
  "themeColor": "#055533",
  "navigationColor": "#055533",
  "navigationColorDark": "#0f588c",
  "navigationDividerColor": "#055533",
  "backgroundColor": "#055533",
  "enableNotifications": false,
  "startUrl": "/",
  "iconUrl": "https://quran.shakeeb.in/assets/icons/icon-512x512.png",
  "maskableIconUrl": "https://quran.shakeeb.in/assets/icons/icon-512x512.png",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {
    "path": "./quran-hifz-helper.keystore",
    "alias": "quran-release"
  },
  "appVersionCode": 1,
  "appVersion": "1.0.0",
  "shortcuts": [
    {
      "name": "Full Quran",
      "short_name": "Read",
      "url": "/quran",
      "icons": [{"src": "https://quran.shakeeb.in/assets/icons/shortcut-read.svg"}]
    },
    {
      "name": "Browse Juz & Surah",
      "short_name": "Browse",
      "url": "/browse",
      "icons": [{"src": "https://quran.shakeeb.in/assets/icons/shortcut-browse.svg"}]
    },
    {
      "name": "Discover Ayahs",
      "short_name": "Discover",
      "url": "/discover",
      "icons": [{"src": "https://quran.shakeeb.in/assets/icons/shortcut-discover.svg"}]
    }
  ],
  "generatorApp": "bubblewrap-cli",
  "webManifestUrl": "https://quran.shakeeb.in/manifest.webmanifest"
}
```

### Adaptive Icon

Create adaptive icon resources:
- `app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192×192)
- `app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png` (192×192)

Or use Android Studio's **Image Asset Studio** to generate from your 512×512 icon.

---

## 6. Step 4: Build & Sign the APK/AAB

### Build with Bubblewrap

```bash
bubblewrap build
```

This generates:
- `app-release-bundle.aab` (Android App Bundle — required for Play Store)
- `app-release-signed.apk` (for direct testing)

### Build with Gradle (if using Android Studio)

```bash
cd android-project
./gradlew bundleRelease
```

The signed AAB will be at `app/build/outputs/bundle/release/app-release.aab`.

### Test the APK

```bash
# Install on a connected device
adb install app-release-signed.apk
```

Verify:
- [ ] App opens without URL bar (Digital Asset Links working)
- [ ] Offline mode works
- [ ] All PWA features work correctly
- [ ] Splash screen shows correctly
- [ ] App icon looks correct on home screen

---

## 7. Step 5: Google Play Console Setup

### Create App

1. Log into https://play.google.com/console
2. Click **"Create app"**
3. Fill in:
   - **App name**: Quran Hifz Helper
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
4. Accept declarations and click **Create app**

### App Content (Required Before Release)

Fill in ALL of these sections in the Play Console:

#### Privacy Policy
Host a privacy policy page (can be on your website). Content:
- App collects no personal data
- All data stored locally on device
- No tracking or analytics
- No ads

URL: `https://quran.shakeeb.in/privacy` (create this page)

#### App Access
- ☑ All functionality is available without special access

#### Ads
- ☑ No, my app does not contain ads

#### Content Rating
Complete the **IARC questionnaire**:
- Violence: None
- Sexuality: None
- Language: None
- Controlled substance: None
- **Expected rating**: Everyone / PEGI 3

#### Target Audience
- ☑ 13 and above (not designed for children under 13)

#### News App
- ☑ Not a news app

#### Data Safety
Fill in the data safety form:
- Does the app collect data? **No**
- Does the app share data? **No**
- Is data encrypted in transit? **Yes** (HTTPS)
- Can users request data deletion? **N/A** (no server-side data)

---

## 8. Step 6: Store Listing Content

### Main Listing

**App Name**: Quran Hifz Helper

**Short Description** (80 chars):
```
Read, memorize & explore the Holy Quran — offline, free, beautiful.
```

**Full Description** (4000 chars max):
```
📖 Quran Hifz Helper — Your Beautiful Companion for the Holy Quran

Read the complete Quran in stunning Arabic text with multiple sources (15-line and 16-line IndoPak). Navigate by Juz, Surah, or page. Works completely offline.

✨ KEY FEATURES:

📚 MULTI-SOURCE QURAN TEXT
• 15-line and 16-line IndoPak text from Archive.org and Quran.com
• Beautiful Arabic fonts (Muhammadi, IndoPak Waqf Lazim)
• Tatweel (kashida) justified text for authentic mushaf appearance

🎨 TAJWEED HIGHLIGHTING
• Offline color-coded tajweed rules — Ghunna, Ikhfa, Idgham, Iqlab, Qalqalah, Madd
• Customizable colors for each rule
• No internet needed — all processing happens on your device

📖 TRANSLATIONS & TAFSEER
• Multiple English and Urdu translations
• Word-by-word meanings and transliteration
• Inline translation mode (below each line)
• Tafseer: Ibn Kathir (Arabic/Urdu) & Ma'arif ul Quran (English)

🧠 MEMORIZATION (HIFZ) TRACKER
• Track progress by Juz or Surah
• Spaced repetition review system
• Weekly review heatmap
• Mastery levels: New → Learning → Reviewing → Mastered
• Motivational quotes and badges

✨ DISCOVER MODE
• Beautiful, full-screen ayah cards (like Instagram Reels)
• Swipe to explore random ayahs
• Each card has unique design with Arabic text and translations
• Share ayahs with family and friends

🎧 AUDIO RECITATION
• Listen to any surah by 10+ famous reciters
• Including Mishary Alafasy, Abdul Rahman Al-Sudais, Al-Husary

🖼️ SCANNED MUSHAF
• High-quality scanned page images from Archive.org
• 7 different sources: 15-line Saudi, 16-line Darussalam, Taj Company editions
• Pinch-to-zoom for details

🎯 DAILY GOALS & GAMIFICATION
• Set daily reading and memorization targets
• Progress rings, weekly heatmap, streak counter
• 10-level system (Beginner → Master)
• Achievement badges

🌙 THEMES & CUSTOMIZATION
• 10 beautiful reading themes (Golden, Paper, Sage, Ocean, Midnight, etc.)
• Custom background colors, gradients, and images
• Dark mode support
• Adjustable font size

📱 WORKS EVERYWHERE
• Progressive Web App — works offline after first load
• Install on any device: Android, iOS, Windows, Mac, Linux
• No account required, no ads, completely free
• Open source

Made with ❤️ for the Ummah.

Website: quran.shakeeb.in
Feedback: t.me/ShakesVision
```

### Graphics

#### App Icon
- 512×512 PNG, 32-bit color with alpha
- Use existing `icon-512x512.png`

#### Feature Graphic
- 1024×500 PNG or JPEG
- Design with app name, tagline, and key visual (mushaf page + phone mockup)
- Suggested text: "Quran Hifz Helper — Read · Memorize · Explore"

#### Screenshots (Required: 2-8 per device type)
Take screenshots at 1080×1920 (phone) showing:

1. **Home screen** with banner and feature grid
2. **Reader** with Arabic text and theme
3. **Reader** with tajweed highlighting on
4. **Tafseer modal** showing translations
5. **Discover** page with beautiful ayah card
6. **Memorize** page with progress tracking
7. **Listen** page with surah list
8. **Settings** sidebar with themes

Tips:
- Use a clean device with no notifications
- Show the app at its best (populated data, progress, etc.)
- Consider adding device frames in post-processing

#### Tablet Screenshots (Optional but recommended)
Take at 1920×1200 or similar tablet resolution.

---

## 9. Step 7: Upload & Submit for Review

### Internal Testing (Recommended First)

1. Go to **Testing** → **Internal testing** in Play Console.
2. Create a new release.
3. Upload the `.aab` file.
4. Add yourself and testers to the tester list.
5. Save and roll out.
6. Test on real devices.

### Production Release

1. Go to **Production** → **Create new release**.
2. Upload the signed `.aab` file.
3. Add **release notes**:
   ```
   🚀 Initial Release — Quran Hifz Helper v1.0.0

   • Complete Quran with multiple text sources
   • Offline tajweed highlighting
   • Multi-translation tafseer modal
   • Discover mode — beautiful ayah cards
   • Hifz tracker with spaced repetition
   • Audio recitation by 10+ reciters
   • 7 scanned mushaf sources
   • 10 reading themes + custom colors
   • Daily goals & gamification
   • Fully offline after first load
   ```
4. Click **Review release** then **Start rollout to production**.

### Review Timeline
- First review typically takes **3-7 days**.
- Subsequent updates: usually **24-48 hours**.
- If rejected, check the rejection email for specific policy violations and fix them.

---

## 10. Step 8: Post-Launch

### Monitor
- Check **Play Console dashboard** for installs, ratings, and crashes.
- Monitor **Android vitals** for ANRs and crashes.
- Respond to user reviews promptly.

### Updates
Since this is a TWA, **web updates are instant** — no Play Store review needed for web changes.

For TWA wrapper updates (icon changes, target SDK updates), you need to:
1. Increment `appVersionCode` and `appVersion` in twa-manifest.json.
2. Rebuild and upload a new AAB.
3. Submit for review.

### Promotion
- Share the Play Store link on social media.
- Add a "Get it on Google Play" badge to the website.
- Mention in masjid/Islamic community groups.
- Submit to Islamic app directories and review sites.

---

## 11. Alternative: Using PWABuilder

The easiest method for generating the Android wrapper:

1. Go to https://www.pwabuilder.com/
2. Enter `https://quran.shakeeb.in`
3. Wait for analysis to complete.
4. Click **"Package for stores"**.
5. Select **"Android"** → **"Google Play"**.
6. Configure:
   - Package ID: `in.shakeeb.quran.twa`
   - App name: Quran Hifz Helper
   - App version: 1.0.0
   - Source URL: https://quran.shakeeb.in
   - Upload signing key or let PWABuilder generate one.
7. Click **Generate**.
8. Download the ZIP containing the Android project and signed AAB.
9. Upload the AAB to Play Console.

**Pros**: Very easy, no Android Studio needed.
**Cons**: Less control over configuration.

---

## 12. Troubleshooting

### URL Bar Shows in App
- Digital Asset Links (`assetlinks.json`) not set up correctly.
- SHA-256 fingerprint doesn't match the signing key.
- File not accessible at `/.well-known/assetlinks.json`.
- Chrome needs time to verify (may take a few hours).

### App Crashes on Open
- Check that the PWA URL is accessible via HTTPS.
- Ensure the service worker is properly registered.
- Test in Chrome Custom Tab first: `adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -d "https://quran.shakeeb.in"`

### Play Store Rejection
Common reasons:
- **Missing privacy policy**: Add a privacy policy URL.
- **Broken functionality**: Ensure all features work offline.
- **Misleading content**: Don't claim features you don't have.
- **Repetitive content**: Make sure the app adds value beyond just a website.

### Build Fails
- Ensure JDK 11+ is installed.
- Check that Android SDK is properly set up.
- Run `bubblewrap doctor` to check environment.

---

## Quick Reference: Version Checklist

For each release, ensure:

- [ ] `appVersionCode` incremented (integer, always increasing)
- [ ] `appVersion` updated (semver string)
- [ ] Digital Asset Links verified
- [ ] New screenshots if UI changed
- [ ] Release notes written
- [ ] Tested on real device
- [ ] Privacy policy up to date

---

*Document version: 1.0 • February 2026*

