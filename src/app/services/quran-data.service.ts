import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, tap, concatMap, toArray } from 'rxjs/operators';
import {
  TextSource,
  TEXT_SOURCES,
  UserSourcePreference,
  QuranComChapterResponse,
  QuranComVerse,
  MUSHAF_CODES,
} from '../models/text-sources';
import { SurahService } from './surah.service';

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
      concatMap((chapterId) =>
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
        )
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
}

