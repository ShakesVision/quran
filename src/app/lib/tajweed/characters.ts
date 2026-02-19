/**
 * Arabic character constants used in Tajweed rule detection.
 * Ported from https://github.com/quran/tajweed (Java → TypeScript)
 *
 * Extended for IndoPak (archive) text support:
 *   - Heh Goal (U+06C1), Heh Doachashmee (U+06BE)
 *   - Farsi Yeh (U+06CC), Keheh (U+06A9)
 *   - End-of-Ayah mark (U+06DD), Rub El Hizb (U+06DE)
 *   - Additional small/ornamental markers
 */

// ─── Diacritics / Tashkeel ────────────────────────────────────────
export const FATHA_TANWEEN  = 0x064B;
export const DAMMA_TANWEEN  = 0x064C;
export const KASRA_TANWEEN  = 0x064D;
export const FATHA          = 0x064E;
export const DAMMA          = 0x064F;
export const KASRA          = 0x0650;
export const SUKUN          = 0x0652;
export const SHADDA         = 0x0651;
export const SMALL_ALEF     = 0x0670;   // superscript alef (dagger alef)
export const JAZM           = 0x06E1;   // naskh sukun
export const MAAD_MARKER    = 0x0653;
export const SMALL_HIGH_MEEM_ISOLATED = 0x06E2;

// ─── Pause / Stop marks ────────────────────────────────────────────
export const SMALL_SAAD_LAAM_ALEF = 0x06D6;
export const SMALL_QAAF_LAAM_ALEF = 0x06D7;
export const SMALL_HIGH_MEEM      = 0x06D8;
export const SMALL_LAAM_ALEF      = 0x06D9;
export const SMALL_HIGH_JEEM      = 0x06DA;
export const SMALL_THREE_DOTS     = 0x06DB;

// ─── Quranic meta marks (NOT letters, NOT diacritics) ──────────────
export const END_OF_AYAH          = 0x06DD; // ۝ Arabic End of Ayah
export const RUB_EL_HIZB          = 0x06DE; // ۞ Arabic Start of Rub El Hizb
export const SAJDAH_MARK          = 0x06E9; // ۩ Place of Sajdah
export const SMALL_HIGH_SEEN      = 0x06DC; // ۜ (used in some Indopak texts)

// ─── Letters ───────────────────────────────────────────────────────
export const ALEF           = 0x0627;
export const ALEF_LAYINA    = 0x0649;   // looks like ya, pronounced like alef
export const BA             = 0x0628;
export const TA             = 0x062A;
export const THAA           = 0x062B;
export const JEEM           = 0x062C;
export const DAAL           = 0x062F;
export const ZAAL           = 0x0630;
export const RA             = 0x0631;
export const ZA             = 0x0632;
export const SEEN           = 0x0633;
export const SHEEN          = 0x0634;
export const SAAD           = 0x0635;
export const DAAD           = 0x0636;
export const TAA            = 0x0637;
export const ZAA            = 0x0638;
export const FAA            = 0x0641;
export const QAAF           = 0x0642;
export const KAAF           = 0x0643;
export const LAM            = 0x0644;
export const MEEM           = 0x0645;
export const NOON           = 0x0646;
export const WAW            = 0x0648;
export const YA             = 0x064A;
export const HAMZA          = 0x0621;

export const TATWEEL        = 0x0640;

// ─── IndoPak letter variants (mapped to standard equivalents by normalizeForTajweed) ──
export const HEH_GOAL       = 0x06C1;   // ہ – used for ه in archive
export const HEH_DOACHASHMEE = 0x06BE;  // ھ – used in some IndoPak
export const FARSI_YEH      = 0x06CC;   // ی – used for ي in IndoPak
export const KEHEH          = 0x06A9;   // ک – used for ك in IndoPak
export const TEH_MARBUTA_GOAL = 0x06C3; // ۃ – used for ة in IndoPak

// ─── Maad-related small letters ────────────────────────────────────
export const ALEF_SUGHRA    = 0x0670;
export const WAW_SUGHRA     = 0x06E5;
export const YA_SUGHRA      = 0x06E6;

// ─── Predicates ────────────────────────────────────────────────────

export function isDiaMark(c: number): boolean {
  return c === FATHA_TANWEEN || c === DAMMA_TANWEEN || c === KASRA_TANWEEN ||
    c === FATHA || c === DAMMA || c === KASRA ||
    c === SUKUN || c === SHADDA || c === SMALL_ALEF ||
    c === MAAD_MARKER || c === JAZM;
}

export function isEndMark(c: number): boolean {
  return c === SMALL_SAAD_LAAM_ALEF || c === SMALL_QAAF_LAAM_ALEF ||
    c === SMALL_HIGH_MEEM || c === SMALL_LAAM_ALEF ||
    c === SMALL_HIGH_JEEM || c === SMALL_THREE_DOTS ||
    c === END_OF_AYAH || c === RUB_EL_HIZB ||
    c === SAJDAH_MARK || c === SMALL_HIGH_SEEN;
}

/**
 * True if c is a "real" Arabic base letter (something that carries diacritics
 * and participates in tajweed rules). Excludes:
 * - diacritics, end/stop marks, spaces, tatweel
 * - Quranic meta marks (end-of-ayah ۝, rub-el-hizb ۞, etc.)
 * - Ayah number digits (U+0660–U+066F, U+06F0–U+06F9)
 */
export function isLetter(c: number): boolean {
  if (isEndMark(c) || isDiaMark(c)) return false;
  if (c === 0x20 || c === TATWEEL) return false;
  // Exclude Arabic-Indic digits (٠١٢...٩) and Extended Arabic-Indic digits (۰۱۲...۹)
  if (c >= 0x0660 && c <= 0x0669) return false;
  if (c >= 0x06F0 && c <= 0x06F9) return false;
  // Exclude miscellaneous Quranic ornaments/symbols
  if (c === END_OF_AYAH || c === RUB_EL_HIZB || c === SAJDAH_MARK) return false;
  // Exclude small high signs used as annotations (U+06D6–U+06ED range not caught above)
  if (c >= 0x06E2 && c <= 0x06ED) return false;
  // Must be in Arabic Unicode blocks (0600–06FF, 08A0–08FF, FB50–FDFF, FE70–FEFF)
  if ((c >= 0x0621 && c <= 0x064A) || // standard Arabic letters
      (c >= 0x0671 && c <= 0x06D3) || // extended Arabic letters (includes IndoPak variants)
      (c >= 0x06FA && c <= 0x06FC) || // additional
      c === 0x066E || c === 0x066F) {
    return true;
  }
  return false;
}

export function isTanween(c: number): boolean {
  return c === FATHA_TANWEEN || c === DAMMA_TANWEEN || c === KASRA_TANWEEN;
}

export function isNoonSaakin(next: number[]): boolean {
  return next[0] === NOON &&
    ((next[1] === SUKUN || next[1] === JAZM) ||
      next[1] === 0x20 ||
      isLetter(next[1]));
}

export function isMeemSaakin(next: number[]): boolean {
  return next[0] === MEEM &&
    ((next[1] === SUKUN || next[1] === JAZM) ||
      next[1] === 0x20 ||
      isLetter(next[1]));
}

// ─── Navigation helpers ────────────────────────────────────────────

/**
 * Get next N codepoints starting from `index`.
 */
export function getNextChars(ayah: string, index: number): number[] {
  const next = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < next.length; j++) {
    const nIndex = index + j;
    if (nIndex < ayah.length) {
      next[j] = ayah.codePointAt(nIndex)!;
    }
  }
  return next;
}

/**
 * Get previous N codepoints looking backwards from `index`.
 */
export function getPreviousChars(ayah: string, index: number): number[] {
  const prev = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < prev.length; j++) {
    const pIndex = index - j;
    if (pIndex >= 0) {
      prev[j] = ayah.codePointAt(pIndex)!;
    }
  }
  return prev;
}

export interface CharacterInfo {
  index: number;
  character: number;
}

/**
 * Get the previous character and its position, ignoring spaces.
 */
export function getPreviousCharacter(str: string, index: number): CharacterInfo {
  let previous = -1;
  let lastIndex = index - 1;
  if (index > 0) {
    previous = str.codePointAt(index - 1)!;
    while (previous === 0x20 && lastIndex > 0) {
      previous = str.codePointAt(--lastIndex)!;
    }
  }
  if (previous === 0x20) {
    previous = -1;
    lastIndex = -1;
  }
  return { index: lastIndex, character: previous };
}

export function findRemainingMarks(next: number[]): number {
  for (let i = 1; i < next.length; i++) {
    if (!isDiaMark(next[i])) return i;
  }
  return 0;
}

export function findPreviousLetterPronounced(previous: number[]): number {
  for (let i = 1; i < previous.length; i++) {
    if (isLetter(previous[i]) && isDiaMark(previous[i - 1])) return i;
  }
  return 0;
}

export function findNextLetterPronounced(next: number[]): number {
  for (let i = 1; i < next.length - 1; i++) {
    if (isLetter(next[i]) && isDiaMark(next[i + 1])) return i;
  }
  return 0;
}

export function getPreviousLetter(letters: number[], index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (isLetter(letters[i])) return i;
  }
  return -1;
}

export function getNextLetter(letters: number[], index: number): number {
  for (let i = index + 1; i < letters.length; i++) {
    if (isLetter(letters[i])) return i;
  }
  return -1;
}

export function getTashkeelForLetter(letters: number[], index: number): number {
  if (index + 1 < letters.length && isDiaMark(letters[index + 1])) {
    return index + 1;
  }
  return -1;
}

