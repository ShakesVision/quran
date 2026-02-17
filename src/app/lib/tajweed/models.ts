/**
 * Tajweed result types and models.
 * Ported from https://github.com/quran/tajweed (Java → TypeScript)
 *
 * Color values are CSS-friendly hex strings (without #).
 * They serve as DEFAULTS; the consuming app should map ResultType → CSS class
 * and let the user override via CSS variables.
 */

export enum ResultType {
  // ── Madani mode ────────────────────────────────
  GHUNNA                  = 'ghunna',
  IDGHAM_NOT_PRONOUNCED   = 'idgham_not_pronounced',
  IDGHAM_WITH_GHUNNA      = 'idgham_with_ghunna',
  IDGHAM_WITHOUT_GHUNNA   = 'idgham_without_ghunna',
  IQLAB_NOT_PRONOUNCED    = 'iqlab_not_pronounced',
  IQLAB                   = 'iqlab',
  QALQALAH                = 'qalqalah',
  MEEM_IDGHAM             = 'meem_idgham',
  MEEM_IKHFA              = 'meem_ikhfa',
  IKHFA                   = 'ikhfa',
  MAAD_SUKOON             = 'maad_sukoon',
  MAAD_MUNFASSIL_MUTASSIL = 'maad_munfassil',
  MAAD_SILA_SUGHRA        = 'maad_sila',
  MAAD_LONG               = 'maad_long',

  // ── Naskh mode (optional, not used for now) ────
  GHUNNA_NASKH            = 'ghunna_naskh',
  IQLAB_NASKH             = 'iqlab_naskh',
  QALQALAH_NASKH          = 'qalqalah_naskh',
  MEEM_IKHFA_NASKH        = 'meem_ikhfa_naskh',
  IKHFA_NASKH             = 'ikhfa_naskh',
  MEEM_IDGHAM_NASKH       = 'meem_idgham_naskh',
}

/** Default colour palette (Madani mushaf style). */
export const DEFAULT_COLORS: Record<ResultType, string> = {
  [ResultType.GHUNNA]:                  '#43A047',
  [ResultType.IDGHAM_NOT_PRONOUNCED]:   '#9E9E9E',
  [ResultType.IDGHAM_WITH_GHUNNA]:      '#43A047',
  [ResultType.IDGHAM_WITHOUT_GHUNNA]:   '#9E9E9E',
  [ResultType.IQLAB_NOT_PRONOUNCED]:    '#9E9E9E',
  [ResultType.IQLAB]:                   '#43A047',
  [ResultType.QALQALAH]:               '#0091EA',
  [ResultType.MEEM_IDGHAM]:            '#43A047',
  [ResultType.MEEM_IKHFA]:             '#EACE00',
  [ResultType.IKHFA]:                  '#EACE00',
  [ResultType.MAAD_SUKOON]:            '#FB8C00',
  [ResultType.MAAD_MUNFASSIL_MUTASSIL]:'#F44336',
  [ResultType.MAAD_SILA_SUGHRA]:       '#FFE0B2',
  [ResultType.MAAD_LONG]:              '#B71C1C',
  [ResultType.GHUNNA_NASKH]:           '#FB8C00',
  [ResultType.IQLAB_NASKH]:            '#B100B1',
  [ResultType.QALQALAH_NASKH]:        '#F44336',
  [ResultType.MEEM_IKHFA_NASKH]:      '#FFA7B6',
  [ResultType.IKHFA_NASKH]:           '#0091EA',
  [ResultType.MEEM_IDGHAM_NASKH]:     '#BECE75',
};

export class TajweedResult {
  start: number;
  ending: number;
  oldEnding: number;
  readonly resultType: ResultType;

  constructor(type: ResultType, start: number, ending: number) {
    this.resultType = type;
    this.start = start;
    this.ending = ending;
    this.oldEnding = ending;
  }

  getMinStart(): number { return this.start; }
  getMaxEnd(): number { return this.ending; }

  setMaxEnd(v: number) {
    this.oldEnding = this.ending;
    this.ending = v;
  }
}

export class TwoPartResult extends TajweedResult {
  readonly secondStart: number;
  readonly secondEnding: number;
  readonly secondResultType: ResultType;

  constructor(
    type: ResultType, start: number, ending: number,
    secondType: ResultType, secondStart: number, secondEnding: number
  ) {
    super(type, start, ending);
    this.secondResultType = secondType;
    this.secondStart = secondStart;
    this.secondEnding = secondEnding;
  }

  override getMinStart(): number { return Math.min(this.start, this.secondStart); }
  override getMaxEnd(): number { return Math.max(this.ending, this.secondEnding); }
}

// ── Result sorting & overlap fix ─────────────────────────────────

export function sortResults(results: TajweedResult[]): void {
  results.sort((a, b) => a.getMinStart() - b.getMinStart());
}

export function fixOverlapping(results: TajweedResult[]): void {
  const toRemove: Set<TajweedResult> = new Set();
  for (let i = 1; i < results.length; i++) {
    const cur = results[i];
    const prev = results[i - 1];
    const min = cur.getMinStart();
    const prevMax = prev.getMaxEnd();
    if (prevMax > min) {
      if (prev.resultType === ResultType.GHUNNA || prevMax - min <= 0) {
        toRemove.add(prev);
      } else {
        prev.setMaxEnd(min);
      }
    }
  }
  // Remove in reverse to avoid index shift
  for (let i = results.length - 1; i >= 0; i--) {
    if (toRemove.has(results[i])) results.splice(i, 1);
  }
}

