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
  private readonly STORAGE_KEY_PRECACHE_DONE = 'QuranPreCacheDone';

  private quranComPageNumbers: number[] = [];
  private quranComPageIndexByNumber: Map<number, number> = new Map();
  private quranComPageMeta: Map<number, { juzs: Set<number>; surahs: Set<number> }> = new Map();

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
   * This downloads all 114 chapters and combines them
   */
  private loadQuranComQuran(source: TextSource): Observable<string> {
    this.isLoading$.next(true);
    const totalChapters = 114;

    // Check cache first
    return from(this.storage.get(`${this.STORAGE_KEY_QURAN}_${source.id}`)).pipe(
      switchMap((cached) => {
        if (cached) {
          console.log('Using cached quran.com data');
          this.quranComProgress$.next({
            loaded: totalChapters,
            total: totalChapters,
            done: true,
          });
          return of(cached);
        }

        this.quranComProgress$.next({
          loaded: 0,
          total: totalChapters,
          done: false,
        });

        return this.fetchQuranComChapters(source).pipe(
          map((chapters) => this.buildQuranComText(chapters, source)),
          tap((data) => {
            this.storage.set(`${this.STORAGE_KEY_QURAN}_${source.id}`, data);
          }),
          catchError((error) => {
            console.error('Failed to fetch Quran.com archive data:', error);
            if (cached) return of(cached);
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

    chapters.forEach((chapter) => {
      (chapter?.verses || []).forEach((verse: any) => {
        const juzNumber = verse.juz_number || 0;
        const surahNumber = verse.chapter_id || 0;
        const verseRuku = verse.ruku_number || null;

        if (verseRuku && verseRuku !== lastRukuNumber) {
          const firstWord = (verse.words || []).find(
            (word: any) => word.page_number && word.line_number
          );
          if (firstWord) {
            if (!pages.has(firstWord.page_number)) {
              pages.set(firstWord.page_number, new Map());
            }
            const pageLines = pages.get(firstWord.page_number)!;
            if (!pageLines.has(firstWord.line_number)) {
              pageLines.set(firstWord.line_number, []);
            }
            pageLines
              .get(firstWord.line_number)!
              .push(this.surahService?.diacritics?.RUKU_MARK || "۝");
          }
          lastRukuNumber = verseRuku;
        }

        (verse.words || []).forEach((word: any) => {
          const pageNumber = word.page_number;
          const lineNumber = word.line_number;
          if (!pageNumber || !lineNumber) return;

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

          if (!pageMeta.has(pageNumber)) {
            pageMeta.set(pageNumber, { juzs: new Set(), surahs: new Set() });
          }
          const meta = pageMeta.get(pageNumber)!;
          if (juzNumber) meta.juzs.add(juzNumber);
          if (surahNumber) meta.surahs.add(surahNumber);
        });
      });
    });

    const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);
    this.quranComPageNumbers = pageNumbers;
    this.quranComPageIndexByNumber = new Map(
      pageNumbers.map((pageNumber, index) => [pageNumber, index])
    );
    this.quranComPageMeta = pageMeta;

    const pageTexts = pageNumbers.map((pageNumber) => {
      const linesMap = pages.get(pageNumber)!;
      const lineNumbers = Array.from(linesMap.keys()).sort((a, b) => a - b);
      const lines = lineNumbers.map((lineNumber) =>
        (linesMap.get(lineNumber) || []).join(" ")
      );
      return lines.join("\n");
    });

    return pageTexts.join("\n\n");
  }

  private pickQuranComWordText(word: any, source: TextSource): string {
    if (word?.char_type_name === "end") {
      return word.text || word.text_uthmani || word.text_indopak || "";
    }

    if (source.id.includes("uthmani")) {
      return word.text_uthmani || word.text || word.text_indopak || "";
    }

    if (source.id.includes("indopak")) {
      return word.text || word.text_indopak || word.text || word.text_uthmani || "";
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

    const alreadyCached = await this.storage.get(this.STORAGE_KEY_AYAH_DATA);
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
            allAyahs.push({
              vk: verse.verse_key,
              sn: verse.chapter_id || chapterId,
              an: verse.verse_number,
              ar: verse.text_indopak || verse.text_uthmani || '',
              aru: verse.text_uthmani || '',
              tr: this.extractTranslations(verse.translations || []),
            });
          }
        }
      }

      if (allAyahs.length > 0) {
        await this.storage.set(this.STORAGE_KEY_AYAH_DATA, allAyahs);
        this.ayahDataCache = allAyahs;
        console.log(`Pre-cached ${allAyahs.length} ayahs for Discover feature`);
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
      this.ayahDataCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA);
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
      this.ayahDataCache = await this.storage.get(this.STORAGE_KEY_AYAH_DATA);
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
    const cached = await this.storage.get(this.STORAGE_KEY_AYAH_DATA);
    return cached && cached.length > 0;
  }

  /**
   * Build an AyahCard from raw cached data
   */
  private buildAyahCard(ayah: any): AyahCard {
    const surahIdx = (ayah.sn || 1) - 1;
    const arabicText = ayah.ar || '';
    const design = this.generateCardDesign(arabicText);

    return {
      verseKey: ayah.vk || `${ayah.sn}:${ayah.an}`,
      surahNumber: ayah.sn || 1,
      ayahNumber: ayah.an || 1,
      arabicText,
      urduTranslation: ayah.tr?.ur || '',
      englishTranslation: ayah.tr?.en || '',
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

