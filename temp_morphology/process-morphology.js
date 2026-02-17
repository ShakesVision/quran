/**
 * Process Quranic Arabic Corpus Morphology v0.4 into compact JSON
 * 
 * Input format (TSV): LOCATION  FORM  TAG  FEATURES
 *   Location: (surah:ayah:word:segment)
 *   Form: Buckwalter transliteration
 *   Tag: POS tag (N, V, PRON, P, CONJ, DET, etc.)
 *   Features: pipe-separated (PREFIX|bi+, STEM|POS:N|LEM:...|ROOT:...|M|GEN, SUFFIX|PRON:1P)
 *
 * Output: Compact JSON grouped by word location (surah:ayah:word)
 *   Each word has its segments merged into a single entry with:
 *     - ar: Arabic form (from Buckwalter back-transliteration) 
 *     - pos: Part of speech tag
 *     - lem: Lemma (Buckwalter)
 *     - root: Root (Buckwalter)
 *     - features: Compact feature string
 */

const fs = require('fs');
const path = require('path');

// Buckwalter to Arabic transliteration map
const BW_TO_AR = {
  "'": "\u0621", "|": "\u0622", ">": "\u0623", "&": "\u0624",
  "<": "\u0625", "}": "\u0626", "A": "\u0627", "b": "\u0628",
  "p": "\u0629", "t": "\u062A", "v": "\u062B", "j": "\u062C",
  "H": "\u062D", "x": "\u062E", "d": "\u062F", "*": "\u0630",
  "r": "\u0631", "z": "\u0632", "s": "\u0633", "$": "\u0634",
  "S": "\u0635", "D": "\u0636", "T": "\u0637", "Z": "\u0638",
  "E": "\u0639", "g": "\u063A", "_": "\u0640", "f": "\u0641",
  "q": "\u0642", "k": "\u0643", "l": "\u0644", "m": "\u0645",
  "n": "\u0646", "h": "\u0647", "w": "\u0648", "Y": "\u0649",
  "y": "\u064A", "F": "\u064B", "N": "\u064C", "K": "\u064D",
  "a": "\u064E", "u": "\u064F", "i": "\u0650", "~": "\u0651",
  "o": "\u0652", "`": "\u0670", "{": "\u0671", "P": "\u067E",
  "J": "\u0686", "V": "\u06A4", "G": "\u06AF",
  // Special handling for Hamza forms
  "^": "\u0653", "#": "\u0654", "$": "\u0655",
};

function buckwalterToArabic(bw) {
  if (!bw) return '';
  let result = '';
  for (const ch of bw) {
    result += BW_TO_AR[ch] || ch;
  }
  return result;
}

// Compact POS tag abbreviations
const POS_ABBREV = {
  'N': 'n',       // Noun
  'PN': 'pn',     // Proper Noun
  'ADJ': 'adj',   // Adjective
  'V': 'v',       // Verb
  'PRON': 'pro',  // Pronoun
  'DEM': 'dem',   // Demonstrative
  'REL': 'rel',   // Relative
  'T': 't',       // Time adverb
  'LOC': 'loc',   // Location adverb
  'P': 'p',       // Preposition
  'CONJ': 'conj', // Conjunction
  'SUB': 'sub',   // Subordinating conjunction
  'ACC': 'acc',   // Accusative particle
  'NEG': 'neg',   // Negative
  'DET': 'det',   // Determiner
  'EMPH': 'emp',  // Emphatic
  'COND': 'cond', // Conditional
  'INTG': 'intg', // Interrogative
  'RES': 'res',   // Restriction
  'CERT': 'cert', // Certainty
  'VOC': 'voc',   // Vocative
  'RSLT': 'rslt', // Result
  'PRO': 'pro',   // Prohibition
  'PRP': 'prp',   // Purpose
  'CIRC': 'circ', // Circumstantial
  'SUP': 'sup',   // Supplemental
  'PREV': 'prev', // Preventive
  'FUT': 'fut',   // Future
  'RET': 'ret',   // Retraction
  'EXP': 'exp',   // Explanation
  'INC': 'inc',   // Inceptive
  'CAUS': 'caus', // Cause
  'IMPV': 'impv', // Imperative
  'EXL': 'exl',   // Exclamation
  'AMD': 'amd',   // Amendment
  'INT': 'int',   // Interpretation
  'EXH': 'exh',   // Exhortation
  'ANS': 'ans',   // Answer
  'SUR': 'sur',   // Surprise
  'AVR': 'avr',   // Aversion
  'INL': 'inl',   // Initials
  'REM': 'rem',   // Resumption
  'EQ': 'eq',     // Equalization
  'COM': 'com',   // Comitative
  'IMPN': 'impn', // Impersonal
};

// Compact verb form abbreviations
const VERB_FORM_MAP = {
  '(I)': '1', '(II)': '2', '(III)': '3', '(IV)': '4',
  '(V)': '5', '(VI)': '6', '(VII)': '7', '(VIII)': '8',
  '(IX)': '9', '(X)': '10', '(XI)': '11', '(XII)': '12',
};

// Compact grammatical feature abbreviations
const FEATURE_MAP = {
  'NOM': 'nom', 'ACC': 'acc', 'GEN': 'gen', 'JUSS': 'jus', 'SUBJ': 'sub',
  '1': '1', '2': '2', '3': '3',
  'M': 'm', 'F': 'f',
  'S': 's', 'D': 'd', 'P': 'p',
  'MS': 'ms', 'FS': 'fs', 'MD': 'md', 'FD': 'fd', 'MP': 'mp', 'FP': 'fp',
  '1S': '1s', '2MS': '2ms', '2FS': '2fs', '2D': '2d', '2MP': '2mp', '2FP': '2fp',
  '3MS': '3ms', '3FS': '3fs', '3D': '3d', '3MD': '3md', '3FD': '3fd', '3MP': '3mp', '3FP': '3fp',
  '1P': '1p',
  'PERF': 'pf', 'IMPF': 'im', 'IMPV': 'iv',
  'ACT': 'act', 'PASS': 'pas',
  'PCPL': 'pcpl', 'VN': 'vn',
  'DEF': 'def', 'INDEF': 'ind',
};

function parseFeatures(features) {
  const parts = features.split('|');
  let type = ''; // PREFIX, STEM, SUFFIX
  let pos = '';
  let lem = '';
  let root = '';
  let verbForm = '';
  let mood = '';
  let aspect = '';
  let voice = '';
  let person = '';
  let gender = '';
  let number = '';
  let state = '';
  let derivation = '';
  const others = [];

  for (const part of parts) {
    if (part === 'PREFIX' || part === 'STEM' || part === 'SUFFIX') {
      type = part;
      continue;
    }
    
    if (part.startsWith('POS:')) {
      pos = part.substring(4);
      continue;
    }
    if (part.startsWith('LEM:')) {
      lem = part.substring(4);
      continue;
    }
    if (part.startsWith('ROOT:')) {
      root = part.substring(5);
      continue;
    }
    if (part.startsWith('PRON:')) {
      // Pronoun suffix like PRON:1P, PRON:3MS
      others.push('pr:' + (FEATURE_MAP[part.substring(5)] || part.substring(5).toLowerCase()));
      continue;
    }
    
    // Check verb forms
    if (VERB_FORM_MAP[part]) {
      verbForm = VERB_FORM_MAP[part];
      continue;
    }
    
    // Check aspect/mood/voice/person/gender/number
    if (FEATURE_MAP[part]) {
      const mapped = FEATURE_MAP[part];
      // Categorize based on what it is
      if (['pf', 'im', 'iv'].includes(mapped)) aspect = mapped;
      else if (['act', 'pas'].includes(mapped)) voice = mapped;
      else if (['nom', 'acc', 'gen', 'jus', 'sub'].includes(mapped)) state = mapped;
      else if (['pcpl', 'vn'].includes(mapped)) derivation = mapped;
      else others.push(mapped);
      continue;
    }

    // Handle prefix/suffix markers (like bi+, Al+, w:CONJ+, l:P+, etc.)
    if (part.endsWith('+') || part.startsWith('+')) {
      // Skip prefix/suffix markers - we capture the tag separately
      continue;
    }

    // Handle other features
    if (part && part !== 'STEM' && part !== 'PREFIX' && part !== 'SUFFIX') {
      others.push(part.toLowerCase());
    }
  }

  return { type, pos, lem, root, verbForm, aspect, voice, state, derivation, others };
}

// Read and process the data
const inputFile = path.join(__dirname, 'quranic-corpus-morphology-0.4.txt');
const data = fs.readFileSync(inputFile, 'utf8').replace(/\r/g, ''); // strip CR
const lines = data.split('\n');

// Group segments by word location (surah:ayah:word)
const words = new Map(); // key: "surah:ayah:word" -> { segments: [] }

let dataLines = 0;
let skipped = 0;

for (const line of lines) {
  if (line.startsWith('#') || line.trim() === '' || line.startsWith('LOCATION')) continue;
  
  const parts = line.split('\t');
  if (parts.length < 4) { skipped++; continue; }

  const [location, form, tag, features] = parts;
  
  // Parse location: (surah:ayah:word:segment)
  const locMatch = location.match(/\((\d+):(\d+):(\d+):(\d+)\)/);
  if (!locMatch) { skipped++; continue; }

  const [, surah, ayah, word, segment] = locMatch;
  const wordKey = `${surah}:${ayah}:${word}`;
  
  if (!words.has(wordKey)) {
    words.set(wordKey, { segments: [] });
  }

  const parsed = parseFeatures(features);
  
  words.get(wordKey).segments.push({
    seg: parseInt(segment),
    form,
    tag,
    ...parsed
  });
  
  dataLines++;
}

console.log(`Processed ${dataLines} data lines, skipped ${skipped}`);
console.log(`Total unique words: ${words.size}`);

// Now build the compact JSON output
// Format: { "1:1": { "1": {...}, "2": {...}, ... }, "1:2": {...}, ... }
// Grouped by "surah:ayah" -> word_number -> word_data

const output = {};

for (const [wordKey, wordData] of words) {
  const [surah, ayah, wordNum] = wordKey.split(':');
  const ayahKey = `${surah}:${ayah}`;
  
  if (!output[ayahKey]) {
    output[ayahKey] = {};
  }

  // Merge segments into a single word entry
  const segments = wordData.segments.sort((a, b) => a.seg - b.seg);
  
  // Find the STEM segment (main word)
  const stem = segments.find(s => s.type === 'STEM') || segments[segments.length - 1];
  const prefixes = segments.filter(s => s.type === 'PREFIX');
  const suffixes = segments.filter(s => s.type === 'SUFFIX');

  // Build compact word entry
  const entry = {};
  
  // POS from tag or stem
  entry.pos = POS_ABBREV[stem.pos || stem.tag] || (stem.pos || stem.tag || '').toLowerCase();
  
  // Lemma (Buckwalter)
  if (stem.lem) entry.lem = stem.lem;
  
  // Root (Buckwalter) 
  if (stem.root) entry.root = stem.root;
  
  // Arabic root
  if (stem.root) entry.arRoot = buckwalterToArabic(stem.root);
  
  // Arabic lemma
  if (stem.lem) entry.arLem = buckwalterToArabic(stem.lem);
  
  // Verb form
  if (stem.verbForm) entry.vf = stem.verbForm;
  
  // Aspect (perfect/imperfect/imperative)
  if (stem.aspect) entry.asp = stem.aspect;
  
  // Voice (active/passive)
  if (stem.voice) entry.voi = stem.voice;
  
  // State (nominative/accusative/genitive/jussive/subjunctive)
  if (stem.state) entry.st = stem.state;
  
  // Derivation (participle/verbal noun)
  if (stem.derivation) entry.der = stem.derivation;

  // Other morphological features
  const allOthers = [...stem.others];
  
  // Add prefix info
  if (prefixes.length > 0) {
    const prefTags = prefixes.map(p => POS_ABBREV[p.tag] || p.tag.toLowerCase());
    entry.pre = prefTags.join('+');
  }
  
  // Add suffix info
  if (suffixes.length > 0) {
    const sufParts = [];
    for (const suf of suffixes) {
      sufParts.push(...suf.others);
      if (suf.pos === 'PRON' || suf.tag === 'PRON') {
        const pronFeats = suf.others.filter(o => o.startsWith('pr:')).map(o => o.substring(3));
        if (pronFeats.length === 0) {
          // Get person/gender/number from remaining others
          const remaining = suf.others.filter(o => !o.startsWith('pr:'));
          sufParts.push(...remaining);
        }
      }
    }
    if (sufParts.length > 0) {
      entry.suf = sufParts.join(',');
    }
  }
  
  // Remaining features
  if (allOthers.length > 0) {
    entry.f = allOthers.join(',');
  }
  
  // Number of segments
  if (segments.length > 1) {
    entry.sc = segments.length;
  }
  
  output[ayahKey][wordNum] = entry;
}

// Count total ayahs
const ayahCount = Object.keys(output).length;
console.log(`Total ayahs: ${ayahCount}`);

// Write the full JSON
const fullJson = JSON.stringify(output);
const fullPath = path.join(__dirname, 'morphology-full.json');
fs.writeFileSync(fullPath, fullJson);
console.log(`Full JSON size: ${(fullJson.length / 1024 / 1024).toFixed(2)} MB`);

// Now split into per-surah files for lazy loading
const surahs = {};
for (const [ayahKey, words] of Object.entries(output)) {
  const surah = ayahKey.split(':')[0];
  if (!surahs[surah]) surahs[surah] = {};
  surahs[surah][ayahKey] = words;
}

const surahDir = path.join(__dirname, 'morphology');
if (!fs.existsSync(surahDir)) fs.mkdirSync(surahDir, { recursive: true });

let totalSplitSize = 0;
for (const [surahNum, surahData] of Object.entries(surahs)) {
  const surahJson = JSON.stringify(surahData);
  const filePath = path.join(surahDir, `${surahNum}.json`);
  fs.writeFileSync(filePath, surahJson);
  totalSplitSize += surahJson.length;
}
console.log(`Split files total: ${(totalSplitSize / 1024 / 1024).toFixed(2)} MB`);

// ===== COMPACT FORMAT =====
// To reduce size further, use array-based format:
// Each word: [pos, lem, root, arRoot, arLem, features_string, prefix_tags, suffix_info, verb_form, aspect, voice, state, derivation, seg_count]
// Store as: { "1:1": [[...word1...], [...word2...], ...], ... }
// Only include non-empty fields, use null for empty

const COMPACT_FIELDS = ['pos','lem','root','arRoot','arLem','f','pre','suf','vf','asp','voi','st','der','sc'];

const compactOutput = {};
for (const [ayahKey, words] of Object.entries(output)) {
  const wordArray = [];
  // Words are 1-indexed, find max
  const maxWord = Math.max(...Object.keys(words).map(Number));
  for (let i = 1; i <= maxWord; i++) {
    const w = words[String(i)];
    if (!w) { wordArray.push(null); continue; }
    // Build compact array: trim trailing nulls
    const arr = COMPACT_FIELDS.map(f => w[f] || null);
    // Remove trailing nulls
    while (arr.length > 0 && arr[arr.length - 1] === null) arr.pop();
    wordArray.push(arr);
  }
  compactOutput[ayahKey] = wordArray;
}

const compactJson = JSON.stringify(compactOutput);
const compactPath = path.join(__dirname, 'morphology-compact.json');
fs.writeFileSync(compactPath, compactJson);
console.log(`Compact JSON size: ${(compactJson.length / 1024 / 1024).toFixed(2)} MB`);

// Split compact format by surah
const compactSurahs = {};
for (const [ayahKey, words] of Object.entries(compactOutput)) {
  const surah = ayahKey.split(':')[0];
  if (!compactSurahs[surah]) compactSurahs[surah] = {};
  compactSurahs[surah][ayahKey] = words;
}

const compactSurahDir = path.join(__dirname, 'morphology-compact');
if (!fs.existsSync(compactSurahDir)) fs.mkdirSync(compactSurahDir, { recursive: true });

let totalCompactSize = 0;
let largestSurah = { num: 0, size: 0 };
for (const [surahNum, surahData] of Object.entries(compactSurahs)) {
  const surahJson = JSON.stringify(surahData);
  const filePath = path.join(compactSurahDir, `${surahNum}.json`);
  fs.writeFileSync(filePath, surahJson);
  totalCompactSize += surahJson.length;
  if (surahJson.length > largestSurah.size) {
    largestSurah = { num: surahNum, size: surahJson.length };
  }
}
console.log(`Compact split total: ${(totalCompactSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Largest surah: ${largestSurah.num} (${(largestSurah.size / 1024).toFixed(1)} KB)`);

// Print sample entries for verification
console.log('\n--- Sample Entries ---');
console.log('1:1 (Bismillah):');
console.log(JSON.stringify(output['1:1'], null, 2));
console.log('\n2:255 (Ayatul Kursi start):');
if (output['2:255']) {
  // Just first 5 words
  const sample = {};
  for (let i = 1; i <= 5; i++) {
    if (output['2:255'][i]) sample[i] = output['2:255'][i];
  }
  console.log(JSON.stringify(sample, null, 2));
}

