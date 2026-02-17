import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap, toArray } from 'rxjs/operators';
import {
  TextSource,
  TEXT_SOURCES,
  UserSourcePreference,
  QuranComChapterResponse,
  QuranComVerse,
  MUSHAF_CODES,
} from '../models/text-sources';
import { SurahService } from './surah.service';
import { AyahCard, CardDesign, CARD_PALETTES, CARD_PATTERNS, SURAH_NAMES_EN } from '../models/ayah-card';

/**
 * Available translation resource definition
 */
export interface TranslationResource {
  id: number;
  name: string;
  author: string;
  language: 'english' | 'urdu';
}

/**
 * All known translations used across the app (Discover pre-cache + Reader modal).
 * Translations marked with `cached: true` are bundled in comprehensive pre-cached data.
 */
export const AVAILABLE_TRANSLATIONS: TranslationResource[] = [
  // English translations (first 3 are in Discover cache)
  { id: 20, name: 'Saheeh International', author: 'Saheeh International', language: 'english' },
  { id: 85, name: 'Abdel Haleem', author: 'M.A.S. Abdel Haleem', language: 'english' },
  { id: 84, name: 'Mufti Taqi Usmani', author: 'Mufti Taqi Usmani', language: 'english' },
  { id: 95, name: 'Tafhim (Maududi)', author: 'Sayyid Abul Ala Maududi', language: 'english' },
  { id: 22, name: 'Yusuf Ali', author: 'Abdullah Yusuf Ali', language: 'english' },
  { id: 203, name: 'Al-Hilali & Khan', author: 'Al-Hilali & Khan', language: 'english' },
  // Urdu translations (first 2 are in Discover cache)
  { id: 97, name: 'Tafheem-ul-Quran', author: 'Syed Abu Ali Maududi', language: 'urdu' },
  { id: 54, name: 'Junagarhi', author: 'Maulana Muhammad Junagarhi', language: 'urdu' },
  { id: 234, name: 'Jalandhari', author: 'Fatah Muhammad Jalandhari', language: 'urdu' },
  { id: 151, name: 'Tafsir E Usmani', author: 'Shaykh al-Hind Mahmud al-Hasan', language: 'urdu' },
  { id: 158, name: 'Bayan-ul-Quran', author: 'Dr. Israr Ahmad', language: 'urdu' },
  { id: 156, name: 'Fe Zilal al-Quran', author: 'Sayyid Ibrahim Qutb', language: 'urdu' },
  { id: 819, name: 'Wahiduddin Khan', author: 'Maulana Wahiduddin Khan', language: 'urdu' },
];

export const DEFAULT_EN_TRANSLATION_ID = 20; // Saheeh International
export const DEFAULT_UR_TRANSLATION_ID = 97; // Maududi

export interface PageData {
  pageNumber: number;
  lines: string[];
  juzNumber: number;
  surahNumber: number;
  verses?: QuranComVerse[];
}

export interface JuzData {
  juzNumber: number;
  pages: string;
  rukuArray: any[];
  title: string;
  mode: 'juz' | 'surah';
}

export interface NavigationTarget {
  type: 'page' | 'juz' | 'surah' | 'ayah';
  page?: number;
  juz?: number;
  surah?: number;
  ayah?: number;
  ruku?: number;
}

export interface QuranComProgress {
  loaded: number;
  total: number;
  done: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class QuranDataService {
  private readonly STORAGE_KEY_SOURCE = 'selectedTextSource';
  private readonly STORAGE_KEY_QURAN = 'QuranData';
  private readonly STORAGE_KEY_CUSTOM_SOURCES = 'customSources';
  private readonly STORAGE_KEY_AYAH_DATA = 'QuranAyahData';
  private readonly STORAGE_KEY_AYAH_DATA_V2 = 'QuranAyahData_v2'; // Stores all translations per ayah
  private readonly STORAGE_KEY_PRECACHE_DONE = 'QuranPreCacheDone';
  private readonly STORAGE_KEY_EN_TRANSLATION = 'DiscoverEnTranslation';
  private readonly STORAGE_KEY_UR_TRANSLATION = 'DiscoverUrTranslation';

  /** User's preferred translation resource IDs for Discover */
  private selectedEnTranslationId: number = DEFAULT_EN_TRANSLATION_ID;
  private selectedUrTranslationId: number = DEFAULT_UR_TRANSLATION_ID;

  private quranComPageNumbers: number[] = [];
  private quranComPageIndexByNumber: Map<number, number> = new Map();
  private quranComPageMeta: Map<number, { juzs: Set<number>; surahs: Set<number> }> = new Map();

  /**
   * Ruku end positions for qurancom text (absolute page + line).
   * Stored as metadata instead of injecting ۧ into text.
   * Each entry = { page: mushaf page number, line: line number on that page }.
   */
  private quranComRukuPositions: { page: number; line: number }[] = [];

  /**
   * Ayah end positions for qurancom text.
   * Key = pages-array index (1-based, 0 = title page).
   * Value = array of {line (0-based), surah, ayah} sorted by occurrence.
   * Used by the reader for ayah detection since word.text doesn't contain ۝+digits.
   */
  private quranComAyahMap: Map<number, { line: number; surah: number; ayah: number }[]> = new Map();

  private currentSource$ = new BehaviorSubject<TextSource>(
    TEXT_SOURCES.find((s) => s.isDefault) || TEXT_SOURCES[0]
  );

  private quranData$ = new BehaviorSubject<string | null>(null);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private quranComProgress$ = new BehaviorSubject<QuranComProgress>({
    loaded: 0,
    total: 0,
    done: true,
  });

  constructor(
    private http: HttpClient,
    private storage: Storage,
    private surahService: SurahService
  ) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
    
    // Clean up old (pre-v2) qurancom cache entries that lack bismillah injection
    try {
      const keys = await this.storage.keys();
      for (const key of keys) {
        if (key.startsWith(this.STORAGE_KEY_QURAN + '_qurancom') && !key.includes('_raw_v2_')) {
          await this.storage.remove(key);
          console.log('Cleaned up old cache:', key);
        }
      }
    } catch (e) { /* ignore cleanup errors */ }

    // Load translation preferences for Discover
    try {
      const enId = await this.storage.get(this.STORAGE_KEY_EN_TRANSLATION);
      if (enId) this.selectedEnTranslationId = enId;
      const urId = await this.storage.get(this.STORAGE_KEY_UR_TRANSLATION);
      if (urId) this.selectedUrTranslationId = urId;
    } catch (e) { /* ignore */ }

    // Migrate old ayah cache to v2 format (store all translations)
    try {
      const oldCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA);
      const newCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA_V2);
      if (oldCache && !newCache) {
        // Old cache exists but no v2 — remove old so it re-downloads with all translations
        await this.storage.remove(this.STORAGE_KEY_AYAH_DATA);
        console.log('Removed old ayah cache to force v2 re-download with all translations');
      }
    } catch (e) { /* ignore */ }

    // Load custom sources first
    await this.loadCustomSources();
    
    // Then load the saved source preference
    const savedSourceId = await this.storage.get(this.STORAGE_KEY_SOURCE);
    if (savedSourceId) {
      const source = this.getAllSources().find((s) => s.id === savedSourceId);
      if (source) {
        this.currentSource$.next(source);
      }
    }
  }

  private customSources: TextSource[] = [];

  /**
   * Get all available text sources including custom ones
   */
  getAllSources(): TextSource[] {
    return [...TEXT_SOURCES, ...this.customSources];
  }

  /**
   * Load custom sources from storage
   */
  async loadCustomSources(): Promise<TextSource[]> {
    this.customSources = (await this.storage.get(this.STORAGE_KEY_CUSTOM_SOURCES)) || [];
    return this.customSources;
  }

  /**
   * Get the currently selected source
   */
  getCurrentSource(): Observable<TextSource> {
    return this.currentSource$.asObservable();
  }

  /**
   * Get the current source value synchronously
   */
  getCurrentSourceValue(): TextSource {
    return this.currentSource$.getValue();
  }

  /**
   * Get qurancom ruku positions (metadata, not in text).
   * Each entry = end of a ruku: { page: mushaf page#, line: line# on that page }.
   * The reader converts these to its own page indices for margin indicators.
   */
  getQuranComRukuPositions(): { page: number; line: number }[] {
    return this.quranComRukuPositions;
  }

  /**
   * Convert a mushaf page number to the 1-indexed page index in the built pages array.
   * (Index 0 = title page, so mushaf page 1 → index 1, etc.)
   */
  getQuranComPageIndex(mushafPageNumber: number): number | undefined {
    return this.quranComPageIndexByNumber.get(mushafPageNumber);
  }

  /**
   * Get ayah ends on a specific page (1-based page index in this.pages).
   * Returns [{line (0-based), surah, ayah}] sorted by occurrence, or null if not qurancom.
   */
  getQuranComAyahsForPage(pageIndex: number): { line: number; surah: number; ayah: number }[] | null {
    if (this.quranComAyahMap.size === 0) return null;
    return this.quranComAyahMap.get(pageIndex) || [];
  }

  /**
   * Count ayahs between two page:line positions (inclusive of start page, inclusive of end).
   * Used by the reader for ruku ayah counts when text doesn't contain ۝+digits.
   */
  countQuranComAyahsBetween(
    startPage: number, startLine: number,
    endPage: number, endLine: number
  ): number {
    if (this.quranComAyahMap.size === 0) return 0;
    let count = 0;
    for (let p = startPage; p <= endPage; p++) {
      const ayahs = this.quranComAyahMap.get(p);
      if (!ayahs) continue;
      for (const a of ayahs) {
        if (p === startPage && a.line < startLine) continue;
        if (p === endPage && a.line > endLine) continue;
        count++;
      }
    }
    return count;
  }

  /**
   * Set the active text source
   */
  async setSource(sourceId: string): Promise<void> {
    const source = this.getAllSources().find((s) => s.id === sourceId);
    if (source) {
      this.currentSource$.next(source);
      await this.storage.set(this.STORAGE_KEY_SOURCE, sourceId);
      // Clear cached data when source changes
      this.quranData$.next(null);
    }
  }

  /**
   * Load full Quran text based on current source
   */
  loadFullQuran(): Observable<string> {
    const source = this.currentSource$.getValue();

    if (source.type === 'archive') {
      return this.loadArchiveQuran(source);
    } else if (source.type === 'qurancom') {
      return this.loadQuranComQuran(source);
    } else if (source.type === 'custom') {
      return this.loadCustomQuran(source);
    }

    return of('');
  }

  /**
   * Load Quran from Archive repo (plain text)
   */
  private loadArchiveQuran(source: TextSource): Observable<string> {
    this.isLoading$.next(true);

    // Check cache first
    return from(this.storage.get(`${this.STORAGE_KEY_QURAN}_${source.id}`)).pipe(
      switchMap((cached) => {
        if (cached && !navigator.onLine) {
          console.log('Using cached archive data');
          return of(cached);
        }

        // Fetch from network
        const url = `${source.baseUrl}/Quran.txt`;
        return this.http.get(url, { responseType: 'text' }).pipe(
          tap((data) => {
            // Cache the data
            this.storage.set(`${this.STORAGE_KEY_QURAN}_${source.id}`, data);
          }),
          catchError((error) => {
            console.error('Failed to fetch archive Quran:', error);
            // Return cached data if available
            if (cached) return of(cached);
            throw error;
          })
        );
      }),
      tap((data) => {
        this.quranData$.next(data);
        this.isLoading$.next(false);
      })
    );
  }

  /**
   * Load Quran from a custom source (expects plain text like Archive)
   */
  private loadCustomQuran(source: TextSource): Observable<string> {
    this.isLoading$.next(true);
    const cacheKey = `${this.STORAGE_KEY_QURAN}_${source.id}`;

    return from(this.storage.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached && !navigator.onLine) {
          console.log('Using cached custom source data');
          return of(cached);
        }

        const url = source.baseUrl.endsWith('.txt')
          ? source.baseUrl
          : `${source.baseUrl}/Quran.txt`;

        return this.http.get(url, { responseType: 'text' }).pipe(
          tap((data) => {
            this.storage.set(cacheKey, data);
          }),
          catchError((error) => {
            console.error('Failed to fetch custom Quran:', error);
            if (cached) return of(cached);
            throw error;
          })
        );
      }),
      tap((data) => {
        this.quranData$.next(data);
        this.isLoading$.next(false);
      })
    );
  }

  /**
   * Load Quran from Quran.com API (JSON with word tracking)
   * This downloads all 114 chapters and combines them.
   * We cache the RAW chapter JSON so that buildQuranComText always runs
   * (it populates page metadata needed for juz/surah navigation).
   */
  private loadQuranComQuran(source: TextSource): Observable<string> {
    this.isLoading$.next(true);
    const totalChapters = 114;
    // v2 cache key: forces re-download after bismillah/header injection was added
    const rawCacheKey = `${this.STORAGE_KEY_QURAN}_raw_v2_${source.id}`;

    return from(this.storage.get(rawCacheKey)).pipe(
      switchMap((cachedChapters: QuranComChapterResponse[] | null) => {
        if (cachedChapters && cachedChapters.length === totalChapters) {
          console.log('Using cached quran.com chapter data, rebuilding text...');
          this.quranComProgress$.next({
            loaded: totalChapters,
            total: totalChapters,
            done: true,
          });
          // Always rebuild text from raw chapters (populates page metadata)
          return of(this.buildQuranComText(cachedChapters, source));
        }

        this.quranComProgress$.next({
          loaded: 0,
          total: totalChapters,
          done: false,
        });

        return this.fetchQuranComChapters(source).pipe(
          tap((chapters) => {
            // Cache the RAW chapter responses for future rebuilds
            this.storage.set(rawCacheKey, chapters);
          }),
          map((chapters) => this.buildQuranComText(chapters, source)),
          catchError((error) => {
            console.error('Failed to fetch Quran.com data:', error);
            throw error;
          })
        );
      }),
      tap((data) => {
        this.quranData$.next(data);
        this.isLoading$.next(false);
        this.quranComProgress$.next({
          loaded: totalChapters,
          total: totalChapters,
          done: true,
        });
      })
    );
  }

  private fetchQuranComChapters(source: TextSource): Observable<QuranComChapterResponse[]> {
    const chapters = Array.from({ length: 114 }, (_, i) => i + 1);
    const total = chapters.length;
    let loaded = 0;
    return from(chapters).pipe(
      mergeMap(
        (chapterId) =>
          this.http.get<QuranComChapterResponse>(`${source.baseUrl}/${chapterId}.json`).pipe(
          tap(() => {
            loaded += 1;
            this.quranComProgress$.next({
              loaded,
              total,
              done: loaded >= total,
            });
          }),
          catchError((error) => {
            console.warn(`Failed to fetch chapter ${chapterId}:`, error);
            loaded += 1;
            this.quranComProgress$.next({
              loaded,
              total,
              done: loaded >= total,
            });
            return of({ verses: [] } as QuranComChapterResponse);
          })
          ),
        6
      ),
      toArray()
    );
  }

  private buildQuranComText(chapters: QuranComChapterResponse[], source: TextSource): string {
    const pages: Map<number, Map<number, string[]>> = new Map();
    const pageMeta: Map<number, { juzs: Set<number>; surahs: Set<number> }> = new Map();
    let lastRukuNumber: number | null = null;

    // Track the first word position of each chapter for header/bismillah injection
    const chapterFirstWord: Map<number, { page: number; line: number }> = new Map();

    // Collect ruku end positions — ruku mark goes at the END of the last ayah of
    // each ruku (matching the archive text convention). We detect this when a new
    // ruku_number appears, marking the previous verse's last word line.
    const rukuPositions: { page: number; line: number }[] = [];
    let prevVerseLastWordPos: { page: number; line: number } | null = null;

    // Collect ayah end positions for metadata (since word.text for end markers
    // doesn't contain ۝+digits, the reader needs this for ayah detection).
    const ayahEnds: { mushafPage: number; line: number; surah: number; ayah: number }[] = [];

    chapters.forEach((chapter) => {
      (chapter?.verses || []).forEach((verse: any) => {
        const juzNumber = verse.juz_number || 0;
        const surahNumber = verse.chapter_id || 0;
        const verseRuku = verse.ruku_number || null;

        // When ruku number changes, the PREVIOUS verse was the last of the old ruku
        if (verseRuku && verseRuku !== lastRukuNumber && lastRukuNumber !== null && prevVerseLastWordPos) {
          rukuPositions.push({ ...prevVerseLastWordPos });
        }
        lastRukuNumber = verseRuku;

        (verse.words || []).forEach((word: any) => {
          const pageNumber = word.page_number;
          const lineNumber = word.line_number;
          if (!pageNumber || !lineNumber) return;

          // Track last word position for ruku end detection
          prevVerseLastWordPos = { page: pageNumber, line: lineNumber };

          // Track first word of each chapter
          if (surahNumber && !chapterFirstWord.has(surahNumber)) {
            chapterFirstWord.set(surahNumber, { page: pageNumber, line: lineNumber });
          }

          if (!pages.has(pageNumber)) {
            pages.set(pageNumber, new Map());
          }
          const pageLines = pages.get(pageNumber)!;
          if (!pageLines.has(lineNumber)) {
            pageLines.set(lineNumber, []);
          }

          const wordText = this.pickQuranComWordText(word, source);
          if (wordText) {
            pageLines.get(lineNumber)!.push(wordText);
          }

          // Record ayah end positions for metadata
          if (word.char_type_name === 'end' && verse.verse_key) {
            const [s, a] = verse.verse_key.split(':').map(Number);
            if (s && a) {
              ayahEnds.push({ mushafPage: pageNumber, line: lineNumber, surah: s, ayah: a });
            }
          }

          if (!pageMeta.has(pageNumber)) {
            pageMeta.set(pageNumber, { juzs: new Set(), surahs: new Set() });
          }
          const meta = pageMeta.get(pageNumber)!;
          if (juzNumber) meta.juzs.add(juzNumber);
          if (surahNumber) meta.surahs.add(surahNumber);
        });
      });
    });

    // Mark the very last ruku (end of Quran)
    if (prevVerseLastWordPos) {
      rukuPositions.push({ ...prevVerseLastWordPos });
    }

    // ── Store ruku positions as metadata (not injected into text) ──
    this.quranComRukuPositions = rukuPositions;

    // ── Inject surah headers and bismillah into reserved line slots ──
    const BISM = this.surahService?.diacritics?.BISM || "\uFDFD"; // ﷽
    const surahNames = this.surahService?.surahNames || [];

    chapterFirstWord.forEach((firstWord, chapterNum) => {
      const isTawbah = chapterNum === 9;
      const isFatiha = chapterNum === 1;

      // Ensure page exists
      if (!pages.has(firstWord.page)) {
        pages.set(firstWord.page, new Map());
      }
      const pageLines = pages.get(firstWord.page)!;

      // Build surah header text
      const surahName = surahNames[chapterNum - 1] || '';
      const headerText = `سُوْرَةُ ${surahName}`;

      if (isFatiha) {
        // Fatiha: header on line 1, bismillah IS verse 1:1 (already on line 2)
        const headerLine = firstWord.line - 1; // line 1
        if (headerLine >= 1 && !pageLines.has(headerLine)) {
          pageLines.set(headerLine, []);
        }
        if (headerLine >= 1) {
          pageLines.get(headerLine)!.push(headerText);
        }
      } else if (isTawbah) {
        // Tawbah: header only (no bismillah), 1 line reserved
        const headerLine = firstWord.line - 1;
        if (headerLine >= 1 && !pageLines.has(headerLine)) {
          pageLines.set(headerLine, []);
        }
        if (headerLine >= 1) {
          pageLines.get(headerLine)!.push(headerText);
        }
      } else {
        // All other surahs: header 2 lines before text, bismillah 1 line before text
        const headerLine = firstWord.line - 2;
        const bismillahLine = firstWord.line - 1;
        if (headerLine >= 1 && !pageLines.has(headerLine)) {
          pageLines.set(headerLine, []);
        }
        if (headerLine >= 1) {
          pageLines.get(headerLine)!.push(headerText);
        }
        if (bismillahLine >= 1 && !pageLines.has(bismillahLine)) {
          pageLines.set(bismillahLine, []);
        }
        if (bismillahLine >= 1) {
          pageLines.get(bismillahLine)!.push(BISM);
        }
      }
    });

    const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);
    this.quranComPageNumbers = pageNumbers;
    // +1 offset because we prepend a title page at index 0
    this.quranComPageIndexByNumber = new Map(
      pageNumbers.map((pageNumber, index) => [pageNumber, index + 1])
    );
    this.quranComPageMeta = pageMeta;

    // ── Build ayah metadata map ──
    // Key = pages-array index (1-based; 0 = title page).
    // Value = [{line (0-based index into page lines), surah, ayah}].
    this.quranComAyahMap = new Map();
    for (const ae of ayahEnds) {
      const pageIdx = this.quranComPageIndexByNumber.get(ae.mushafPage);
      if (pageIdx === undefined) continue;
      // Convert mushaf line number (1-based) to the 0-based index within the
      // built page text. We need to know the sorted line numbers for this page.
      const linesMap = pages.get(ae.mushafPage);
      if (!linesMap) continue;
      const sortedLineNums = Array.from(linesMap.keys()).sort((a, b) => a - b);
      const lineIdx = sortedLineNums.indexOf(ae.line);
      if (lineIdx < 0) continue;

      if (!this.quranComAyahMap.has(pageIdx)) {
        this.quranComAyahMap.set(pageIdx, []);
      }
      this.quranComAyahMap.get(pageIdx)!.push({
        line: lineIdx,
        surah: ae.surah,
        ayah: ae.ayah,
      });
    }

    // ── Build page texts, prepending a title page ──
    const titlePage = "القرآن الکریم";
    const pageTexts = pageNumbers.map((pageNumber) => {
      const linesMap = pages.get(pageNumber)!;
      const lineNumbers = Array.from(linesMap.keys()).sort((a, b) => a - b);
      const lines = lineNumbers.map((lineNumber) =>
        (linesMap.get(lineNumber) || []).join(" ")
      );
      return lines.join("\n");
    });

    // Prepend title page as page 0 (before all Quran.com pages)
    return [titlePage, ...pageTexts].join("\n\n");
  }

  private pickQuranComWordText(word: any, source: TextSource): string {
    if (word?.char_type_name === "end") {
      // Use word.text as-is — the Waqf Lazim font renders the correct glyph
      // (round ayah mark with number, ruku indicators, etc.).
      // Ayah detection for qurancom uses metadata (quranComAyahMap), not text scanning.
      return word.text || "";
    }

    if (source.id.includes("uthmani")) {
      return word.text_uthmani || word.text || word.text_indopak || "";
    }

    if (source.id.includes("indopak")) {
      // Use word.text — this is the code-point text that renders correctly
      // with the IndoPak Waqf Lazim font (includes proper ayah/waqf glyphs).
      return word.text || word.text_indopak || word.text_uthmani || "";
    }

    return word.text || word.text_indopak || word.text_uthmani || "";
  }

  /**
   * Get a specific Juz
   */
  getJuz(juzNumber: number): Observable<JuzData> {
    return this.loadFullQuran().pipe(
      map((quranText) => {
        const pages = quranText.split('\n\n');
        const source = this.currentSource$.getValue();
        let juzPages: string[] = [];

        if (source.type === 'qurancom' && this.quranComPageNumbers.length > 0) {
          const pageNumbers = this.quranComPageNumbers.filter((pageNumber) => {
            const meta = this.quranComPageMeta.get(pageNumber);
            return meta?.juzs.has(juzNumber);
          });
          juzPages = pageNumbers
            .map((pageNumber) => {
              const idx = this.quranComPageIndexByNumber.get(pageNumber);
              return idx !== undefined ? pages[idx] : '';
            })
            .filter((p) => p);
        } else {
          const startPage = this.surahService.juzPageNumbers[juzNumber - 1];
          const endPage = this.surahService.juzPageNumbers[juzNumber] || pages.length + 1;
          juzPages = pages.slice(startPage - 1, endPage - 1);
        }

        return {
          juzNumber,
          pages: juzPages.join('\n\n'),
          rukuArray: [], // Will be populated by the component
          title: juzNumber.toString(),
          mode: 'juz' as const,
        };
      })
    );
  }

  /**
   * Get a specific Surah
   */
  getSurah(surahNumber: number): Observable<JuzData> {
    return this.loadFullQuran().pipe(
      map((quranText) => {
        const pages = quranText.split('\n\n');
        const source = this.currentSource$.getValue();
        let surahPages: string[] = [];
        let juzNumberForSurah = 0;

        if (source.type === 'qurancom' && this.quranComPageNumbers.length > 0) {
          const pageNumbers = this.quranComPageNumbers.filter((pageNumber) => {
            const meta = this.quranComPageMeta.get(pageNumber);
            return meta?.surahs.has(surahNumber);
          });

          if (pageNumbers.length) {
            const minPage = Math.min(...pageNumbers);
            const maxPage = Math.max(...pageNumbers);
            const pageRange = this.quranComPageNumbers.filter(
              (p) => p >= minPage && p <= maxPage
            );
            surahPages = pageRange
              .map((pageNumber) => {
                const idx = this.quranComPageIndexByNumber.get(pageNumber);
                return idx !== undefined ? pages[idx] : '';
              })
              .filter((p) => p);

            const meta = this.quranComPageMeta.get(minPage);
            const juzList = meta?.juzs ? Array.from(meta.juzs) : [];
            const firstJuz = juzList.length ? Math.min(...juzList) : 0;
            juzNumberForSurah = firstJuz || 0;
          }
        } else {
          const startPage = this.surahService.surahPageNumbers[surahNumber - 1];
          const endPage = this.surahService.surahPageNumbers[surahNumber] || pages.length + 1;

          // Handle surahs that share a page
          surahPages = pages.filter((_, i) => {
            const pageNum = i + 1;
            return pageNum >= startPage && pageNum < endPage;
          });
          juzNumberForSurah = this.surahService.juzCalculated(startPage);
        }

        return {
          juzNumber: juzNumberForSurah,
          pages: surahPages.join('\n\n'),
          rukuArray: [],
          title: surahNumber.toString(),
          mode: 'surah' as const,
        };
      })
    );
  }

  /**
   * Calculate page number for a given ayah
   */
  getPageForAyah(surah: number, ayah: number): number {
    // This would need proper implementation with word-level tracking
    // For now, return the surah's start page
    return this.surahService.surahPageNumbers[surah - 1];
  }

  /**
   * Navigate to a specific target
   */
  resolveNavigation(target: NavigationTarget): { page: number; lineIndex?: number } {
    if (target.type === 'page' && target.page) {
      return { page: target.page };
    }

    if (target.type === 'juz' && target.juz) {
      const page = this.surahService.juzPageNumbers[target.juz - 1];
      return { page };
    }

    if (target.type === 'surah' && target.surah) {
      const page = this.surahService.surahPageNumbers[target.surah - 1];
      return { page };
    }

    if (target.type === 'ayah' && target.surah && target.ayah) {
      const page = this.getPageForAyah(target.surah, target.ayah);
      return { page };
    }

    return { page: 1 };
  }

  /**
   * Get loading state
   */
  getLoadingState(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  getQuranComProgress(): Observable<QuranComProgress> {
    return this.quranComProgress$.asObservable();
  }

  /**
   * Add a custom text source
   */
  async addCustomSource(source: TextSource): Promise<void> {
    const customSources = (await this.storage.get(this.STORAGE_KEY_CUSTOM_SOURCES)) || [];
    customSources.push(source);
    await this.storage.set(this.STORAGE_KEY_CUSTOM_SOURCES, customSources);
    this.customSources = customSources;
  }

  /**
   * Remove a custom text source
   */
  async removeCustomSource(sourceId: string): Promise<void> {
    let customSources = (await this.storage.get(this.STORAGE_KEY_CUSTOM_SOURCES)) || [];
    customSources = customSources.filter((s: TextSource) => s.id !== sourceId);
    await this.storage.set(this.STORAGE_KEY_CUSTOM_SOURCES, customSources);
    this.customSources = customSources;
    
    // If the removed source was selected, switch to default
    if (this.currentSource$.getValue().id === sourceId) {
      const defaultSource = TEXT_SOURCES.find(s => s.isDefault) || TEXT_SOURCES[0];
      this.currentSource$.next(defaultSource);
      await this.storage.set(this.STORAGE_KEY_SOURCE, defaultSource.id);
    }
  }

  /**
   * Update a custom text source
   */
  async updateCustomSource(sourceId: string, updates: Partial<TextSource>): Promise<void> {
    let customSources = (await this.storage.get(this.STORAGE_KEY_CUSTOM_SOURCES)) || [];
    const index = customSources.findIndex((s: TextSource) => s.id === sourceId);
    if (index >= 0) {
      customSources[index] = { ...customSources[index], ...updates };
      await this.storage.set(this.STORAGE_KEY_CUSTOM_SOURCES, customSources);
      this.customSources = customSources;
    }
  }

  /**
   * Get font family for current source
   */
  getCurrentFontFamily(): string {
    return this.currentSource$.getValue().fontFamily;
  }

  /**
   * Get CSS class for current source's font
   */
  getCurrentFontClass(): string {
    const source = this.currentSource$.getValue();
    switch (source.fontFamily) {
      case 'IndoPak Waqf Lazim':
        return 'ar-waqflazim';
      case 'Uthmanic Hafs':
        return 'ar-uthmani';
      case 'Muhammadi':
      default:
        return 'ar2';
    }
  }

  // =============================================
  // AYAH-LEVEL DATA (for Discover / Ayah Flow)
  // =============================================

  private ayahDataCache: any[] | null = null;
  private preCacheInProgress = false;

  /**
   * Pre-cache quran.com data on first app open (called from home page).
   * Downloads comprehensive JSON data in background and stores ayah-level data.
   * Returns immediately if already cached.
   */
  async preCacheQuranData(): Promise<void> {
    if (this.preCacheInProgress) return;

    // Check v2 cache first
    const alreadyCached = await this.storage.get(this.STORAGE_KEY_AYAH_DATA_V2);
    if (alreadyCached && alreadyCached.length > 0) {
      this.ayahDataCache = alreadyCached;
      return;
    }

    this.preCacheInProgress = true;
    const sourceUrl = 'https://raw.githubusercontent.com/ShakesVision/quran-archive/master/qurancom/comprehensive-15Lines';

    try {
      const allAyahs: any[] = [];
      const chapters = Array.from({ length: 114 }, (_, i) => i + 1);

      // Download in batches of 10
      for (let batch = 0; batch < chapters.length; batch += 10) {
        const batchChapters = chapters.slice(batch, batch + 10);
        const promises = batchChapters.map(async (chapterId) => {
          try {
            const data = await this.http
              .get<any>(`${sourceUrl}/${chapterId}.json`)
              .toPromise();
            return { chapterId, data };
          } catch (err) {
            console.warn(`Pre-cache: Failed to download chapter ${chapterId}`);
            return { chapterId, data: null };
          }
        });
        const results = await Promise.all(promises);

        for (const { chapterId, data } of results) {
          if (!data?.verses) continue;
          for (const verse of data.verses) {
            // Store ALL translations (v2 format) so user can switch without re-downloading
            const trs = (verse.translations || []).map((t: any) => ({
              id: t.resource_id,
              t: (t.text || '')
                .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim(),
            }));

            allAyahs.push({
              vk: verse.verse_key,
              sn: verse.chapter_id || chapterId,
              an: verse.verse_number,
              ar: verse.text_indopak || verse.text_uthmani || '',
              aru: verse.text_uthmani || '',
              trs, // Array of { id: number, t: string }
            });
          }
        }
      }

      if (allAyahs.length > 0) {
        await this.storage.set(this.STORAGE_KEY_AYAH_DATA_V2, allAyahs);
        this.ayahDataCache = allAyahs;
        console.log(`Pre-cached ${allAyahs.length} ayahs (v2 with all translations) for Discover feature`);
      }
    } catch (err) {
      console.error('Pre-cache failed:', err);
    } finally {
      this.preCacheInProgress = false;
    }
  }

  /**
   * Extract translations from comprehensive verse data
   */
  private extractTranslations(translations: any[]): { en: string; ur: string } {
    let en = '';
    let ur = '';

    for (const t of translations) {
      const text = (t.text || '')
        .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

      // English: resource_id 20 (Sahih), 85 (Haleem), 84 (Usmani)
      if (!en && [20, 85, 84].includes(t.resource_id)) {
        en = text;
      }
      // Urdu: resource_id 97 (Maududi), 54 (Junagarhi)
      if (!ur && [97, 54].includes(t.resource_id)) {
        ur = text;
      }
    }

    return { en, ur };
  }

  /**
   * Get a random ayah card for the Discover feature
   */
  async getRandomAyahCard(): Promise<AyahCard | null> {
    if (!this.ayahDataCache || this.ayahDataCache.length === 0) {
      this.ayahDataCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA_V2);
    }

    if (!this.ayahDataCache || this.ayahDataCache.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.ayahDataCache.length);
    const ayah = this.ayahDataCache[randomIndex];
    return this.buildAyahCard(ayah);
  }

  /**
   * Get multiple random ayah cards (batch) for the Discover feature
   */
  async getRandomAyahCards(count: number): Promise<AyahCard[]> {
    if (!this.ayahDataCache || this.ayahDataCache.length === 0) {
      this.ayahDataCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA_V2);
    }

    if (!this.ayahDataCache || this.ayahDataCache.length === 0) {
      return [];
    }

    const cards: AyahCard[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count && usedIndices.size < this.ayahDataCache.length; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * this.ayahDataCache.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      cards.push(this.buildAyahCard(this.ayahDataCache[idx]));
    }

    return cards;
  }

  /**
   * Check if ayah data is available (pre-cached)
   */
  async isAyahDataReady(): Promise<boolean> {
    if (this.ayahDataCache && this.ayahDataCache.length > 0) return true;
    const cached = await this.storage.get(this.STORAGE_KEY_AYAH_DATA_V2);
    return cached && cached.length > 0;
  }

  // =============================================
  // DISCOVER TRANSLATION PREFERENCES
  // =============================================

  /** IDs of translations that exist in the pre-cached Discover data */
  private readonly CACHED_TRANSLATION_IDS = [20, 85, 84, 97, 54];

  /**
   * Get available translations filtered by language.
   * @param cachedOnly If true, only returns translations in the pre-cached data (for Discover)
   */
  getAvailableTranslations(language: 'english' | 'urdu', cachedOnly = false): TranslationResource[] {
    return AVAILABLE_TRANSLATIONS.filter(t =>
      t.language === language && (!cachedOnly || this.CACHED_TRANSLATION_IDS.includes(t.id))
    );
  }

  /**
   * Get the currently selected English translation ID
   */
  getSelectedEnTranslationId(): number {
    return this.selectedEnTranslationId;
  }

  /**
   * Get the currently selected Urdu translation ID
   */
  getSelectedUrTranslationId(): number {
    return this.selectedUrTranslationId;
  }

  /**
   * Set the preferred English translation and persist
   */
  async setEnTranslation(resourceId: number): Promise<void> {
    this.selectedEnTranslationId = resourceId;
    await this.storage.set(this.STORAGE_KEY_EN_TRANSLATION, resourceId);
  }

  /**
   * Set the preferred Urdu translation and persist
   */
  async setUrTranslation(resourceId: number): Promise<void> {
    this.selectedUrTranslationId = resourceId;
    await this.storage.set(this.STORAGE_KEY_UR_TRANSLATION, resourceId);
  }

  /**
   * Get translation name for display by resource ID
   */
  getTranslationName(resourceId: number): string {
    const t = AVAILABLE_TRANSLATIONS.find(tr => tr.id === resourceId);
    return t ? t.name : `Translation #${resourceId}`;
  }

  /**
   * Build an AyahCard from raw cached data (v2 format with all translations)
   */
  private buildAyahCard(ayah: any): AyahCard {
    const surahIdx = (ayah.sn || 1) - 1;
    const arabicText = ayah.ar || '';
    const design = this.generateCardDesign(arabicText);

    // Pick translations based on user preference (v2 format: trs array)
    let enText = '';
    let urText = '';

    if (ayah.trs && Array.isArray(ayah.trs)) {
      // V2 format: array of { id, t }
      const enTr = ayah.trs.find((t: any) => t.id === this.selectedEnTranslationId);
      enText = enTr?.t || '';
      // Fallback: try any English translation
      if (!enText) {
        const enIds = AVAILABLE_TRANSLATIONS.filter(t => t.language === 'english').map(t => t.id);
        const fallback = ayah.trs.find((t: any) => enIds.includes(t.id));
        enText = fallback?.t || '';
      }

      const urTr = ayah.trs.find((t: any) => t.id === this.selectedUrTranslationId);
      urText = urTr?.t || '';
      // Fallback: try any Urdu translation
      if (!urText) {
        const urIds = AVAILABLE_TRANSLATIONS.filter(t => t.language === 'urdu').map(t => t.id);
        const fallback = ayah.trs.find((t: any) => urIds.includes(t.id));
        urText = fallback?.t || '';
      }
    } else if (ayah.tr) {
      // Legacy v1 format: { en, ur }
      enText = ayah.tr.en || '';
      urText = ayah.tr.ur || '';
    }

    return {
      verseKey: ayah.vk || `${ayah.sn}:${ayah.an}`,
      surahNumber: ayah.sn || 1,
      ayahNumber: ayah.an || 1,
      arabicText,
      urduTranslation: urText,
      englishTranslation: enText,
      surahNameAr: this.surahService.surahNames?.[surahIdx] || '',
      surahNameEn: SURAH_NAMES_EN[surahIdx] || '',
      design,
    };
  }

  /**
   * Generate a random beautiful card design
   */
  private generateCardDesign(arabicText: string): CardDesign {
    const paletteIndex = Math.floor(Math.random() * CARD_PALETTES.length);
    const patternIndex = Math.floor(Math.random() * CARD_PATTERNS.length);
    const palette = CARD_PALETTES[paletteIndex];

    // Determine font size based on text length
    const textLen = arabicText.length;
    let fontSizeClass: 'large' | 'medium' | 'small';
    if (textLen < 80) {
      fontSizeClass = 'large';
    } else if (textLen < 250) {
      fontSizeClass = 'medium';
    } else {
      fontSizeClass = 'small';
    }

    return {
      gradient: palette.gradient,
      pattern: CARD_PATTERNS[patternIndex] || undefined,
      textColor: palette.textColor,
      accentColor: palette.accent,
      fontSizeClass,
    };
  }
}

