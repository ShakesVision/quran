#!/bin/bash
# Comprehensive download of all Quran.com data
# This script downloads maximum data fields for all 114 surahs

# CDN endpoint gives correct line numbers for specific mushafs
BASE_URL="https://api.qurancdn.com/api/qdc/verses/by_chapter"

# Translation IDs:
# English: 85 (Haleem), 20 (Sahih International), 84 (Taqi Usmani)
# Urdu: 97 (Maududi), 54 (Junagarhi), 234 (Jalandhari), 151 (Mahmud al-Hasan)
# For comprehensive data, we'll include top translations
TRANSLATIONS="97,54,85,20,84"

# Word fields - all available text variants
WORD_FIELDS="text_uthmani,text_indopak,text_imlaei_simple,verse_key,location,line_number"

# Verse fields - all available data
FIELDS="text_uthmani,text_indopak,text_imlaei_simple,chapter_id,hizb_number,ruku_number,manzil_number,sajdah_number"

# Output directories
mkdir -p comprehensive-15Lines
mkdir -p comprehensive-16Lines

echo "====================================================="
echo "  Quran.com Comprehensive Data Downloader"
echo "====================================================="
echo ""
echo "Downloading all 114 surahs with:"
echo "  - Multiple translations (English + Urdu)"
echo "  - Word-by-word translations & transliterations"  
echo "  - All text variants (Uthmani, Indopak, Imlaei)"
echo "  - Audio URLs for each word"
echo "  - Complete metadata (hizb, ruku, manzil, sajdah)"
echo ""
echo "Translation IDs:"
echo "  97  - Tafheem e Qur'an (Urdu - Maududi)"
echo "  54  - Maulana Junagarhi (Urdu)"
echo "  85  - Abdul Haleem (English)"
echo "  20  - Sahih International (English)"
echo "  84  - Mufti Taqi Usmani (English)"
echo "====================================================="
echo ""

# Download 15-line mushaf (mushaf=6)
echo "[1/2] Downloading 15-Line Mushaf (IndoPak Style)..."
for i in $(seq 1 114); do
  printf "  Surah %3d/114... " $i
  
  URL="${BASE_URL}/${i}?words=true&per_page=all"
  URL="${URL}&translations=${TRANSLATIONS}"
  URL="${URL}&word_translation_language=en"
  URL="${URL}&word_fields=${WORD_FIELDS}"
  URL="${URL}&fields=${FIELDS}"
  URL="${URL}&mushaf=6"
  
  curl -s "$URL" > "comprehensive-15Lines/${i}.json"
  
  # Check if download was successful
  if grep -q '"verses"' "comprehensive-15Lines/${i}.json" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED - retrying..."
    sleep 2
    curl -s "$URL" > "comprehensive-15Lines/${i}.json"
  fi
  
  # Small delay to be respectful to the API
  sleep 0.3
done

# Download 16-line mushaf (mushaf=7)
echo ""
echo "[2/2] Downloading 16-Line Mushaf (Pakistan/India Style)..."
for i in $(seq 1 114); do
  printf "  Surah %3d/114... " $i
  
  URL="${BASE_URL}/${i}?words=true&per_page=all"
  URL="${URL}&translations=${TRANSLATIONS}"
  URL="${URL}&word_translation_language=en"
  URL="${URL}&word_fields=${WORD_FIELDS}"
  URL="${URL}&fields=${FIELDS}"
  URL="${URL}&mushaf=7"
  
  curl -s "$URL" > "comprehensive-16Lines/${i}.json"
  
  # Check if download was successful
  if grep -q '"verses"' "comprehensive-16Lines/${i}.json" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED - retrying..."
    sleep 2
    curl -s "$URL" > "comprehensive-16Lines/${i}.json"
  fi
  
  # Small delay to be respectful to the API
  sleep 0.3
done

echo ""
echo "====================================================="
echo "  Download Complete!"
echo "====================================================="
echo ""
echo "Data saved to:"
echo "  - comprehensive-15Lines/ (15-line IndoPak mushaf)"
echo "  - comprehensive-16Lines/ (16-line Pakistan/India mushaf)"
echo ""
echo "Each file contains:"
echo "  - verses[].verse_key          : Surah:Ayah format"
echo "  - verses[].text_uthmani       : Uthmani script"
echo "  - verses[].text_indopak       : IndoPak script"
echo "  - verses[].hizb_number        : Hizb number (1-60)"
echo "  - verses[].ruku_number        : Ruku number"
echo "  - verses[].manzil_number      : Manzil number (1-7)"
echo "  - verses[].sajdah_number      : Sajdah number (if applicable)"
echo "  - verses[].words[]            : Word-by-word data"
echo "    - line_number               : Line on page (1-15 or 1-16)"
echo "    - text_uthmani/indopak      : Word in different scripts"
echo "    - translation.text          : English word translation"
echo "    - transliteration.text      : Roman transliteration"
echo "    - audio_url                 : Word-by-word audio URL"
echo "    - location                  : surah:ayah:word format"
echo "  - verses[].translations[]     : Verse translations"
echo "    - resource_id 97            : Urdu (Maududi)"
echo "    - resource_id 54            : Urdu (Junagarhi)"
echo "    - resource_id 85            : English (Haleem)"
echo "    - resource_id 20            : English (Sahih)"
echo "    - resource_id 84            : English (Usmani)"
echo ""
echo "Total size:"
du -sh comprehensive-15Lines comprehensive-16Lines

