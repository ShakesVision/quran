#!/bin/bash
# Download all 114 surahs from quran.com API
# Using the CDN endpoint for correct line numbers

BASE_URL="https://api.qurancdn.com/api/qdc/verses/by_chapter"
FIELDS="words=true&per_page=all&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&word_fields=verse_key,verse_id,page_number,location,text_uthmani,text_indopak,line_number&filter_page_words=true"

echo "Downloading Quran.com data for all 114 surahs..."
echo "================================================"

# Download 15-line mushaf (mushaf=6)
echo ""
echo "Downloading 15-Line Mushaf..."
for i in $(seq 1 114); do
  printf "  Surah %3d/114..." $i
  curl -s "${BASE_URL}/${i}?${FIELDS}&mushaf=6" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    # Extract only essential fields
    minimal = {
        'chapter_id': ${i},
        'verses': []
    }
    for v in data.get('verses', []):
        verse = {
            'verse_key': v.get('verse_key'),
            'verse_number': v.get('verse_number'),
            'page_number': v.get('page_number'),
            'words': []
        }
        for w in v.get('words', []):
            word = {
                'position': w.get('position'),
                'line_number': w.get('line_number'),
                'text': w.get('text'),
                'char_type': w.get('char_type_name')
            }
            verse['words'].append(word)
        minimal['verses'].append(verse)
    print(json.dumps(minimal, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" > "15Lines/${i}.json"
  echo " done"
done

# Download 16-line mushaf (mushaf=7)
echo ""
echo "Downloading 16-Line Mushaf..."
for i in $(seq 1 114); do
  printf "  Surah %3d/114..." $i
  curl -s "${BASE_URL}/${i}?${FIELDS}&mushaf=7" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    # Extract only essential fields
    minimal = {
        'chapter_id': ${i},
        'verses': []
    }
    for v in data.get('verses', []):
        verse = {
            'verse_key': v.get('verse_key'),
            'verse_number': v.get('verse_number'),
            'page_number': v.get('page_number'),
            'words': []
        }
        for w in v.get('words', []):
            word = {
                'position': w.get('position'),
                'line_number': w.get('line_number'),
                'text': w.get('text'),
                'char_type': w.get('char_type_name')
            }
            verse['words'].append(word)
        minimal['verses'].append(verse)
    print(json.dumps(minimal, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" > "16Lines/${i}.json"
  echo " done"
done

echo ""
echo "Download complete!"
echo "Files saved to 15Lines/ and 16Lines/ directories"

