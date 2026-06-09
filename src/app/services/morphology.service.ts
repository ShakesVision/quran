import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { from, Observable, of } from "rxjs";
import { map, tap, catchError, switchMap } from "rxjs/operators";

/**
 * Compact morphology data format:
 * Array index mapping (COMPACT_FIELDS):
 *   0: pos    - Part of speech (n, v, adj, pn, pro, p, conj, det, etc.)
 *   1: lem    - Lemma (Buckwalter transliteration)
 *   2: root   - Root (Buckwalter transliteration)
 *   3: arRoot - Arabic root
 *   4: arLem  - Arabic lemma (with diacritics)
 *   5: f      - Features (gender, number, etc.)
 *   6: pre    - Prefix tags
 *   7: suf    - Suffix info
 *   8: vf     - Verb form (1-10)
 *   9: asp    - Aspect (pf=perfect, im=imperfect, iv=imperative)
 *  10: voi    - Voice (act=active, pas=passive)
 *  11: st     - State/case (nom, acc, gen, jus, sub)
 *  12: der    - Derivation (pcpl=participle, vn=verbal noun)
 *  13: sc     - Segment count
 */

export interface WordMorphology {
  pos: string; // Part of speech
  posLabel: string; // Human-readable POS label
  posLabelAr?: string;
  lemma?: string; // Arabic lemma
  root?: string; // Arabic root
  rootBw?: string; // Buckwalter root
  lemmaBw?: string; // Buckwalter lemma
  features?: string; // Gender/number features
  featuresAr?: string;
  prefix?: string; // Prefix tags
  prefixAr?: string;
  suffix?: string; // Suffix info
  verbForm?: string; // Verb form
  verbFormAr?: string;
  aspect?: string; // Verb aspect
  aspectLabel?: string;
  aspectLabelAr?: string;
  voice?: string; // Verb voice
  voiceLabel?: string;
  voiceLabelAr?: string;
  state?: string; // Grammatical case
  stateLabel?: string;
  stateLabelAr?: string;
  derivation?: string;
  derivationLabel?: string;
  derivationLabelAr?: string;
  segmentCount?: number;
}

interface MorphologyTermsAr {
  types?: Record<string, string>;
  particles?: Record<string, string>;
  noun_forms?: Record<string, string>;
  noun_grammar?: Record<string, string>;
  attrs?: Record<string, string>;
  verb_forms_tri?: string[];
  verb_forms_quad?: string[];
  verb_tenses?: Record<string, string>;
  verb_grammar?: Record<string, string>;
  pronoun_attrs?: Record<string, string>;
  labels?: Record<string, string>;
  other?: Record<string, string>;
  FAM?: Record<string, string>;
}

// POS tag to human-readable labels
const POS_LABELS: Record<string, string> = {
  n: "Noun",
  pn: "Proper Noun",
  adj: "Adjective",
  v: "Verb",
  pro: "Pronoun",
  dem: "Demonstrative",
  rel: "Relative Pronoun",
  t: "Time Adverb",
  loc: "Location Adverb",
  p: "Preposition",
  conj: "Conjunction",
  sub: "Subordinating Conj.",
  acc: "Accusative Particle",
  neg: "Negative Particle",
  det: "Determiner",
  emp: "Emphatic Particle",
  cond: "Conditional",
  intg: "Interrogative",
  res: "Restriction",
  cert: "Certainty Particle",
  voc: "Vocative",
  rslt: "Result",
  prp: "Purpose",
  circ: "Circumstantial",
  sup: "Supplemental",
  prev: "Preventive",
  fut: "Future",
  ret: "Retraction",
  exp: "Exceptive",
  inc: "Inceptive",
  caus: "Cause",
  impv: "Imperative Particle",
  exl: "Exclamation",
  amd: "Amendment",
  int: "Interpretation",
  exh: "Exhortation",
  ans: "Answer",
  sur: "Surprise",
  avr: "Aversion",
  inl: "Quranic Initials",
  rem: "Resumption",
  eq: "Equalization",
  com: "Comitative",
  impn: "Impersonal",
};

const ASPECT_LABELS: Record<string, string> = {
  pf: "Perfect (Past)",
  im: "Imperfect (Present/Future)",
  iv: "Imperative",
};

const VOICE_LABELS: Record<string, string> = {
  act: "Active",
  pas: "Passive",
};

const STATE_LABELS: Record<string, string> = {
  nom: "Nominative (مرفوع)",
  acc: "Accusative (منصوب)",
  gen: "Genitive (مجرور)",
  jus: "Jussive (مجزوم)",
  sub: "Subjunctive (منصوب)",
};

const DERIVATION_LABELS: Record<string, string> = {
  pcpl: "Active Participle",
  vn: "Verbal Noun",
};

const FEATURE_LABELS: Record<string, string> = {
  m: "Masculine",
  f: "Feminine",
  s: "Singular",
  d: "Dual",
  p: "Plural",
  ms: "Masc. Sing.",
  fs: "Fem. Sing.",
  md: "Masc. Dual",
  fd: "Fem. Dual",
  mp: "Masc. Plural",
  fp: "Fem. Plural",
  "1s": "1st Person Sing.",
  "1p": "1st Person Plural",
  "2ms": "2nd Person Masc. Sing.",
  "2fs": "2nd Person Fem. Sing.",
  "2d": "2nd Person Dual",
  "2mp": "2nd Person Masc. Plural",
  "2fp": "2nd Person Fem. Plural",
  "3ms": "3rd Person Masc. Sing.",
  "3fs": "3rd Person Fem. Sing.",
  "3d": "3rd Person Dual",
  "3md": "3rd Person Masc. Dual",
  "3fd": "3rd Person Fem. Dual",
  "3mp": "3rd Person Masc. Plural",
  "3fp": "3rd Person Fem. Plural",
};

const VERB_FORM_LABELS: Record<string, string> = {
  "1": "Form I (فَعَلَ)",
  "2": "Form II (فَعَّلَ)",
  "3": "Form III (فَاعَلَ)",
  "4": "Form IV (أَفْعَلَ)",
  "5": "Form V (تَفَعَّلَ)",
  "6": "Form VI (تَفَاعَلَ)",
  "7": "Form VII (اِنْفَعَلَ)",
  "8": "Form VIII (اِفْتَعَلَ)",
  "9": "Form IX (اِفْعَلَّ)",
  "10": "Form X (اِسْتَفْعَلَ)",
};

@Injectable({
  providedIn: "root",
})
export class MorphologyService {
  // Cache loaded surah data: Map<surahNumber, Map<"surah:ayah", word[]>>
  private cache: Map<number, any> = new Map();
  private termsAr: MorphologyTermsAr | null = null;
  private termsLoading: Promise<void> | null = null;

  constructor(private http: HttpClient) {
    this.ensureTermsLoaded();
  }

  /** English + Arabic label for UI (e.g. "Noun · اسم"). */
  formatBilingual(en?: string, ar?: string): string {
    if (!en) {
      return ar || "";
    }
    if (!ar || ar === en) {
      return en;
    }
    return `${en} · ${ar}`;
  }

  private ensureTermsLoaded(): Promise<void> {
    if (!this.termsLoading) {
      this.termsLoading = this.http
        .get<MorphologyTermsAr>("assets/data/morphology-terms-ar.json")
        .pipe(
          tap((t) => {
            this.termsAr = t;
          }),
          catchError(() => {
            this.termsAr = {};
            return of(null);
          }),
          map(() => undefined),
        )
        .toPromise()
        .then(() => undefined);
    }
    return this.termsLoading;
  }

  private lookupAr(code: string, voice?: string): string | undefined {
    if (!this.termsAr || !code) {
      return undefined;
    }
    const c = code.toUpperCase();
    const t = this.termsAr;
    return (
      t.types?.[c] ||
      t.particles?.[c] ||
      t.noun_forms?.[c] ||
      t.noun_grammar?.[c] ||
      t.attrs?.[c] ||
      t.verb_tenses?.[c] ||
      t.verb_grammar?.[c] ||
      t.pronoun_attrs?.[c] ||
      t.other?.[c] ||
      t.FAM?.[c] ||
      (c === "PCPL" && voice === "pas"
        ? t.noun_forms?.PASS_PCPL
        : c === "PCPL"
          ? t.noun_forms?.ACT_PCPL
          : undefined) ||
      (c === "VN" ? t.noun_forms?.VN : undefined)
    );
  }

  private lookupPosAr(pos: string): string | undefined {
    const map: Record<string, string> = {
      n: "N",
      pn: "PN",
      pro: "PRON",
      dem: "DEM",
      rel: "REL",
      t: "T",
      loc: "LOC",
      v: "V",
      cond: "COND",
      intg: "INTG",
      adj: "ADJ",
      p: "P",
      conj: "CONJ",
      sub: "SUB",
      acc: "ACC",
      neg: "NEG",
      det: "DET",
      emp: "EMPH",
      impv: "IMPV",
      res: "RES",
      cert: "CERT",
      voc: "VOC",
      rslt: "RSLT",
      prp: "PRP",
      circ: "CIRC",
      sup: "SUP",
      prev: "PREV",
      fut: "FUT",
      ret: "RET",
      exp: "EXP",
      inc: "INC",
      caus: "CAUS",
      exl: "EXL",
      amd: "AMD",
      int: "INT",
      exh: "EXH",
      ans: "ANS",
      sur: "SUR",
      avr: "AVR",
      inl: "INL",
      rem: "REM",
      eq: "EQ",
      com: "COM",
      impn: "NV",
    };
    return this.lookupAr(map[pos] || pos.toUpperCase());
  }

  private verbFormAr(formNum?: string): string | undefined {
    if (!formNum || !this.termsAr?.verb_forms_tri) {
      return undefined;
    }
    const idx = parseInt(formNum, 10) - 1;
    if (idx >= 0 && idx < this.termsAr.verb_forms_tri.length) {
      return this.termsAr.verb_forms_tri[idx];
    }
    return undefined;
  }

  /**
   * Get morphology data for a specific word.
   * @param surah Surah number (1-114)
   * @param ayah Ayah number
   * @param wordIndex Word index (1-based)
   * @returns Observable of WordMorphology or null
   */
  getWordMorphology(
    surah: number,
    ayah: number,
    wordIndex: number,
  ): Observable<WordMorphology | null> {
    return from(this.ensureTermsLoaded()).pipe(
      switchMap(() => this.loadSurahData(surah)),
      map((data) => {
        if (!data) return null;
        const ayahKey = `${surah}:${ayah}`;
        const ayahData = data[ayahKey];
        if (!ayahData) return null;
        // Compact format: array of word arrays, 0-indexed
        const wordArr = ayahData[wordIndex - 1];
        if (!wordArr) return null;
        return this.parseCompactWord(wordArr);
      }),
    );
  }

  /**
   * Get morphology for all words in an ayah.
   * @param surah Surah number (1-114)
   * @param ayah Ayah number
   * @returns Observable of WordMorphology[] or empty array
   */
  getAyahMorphology(surah: number, ayah: number): Observable<WordMorphology[]> {
    return from(this.ensureTermsLoaded()).pipe(
      switchMap(() => this.loadSurahData(surah)),
      map((data) => {
        if (!data) return [];
        const ayahKey = `${surah}:${ayah}`;
        const ayahData = data[ayahKey];
        if (!ayahData || !Array.isArray(ayahData)) return [];
        return ayahData
          .filter((w: any) => w !== null)
          .map((w: any) => this.parseCompactWord(w));
      }),
    );
  }

  /**
   * Get the corpus.quran.com URL for a word location.
   */
  getCorpusUrl(surah: number, ayah: number, wordIndex: number): string {
    return `http://corpus.quran.com/wordmorphology.jsp?location=(${surah}:${ayah}:${wordIndex})`;
  }

  /**
   * Get human-readable label for a feature string.
   */
  getFeatureLabel(feature: string): string {
    return FEATURE_LABELS[feature] || feature;
  }

  /**
   * Load surah morphology data from assets (lazy loaded, cached).
   */
  private loadSurahData(surah: number): Observable<any> {
    if (this.cache.has(surah)) {
      return of(this.cache.get(surah));
    }
    return this.http.get(`assets/data/morphology/${Number(surah)}.json`).pipe(
      tap((data) => {
        this.cache.set(surah, data);
      }),
      catchError((err) => {
        console.warn(`Morphology data not available for surah ${surah}:`, err);
        return of(null);
      }),
    );
  }

  /**
   * Parse compact array format into WordMorphology object.
   * Array fields: [pos, lem, root, arRoot, arLem, f, pre, suf, vf, asp, voi, st, der, sc]
   */
  private parseCompactWord(arr: any[]): WordMorphology {
    const pos = arr[0] || "";
    const lem = arr[1] || undefined;
    const root = arr[2] || undefined;
    const arRoot = arr[3] || undefined;
    const arLem = arr[4] || undefined;
    const features = arr[5] || undefined;
    const prefix = arr[6] || undefined;
    const suffix = arr[7] || undefined;
    const verbForm = arr[8] || undefined;
    const aspect = arr[9] || undefined;
    const voice = arr[10] || undefined;
    const state = arr[11] || undefined;
    const derivation = arr[12] || undefined;
    const segmentCount = arr[13] || undefined;

    const posLabel = POS_LABELS[pos] || pos;
    const posLabelAr = this.lookupPosAr(pos);
    const aspectLabel = aspect ? ASPECT_LABELS[aspect] || aspect : undefined;
    const aspectTermKey: Record<string, string> = {
      pf: "PERF",
      im: "IMPF",
      iv: "IMPV",
    };
    const aspectLabelAr = aspect
      ? this.lookupAr(aspectTermKey[aspect] || aspect.toUpperCase())
      : undefined;
    const voiceLabel = voice ? VOICE_LABELS[voice] || voice : undefined;
    const stateLabel = state ? STATE_LABELS[state] || state : undefined;
    const stateTermKey: Record<string, string> = {
      nom: "NOM",
      acc: "ACC",
      gen: "GEN",
      jus: "JUS",
      sub: "SUBJ",
      subj: "SUBJ",
      ind: "IND",
    };
    const stateLabelAr = state
      ? this.lookupAr(stateTermKey[state] || state.toUpperCase())
      : undefined;
    const derivationLabel = derivation
      ? DERIVATION_LABELS[derivation] || derivation
      : undefined;
    const derivationLabelAr = derivation
      ? this.lookupAr(derivation.toUpperCase(), voice)
      : undefined;
    const expandedFeatures = features ? this.expandFeatures(features) : undefined;
    const featuresAr = features ? this.expandFeaturesAr(features) : undefined;
    const expandedPrefix = prefix ? this.expandPrefixes(prefix) : undefined;
    const prefixAr = prefix ? this.expandPrefixesAr(prefix) : undefined;
    const verbFormEn = verbForm
      ? VERB_FORM_LABELS[verbForm] || `Form ${verbForm}`
      : undefined;
    const verbFormAr = this.verbFormAr(verbForm);

    return {
      pos,
      posLabel,
      posLabelAr,
      lemma: arLem,
      root: arRoot,
      rootBw: root,
      lemmaBw: lem,
      features: expandedFeatures,
      featuresAr,
      prefix: expandedPrefix,
      prefixAr,
      suffix,
      verbForm: verbFormEn,
      verbFormAr,
      aspect,
      aspectLabel,
      aspectLabelAr,
      voice,
      voiceLabel,
      state,
      stateLabel,
      stateLabelAr,
      derivation,
      derivationLabel,
      derivationLabelAr,
      segmentCount,
    };
  }

  /**
   * Expand compact feature codes to human-readable.
   * e.g. "ms" -> "Masc. Sing.", "3mp" -> "3rd Person Masc. Plural"
   */
  private expandFeatures(features: string): string {
    return features
      .split(",")
      .map((f) => FEATURE_LABELS[f.trim()] || f.trim())
      .filter((f) => f)
      .join(", ");
  }

  /**
   * Expand prefix tags to human-readable.
   */
  private expandPrefixes(prefix: string): string {
    return prefix
      .split("+")
      .map((p) => POS_LABELS[p.trim()] || p.trim())
      .filter((p) => p)
      .join(" + ");
  }

  private expandFeaturesAr(features: string): string {
    return features
      .split(",")
      .map((f) => {
        const code = f.trim();
        return (
          this.lookupAr(code.toUpperCase()) ||
          this.lookupAr(code) ||
          code
        );
      })
      .filter((f) => f)
      .join("، ");
  }

  private expandPrefixesAr(prefix: string): string {
    return prefix
      .split("+")
      .map((p) => this.lookupPosAr(p.trim()) || this.lookupAr(p.trim().toUpperCase()) || p.trim())
      .filter((p) => p)
      .join(" + ");
  }
}
