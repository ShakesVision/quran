/**
 * Arabic character constants used in Tajweed rule detection.
 * Ported from https://github.com/quran/tajweed (Java → TypeScript)
 */

// ─── Diacritics / Tashkeel ────────────────────────────────────────
export const FATHA_TANWEEN  = 0x064B;
export const DAMMA_TANWEEN  = 0x064C;
export const KASRA_TANWEEN  = 0x064D;
export const FATHA          = 0x064E;
export const DAMMA          = 0x064F;
export const KASRA          = 0x0650;
export const SUKUN          = 0x0610;
export const SHADDA         = 0x0651;
export const SMALL_ALEF     = 0x0670;   // superscript alef
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
    c === SMALL_HIGH_JEEM || c === SMALL_THREE_DOTS;
}

export function isLetter(c: number): boolean {
  return !isEndMark(c) && !isDiaMark(c) && c !== 0x20 && c !== TATWEEL;
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

