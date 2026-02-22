import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, tap, catchError } from "rxjs/operators";

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
  lemma?: string; // Arabic lemma
  root?: string; // Arabic root
  rootBw?: string; // Buckwalter root
  lemmaBw?: string; // Buckwalter lemma
  features?: string; // Gender/number features
  prefix?: string; // Prefix tags
  suffix?: string; // Suffix info
  verbForm?: string; // Verb form
  aspect?: string; // Verb aspect
  aspectLabel?: string;
  voice?: string; // Verb voice
  voiceLabel?: string;
  state?: string; // Grammatical case
  stateLabel?: string;
  derivation?: string;
  derivationLabel?: string;
  segmentCount?: number;
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

  constructor(private http: HttpClient) {}

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
    return this.loadSurahData(surah).pipe(
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
    return this.loadSurahData(surah).pipe(
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

    return {
      pos,
      posLabel: POS_LABELS[pos] || pos,
      lemma: arLem,
      root: arRoot,
      rootBw: root,
      lemmaBw: lem,
      features: features ? this.expandFeatures(features) : undefined,
      prefix: prefix ? this.expandPrefixes(prefix) : undefined,
      suffix,
      verbForm: verbForm
        ? VERB_FORM_LABELS[verbForm] || `Form ${verbForm}`
        : undefined,
      aspect,
      aspectLabel: aspect ? ASPECT_LABELS[aspect] || aspect : undefined,
      voice,
      voiceLabel: voice ? VOICE_LABELS[voice] || voice : undefined,
      state,
      stateLabel: state ? STATE_LABELS[state] || state : undefined,
      derivation,
      derivationLabel: derivation
        ? DERIVATION_LABELS[derivation] || derivation
        : undefined,
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
}
