/**
 * Tajweed rules – faithful TypeScript port of the Java rules from
 * https://github.com/quran/tajweed
 *
 * Each rule implements `checkAyah(text) → TajweedResult[]`.
 * We only implement Madani mode (isNaskh = false) for now.
 */

import * as C from './characters';
import { TajweedResult, TwoPartResult, ResultType } from './models';

export interface TajweedRule {
  checkAyah(ayah: string): TajweedResult[];
}

// ─────────────────────────────────────────────────────────────────
// 1. Ghunna  (noon shadda / meem shadda)
// ─────────────────────────────────────────────────────────────────
export class GhunnaRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    for (let i = 0; i < ayah.length; i++) {
      const next = C.getNextChars(ayah, i);
      const cur = next[0];
      if ((cur === C.NOON || cur === C.MEEM) &&
        (next[1] === C.SHADDA || next[2] === C.SHADDA)) {
        const endPos = i + C.findRemainingMarks(next);
        results.push(new TajweedResult(ResultType.GHUNNA, i, endPos));
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. Idgham  (يرملون after noon saakin / tanween)
// ─────────────────────────────────────────────────────────────────
export class IdghamRule implements TajweedRule {
  private isYarmaloon(c: number): boolean {
    return c === C.RA || c === C.LAM || c === C.YA ||
      c === C.NOON || c === C.MEEM || c === C.WAW;
  }
  private isGhunna(c: number): boolean {
    return c === C.YA || c === C.NOON || c === C.MEEM || c === C.WAW;
  }

  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    const cps = Array.from(ayah).map(ch => ch.codePointAt(0)!);
    for (let i = 0; i < cps.length; i++) {
      const cur = cps[i];
      if (!this.isYarmaloon(cur)) continue;
      const prevMatch = this.isValidIdgham(ayah, i);
      if (prevMatch >= 0) {
        if (this.isGhunna(cur)) {
          results.push(new TwoPartResult(
            ResultType.IDGHAM_WITH_GHUNNA, i, i + 1,
            ResultType.IDGHAM_NOT_PRONOUNCED, prevMatch, prevMatch + 1));
        } else {
          results.push(new TajweedResult(
            ResultType.IDGHAM_WITHOUT_GHUNNA, prevMatch, prevMatch + 1));
        }
      }
    }
    return results;
  }

  private isValidIdgham(ayah: string, index: number): number {
    const prev = C.getPreviousCharacter(ayah, index);
    let prevIdx = prev.index;
    let prevCh = prev.character;
    let result = false;

    if (prevCh === C.FATHA_TANWEEN || prevCh === C.DAMMA_TANWEEN ||
      prevCh === C.KASRA_TANWEEN || prevCh === C.NOON) {
      result = true;
    } else if (prev.index > 0 && (prevCh === C.ALEF_LAYINA || prevCh === C.ALEF)) {
      prevCh = ayah.codePointAt(prev.index)!;
      if (prev.index > 0) prevCh = ayah.codePointAt(prev.index - 1)!;
      result = prevCh === C.FATHA_TANWEEN;
      prevIdx = prev.index - 1;
    }
    return result ? prevIdx : -1;
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. Ikhfa  (noon saakin / tanween before 15 specific letters)
// ─────────────────────────────────────────────────────────────────
const IKHFA_LETTERS = new Set([
  C.TA, C.THAA, C.JEEM, C.DAAL, C.ZAAL, C.ZA, C.SEEN, C.SHEEN,
  C.SAAD, C.DAAD, C.TAA, C.ZAA, C.FAA, C.QAAF, C.KAAF,
]);

export class IkhfaRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    for (let i = 0; i < ayah.length; i++) {
      const next = C.getNextChars(ayah, i);
      if ((C.isTanween(next[0]) || C.isNoonSaakin(next)) &&
        IKHFA_LETTERS.has(next[C.findNextLetterPronounced(next)])) {
        const startPos = i;
        const endPos = i + C.findRemainingMarks(next);
        results.push(new TajweedResult(ResultType.IKHFA, startPos, endPos));
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. Iqlab  (noon saakin / tanween before ب)
// ─────────────────────────────────────────────────────────────────
export class IqlabRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    let index = -1;
    while ((index = ayah.indexOf(String.fromCodePoint(C.BA), index + 1)) > -1) {
      const prev = C.getPreviousCharacter(ayah, index);
      if (C.isTanween(prev.character) || prev.character === C.NOON) {
        results.push(new TwoPartResult(
          ResultType.IQLAB, index, index + 1,
          ResultType.IQLAB_NOT_PRONOUNCED, prev.index, prev.index + 1));
      } else if (prev.character === C.SMALL_HIGH_MEEM_ISOLATED) {
        const actual = C.getPreviousCharacter(ayah, prev.index);
        if (actual.character === C.NOON) {
          results.push(new TwoPartResult(
            ResultType.IQLAB, prev.index, index + 1,
            ResultType.IQLAB_NOT_PRONOUNCED, actual.index, prev.index));
        }
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────
// 5. Qalqalah  (قطبجد with sukoon or stopping)
// ─────────────────────────────────────────────────────────────────
const QALQALAH_LETTERS = new Set([C.DAAL, C.BA, C.JEEM, C.QAAF, C.TAA]);

export class QalqalahRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    for (let i = 0; i < ayah.length; i++) {
      const next = C.getNextChars(ayah, i);
      const cur = next[0];
      if (!QALQALAH_LETTERS.has(cur)) continue;

      if ((next[1] === C.SUKUN || next[1] === C.JAZM) ||
        next[1] === 0x20 || C.isLetter(next[1]) || this.weStopping(next)) {
        let endPos = i + 1;
        if (next[1] === C.SUKUN || next[1] === C.JAZM) endPos++;

        // Skip if followed by shadda (no qalqalah in that case)
        if ((next[1] === C.SUKUN || next[1] === C.JAZM) ||
          next[1] === 0x20 || C.isLetter(next[1])) {
          let skip = false;
          for (let j = 1; j < next.length - 2 && next[j] !== 0; j++) {
            if (C.isLetter(next[j]) &&
              (next[j + 1] === C.SHADDA || next[j + 2] === C.SHADDA)) {
              skip = true;
              break;
            }
            break; // only need first iteration per original logic
          }
          if (!skip) results.push(new TajweedResult(ResultType.QALQALAH, i, endPos));
        } else {
          results.push(new TajweedResult(ResultType.QALQALAH, i, endPos));
        }
      }
    }
    return results;
  }

  private weStopping(next: number[]): boolean {
    for (let i = 1; i < next.length; i++) {
      if ((C.isEndMark(next[i]) && next[i] !== C.SMALL_LAAM_ALEF &&
        next[i] !== C.SMALL_THREE_DOTS) || next[i] === 0) {
        return true;
      }
      if (C.isLetter(next[i])) break;
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// 6. Meem rules  (ikhfa shafawi / idgham shafawi)
// ─────────────────────────────────────────────────────────────────
export class MeemRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    for (let i = 0; i < ayah.length; i++) {
      const next = C.getNextChars(ayah, i);
      if (!C.isMeemSaakin(next)) continue;
      for (let j = 1; j < next.length && next[j] !== 0; j++) {
        if (C.isLetter(next[j])) {
          if (next[j] === C.MEEM || next[j] === C.BA) {
            const endPos = i + C.findRemainingMarks(next);
            results.push(new TajweedResult(
              next[j] === C.MEEM ? ResultType.MEEM_IDGHAM : ResultType.MEEM_IKHFA,
              i, endPos));
          }
          break;
        }
      }
    }
    return results;
  }
}

// ─────────────────────────────────────────────────────────────────
// 7. Maad  (prolongation rules)
// ─────────────────────────────────────────────────────────────────
const MAAD_LETTERS = new Set([
  C.ALEF, C.WAW, C.YA, C.ALEF_LAYINA,
  C.ALEF_SUGHRA, C.WAW_SUGHRA, C.YA_SUGHRA,
]);

export class MaadRule implements TajweedRule {
  checkAyah(ayah: string): TajweedResult[] {
    const results: TajweedResult[] = [];
    const chars = Array.from(ayah).map(ch => ch.codePointAt(0)!);
    for (let i = 0; i < chars.length; i++) {
      const explicit = this.isExplicitMaad(chars, i);
      if (this.isHarfMaad(chars, i)) {
        if (explicit) {
          results.push(new TajweedResult(ResultType.MAAD_MUNFASSIL_MUTASSIL, i, i + 2));
          continue;
        }
        const nextChar = C.getNextLetter(chars, i);
        const nextTashkeel = nextChar > 0 ? C.getTashkeelForLetter(chars, nextChar) : -1;

        if (nextTashkeel > -1 && chars[nextTashkeel] === C.SHADDA) {
          results.push(new TajweedResult(ResultType.MAAD_LONG, i, i + 1));
        } else if (nextChar > -1 && chars[nextChar] === C.HAMZA) {
          results.push(new TajweedResult(ResultType.MAAD_MUNFASSIL_MUTASSIL, i, i + 1));
        } else if (
          (nextTashkeel > -1 && chars[nextTashkeel] === C.SUKUN) ||
          (nextChar > -1 && C.getNextLetter(chars, nextChar) === -1)
        ) {
          results.push(new TajweedResult(ResultType.MAAD_SUKOON, i, i + 1));
        } else if (chars[i] === C.ALEF_SUGHRA || chars[i] === C.WAW_SUGHRA ||
          chars[i] === C.YA_SUGHRA) {
          results.push(new TajweedResult(ResultType.MAAD_SILA_SUGHRA, i, i + 1));
        }
      } else if (explicit) {
        results.push(new TajweedResult(ResultType.MAAD_LONG, i, i + 2));
      }
    }
    return results;
  }

  private isHarfMaad(chars: number[], index: number): boolean {
    if (!MAAD_LETTERS.has(chars[index])) return false;
    const tashkeel = C.getTashkeelForLetter(chars, index);
    if (tashkeel === -1) {
      const prev = C.getPreviousLetter(chars, index);
      if (prev > -1) {
        const prevT = C.getTashkeelForLetter(chars, prev);
        return prevT > -1 && (
          (chars[prevT] === C.FATHA &&
            (chars[index] === C.ALEF || chars[index] === C.ALEF_SUGHRA)) ||
          (chars[prevT] === C.DAMMA &&
            (chars[index] === C.WAW || chars[index] === C.WAW_SUGHRA)) ||
          (chars[prevT] === C.KASRA &&
            (chars[index] === C.YA || chars[index] === C.ALEF_LAYINA ||
              chars[index] === C.YA_SUGHRA))
        );
      }
    } else if (chars[tashkeel] === C.MAAD_MARKER) {
      return true;
    }
    return false;
  }

  private isExplicitMaad(chars: number[], index: number): boolean {
    const tashkeel = C.getTashkeelForLetter(chars, index);
    return tashkeel > -1 && chars[tashkeel] === C.MAAD_MARKER;
  }
}

