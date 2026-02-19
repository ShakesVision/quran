/**
 * Tajweed Highlighting Library
 * ────────────────────────────
 * Offline, client-side tajweed rule detection and coloring.
 * Ported from https://github.com/quran/tajweed (Java → TypeScript)
 *
 * Usage:
 *   import { applyTajweed } from 'src/app/lib/tajweed';
 *   const html = applyTajweed('ٱلْحَمْدُ لِلَّـهِ رَبِّ ٱلْعَـٰلَمِينَ');
 *   // returns HTML with <span class="tj-ghunna"> etc.
 *
 * SAFETY NOTE:
 * This library ONLY wraps character ranges with <span> tags.
 * It NEVER removes, replaces, or reorders any codepoints from the input.
 * The original Arabic text is always preserved exactly.
 */

import {
  TajweedResult, TwoPartResult,
  sortResults, fixOverlapping,
  ResultType, DEFAULT_COLORS,
} from './models';
import {
  GhunnaRule, IdghamRule, IkhfaRule, IqlabRule,
  QalqalahRule, MeemRule, MaadRule,
  TajweedRule,
} from './rules';

export { ResultType, DEFAULT_COLORS } from './models';

/** All Madani-mode rules. */
const MADANI_RULES: TajweedRule[] = [
  new GhunnaRule(),
  new IdghamRule(),
  new IkhfaRule(),
  new IqlabRule(),
  new MeemRule(),
  new QalqalahRule(),
  new MaadRule(),
];

/**
 * Normalize IndoPak / archive text to standard Arabic for tajweed analysis.
 * The normalization only maps variant codepoints used in IndoPak text to their
 * standard Arabic equivalents so that the tajweed rules can detect them.
 *
 * IMPORTANT: The normalized text is used ONLY for rule detection (position finding).
 * The original text is preserved for display output — positions map 1:1 since
 * every replacement is exactly one codepoint → one codepoint (same string length).
 */
function normalizeForTajweed(text: string): string {
  // Each mapping: IndoPak variant → standard Arabic equivalent
  return text
    .replace(/\u06C1/g, '\u0647')   // Heh Goal → Heh
    .replace(/\u06BE/g, '\u0647')   // Heh Doachashmee → Heh
    .replace(/\u06CC/g, '\u064A')   // Farsi Yeh → Arabic Yeh
    .replace(/\u06A9/g, '\u0643')   // Keheh → Kaf
    .replace(/\u06C3/g, '\u0629');  // Teh Marbuta Goal → Teh Marbuta
}

/**
 * Apply tajweed colour highlighting to a piece of Arabic text.
 *
 * @param text  The Arabic text (Uthmani or Indopak)
 * @param mode  'class' → `<span class="tj-ghunna">`, 'inline' → `<span style="color:#...">`
 * @returns     HTML string with the SAME text wrapped in <span> tags for colouring.
 *              The returned string contains zero edits to the actual Arabic codepoints.
 */
export function applyTajweed(
  text: string,
  mode: 'class' | 'inline' = 'class'
): string {
  if (!text || text.trim().length === 0) return text;

  // Normalize text for rule analysis (IndoPak → standard Arabic mapping).
  // Positions are preserved 1:1, so results from normalized text apply to original.
  const normalized = normalizeForTajweed(text);

  // 1. Collect results from every rule (using normalized text)
  const results: TajweedResult[] = [];
  for (const rule of MADANI_RULES) {
    try {
      results.push(...rule.checkAyah(normalized));
    } catch {
      // If one rule fails, others still work
    }
  }

  if (results.length === 0) return escapeHtml(text);

  // 2. Sort and fix overlaps
  sortResults(results);
  fixOverlapping(results);

  // 3. Build HTML output (using ORIGINAL text for display, normalized positions)
  const buf: string[] = [];
  let cursor = 0;

  for (const r of results) {
    const minStart = r.getMinStart();
    const maxEnd = r.getMaxEnd();

    // Emit un-highlighted text before this result
    if (minStart > cursor) {
      buf.push(escapeHtml(text.substring(cursor, minStart)));
    }

    if (r instanceof TwoPartResult) {
      const tp = r;
      if (minStart === tp.start) {
        // first part, then second
        emitSpan(buf, text, tp.resultType, tp.start, tp.ending, mode);
        if (tp.secondStart > tp.ending) {
          buf.push(escapeHtml(text.substring(tp.ending, tp.secondStart)));
        }
        emitSpan(buf, text, tp.secondResultType, tp.secondStart, tp.secondEnding, mode);
      } else {
        // second part, then first
        emitSpan(buf, text, tp.secondResultType, tp.secondStart, tp.secondEnding, mode);
        if (tp.start > tp.secondEnding) {
          buf.push(escapeHtml(text.substring(tp.secondEnding, tp.start)));
        }
        emitSpan(buf, text, tp.resultType, tp.start, tp.ending, mode);
      }
    } else {
      emitSpan(buf, text, r.resultType, r.start, r.ending, mode);
    }

    cursor = maxEnd;
  }

  // Remaining text
  if (cursor < text.length) {
    buf.push(escapeHtml(text.substring(cursor)));
  }

  return buf.join('');
}

// ─── Helpers ─────────────────────────────────────────────────────

function emitSpan(
  buf: string[], text: string,
  type: ResultType, start: number, end: number,
  mode: 'class' | 'inline'
): void {
  // Clamp to valid range
  const s = Math.max(0, start);
  const e = Math.min(text.length, end);
  if (s >= e) return;

  const slice = escapeHtml(text.substring(s, e));
  if (mode === 'class') {
    buf.push(`<span class="tj-${type}">${slice}</span>`);
  } else {
    const colour = DEFAULT_COLORS[type] || '#000';
    buf.push(`<span style="color:${colour}">${slice}</span>`);
  }
}

function escapeHtml(str: string): string {
  // Only escape characters that could break HTML structure.
  // We MUST NOT touch Arabic codepoints.
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Human-readable names for the legend.
 */
export const TAJWEED_LEGEND: { type: ResultType; label: string; labelAr: string; color: string }[] = [
  { type: ResultType.GHUNNA,                  label: 'Ghunnah',               labelAr: 'غنّہ',              color: '#43A047' },
  { type: ResultType.IKHFA,                   label: 'Ikhfa',                 labelAr: 'اخفاء',             color: '#EACE00' },
  { type: ResultType.IDGHAM_WITH_GHUNNA,      label: 'Idgham',                labelAr: 'ادغام',             color: '#43A047' },
  { type: ResultType.IQLAB,                   label: 'Iqlab',                 labelAr: 'اقلاب',             color: '#43A047' },
  { type: ResultType.QALQALAH,                label: 'Qalqalah',              labelAr: 'قلقلہ',             color: '#0091EA' },
  { type: ResultType.MEEM_IKHFA,              label: 'Ikhfa Shafawi',         labelAr: 'اخفاء شفوی',        color: '#EACE00' },
  { type: ResultType.MEEM_IDGHAM,             label: 'Idgham Shafawi',        labelAr: 'ادغام شفوی',        color: '#43A047' },
  { type: ResultType.MAAD_LONG,               label: 'Madd Lazim (6)',        labelAr: 'مد لازم',           color: '#B71C1C' },
  { type: ResultType.MAAD_MUNFASSIL_MUTASSIL, label: 'Madd Muttasil (4-5)',   labelAr: 'مد متصل/منفصل',     color: '#F44336' },
  { type: ResultType.MAAD_SUKOON,             label: 'Madd \'Aarid (2-6)',    labelAr: 'مد عارض للسکون',    color: '#FB8C00' },
];

