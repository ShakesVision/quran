# Quran.com Data Download

This folder contains comprehensive Quran data downloaded from Quran.com CDN API.

## Folder Structure

```
temp-qurancom/
├── 15Lines/                    # Basic download (text + line numbers)
│   └── {1-114}.json
├── 16Lines/                    # Basic download (text + line numbers)
│   └── {1-114}.json
├── comprehensive-15Lines/      # Full data with translations
│   └── {1-114}.json
├── comprehensive-16Lines/      # Full data with translations
│   └── {1-114}.json
└── download-comprehensive.sh   # Download script
```

## Data Fields

### Verse Level
| Field | Description |
|-------|-------------|
| `verse_key` | Surah:Ayah format (e.g., "1:1") |
| `text_uthmani` | Arabic text in Uthmani script |
| `text_indopak` | Arabic text in IndoPak script |
| `text_imlaei_simple` | Simplified Arabic text |
| `hizb_number` | Hizb number (1-60) |
| `ruku_number` | Ruku number |
| `manzil_number` | Manzil number (1-7) |
| `sajdah_number` | Sajdah number (if applicable) |
| `page_number` | Page in mushaf |
| `juz_number` | Juz number (1-30) |

### Word Level (`verses[].words[]`)
| Field | Description |
|-------|-------------|
| `position` | Word position in verse |
| `line_number` | Line on page (1-15 or 1-16) |
| `text_uthmani` | Word in Uthmani script |
| `text_indopak` | Word in IndoPak script |
| `location` | surah:ayah:word format |
| `char_type_name` | "word" or "end" (ayah marker) |
| `audio_url` | Word-by-word audio URL |
| `translation.text` | English word translation |
| `transliteration.text` | Roman transliteration |

### Translations (`verses[].translations[]`)
| resource_id | Language | Author |
|-------------|----------|--------|
| 97 | Urdu | Tafheem e Qur'an - Syed Abu Ali Maududi |
| 54 | Urdu | Maulana Muhammad Junagarhi |
| 85 | English | M.A.S. Abdel Haleem |
| 20 | English | Saheeh International |
| 84 | English | Mufti Taqi Usmani |

## Mushaf Types
- **15-Line (mushaf=6)**: Saudi/IndoPak style with 15 lines per page (~611 pages)
- **16-Line (mushaf=7)**: Pakistan/India style with 16 lines per page (~548 pages)

## API Endpoints Used

```
# CDN endpoint (gives correct line numbers per mushaf)
https://api.qurancdn.com/api/qdc/verses/by_chapter/{chapter_id}?
  words=true
  &per_page=all
  &translations=97,54,85,20,84
  &word_translation_language=en
  &word_fields=text_uthmani,text_indopak,verse_key,location,line_number
  &fields=text_uthmani,text_indopak,chapter_id,hizb_number,ruku_number,manzil_number,sajdah_number
  &mushaf=6  # or 7 for 16-line
```

## Available Translation IDs

### English
- 85: M.A.S. Abdel Haleem
- 20: Saheeh International
- 84: Mufti Taqi Usmani
- 19: M. Pickthall
- 22: A. Yusuf Ali
- 95: A. Maududi (Tafhim commentary)
- 149: Fadel Soliman, Bridges' translation

### Urdu
- 97: Tafheem e Qur'an - Syed Abu Ali Maududi
- 54: Maulana Muhammad Junagarhi
- 234: Fatah Muhammad Jalandhari
- 151: Shaykh al-Hind Mahmud al-Hasan (with Tafsir E Usmani)
- 158: Bayan-ul-Quran (Dr. Israr Ahmad)
- 156: Fe Zilal al-Qur'an (Sayyid Ibrahim Qutb)
- 819: Maulana Wahiduddin Khan
- 831: Abul Ala Maududi (Roman Urdu)

## Word-by-Word Translations

**Note**: Word-by-word translations are only available in English from Quran.com API.
The `word_translation_language` parameter accepts different languages but always returns English translations.

## Font Pairing

| Text Type | Recommended Font |
|-----------|------------------|
| `text_indopak` | IndoPak Nastaleeq Waqf Lazim (`indopak-nastaleeq-waqf-lazim-v4.2.1.woff2`) |
| `text_uthmani` | Uthmanic Hafs (`UthmanicHafs1Ver18.woff2`) |

## Transfer to Archive Repo

After verification, copy to `Quran_archive` repo:

```bash
# Move comprehensive data to archive
cp -r comprehensive-15Lines ../Quran_archive/qurancom/15Lines
cp -r comprehensive-16Lines ../Quran_archive/qurancom/16Lines
```

