import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root',
})
export class QuranDataService {
  private readonly STORAGE_KEY_SOURCE = 'selectedTextSource';
  private readonly STORAGE_KEY_QURAN = 'QuranData';
  private readonly STORAGE_KEY_CUSTOM_SOURCES = 'customSources';

  private currentSource$ = new BehaviorSubject<TextSource>(
    TEXT_SOURCES.find((s) => s.isDefault) || TEXT_SOURCES[0]
  );

  private quranData$ = new BehaviorSubject<string | null>(null);
  private isLoading$ = new BehaviorSubject<boolean>(false);

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
   * Load Quran from Quran.com API (JSON with word tracking)
   * This downloads all 114 chapters and combines them
   */
  private loadQuranComQuran(source: TextSource): Observable<string> {
    this.isLoading$.next(true);

    // Check cache first
    return from(this.storage.get(`${this.STORAGE_KEY_QURAN}_${source.id}`)).pipe(
      switchMap((cached) => {
        if (cached && !navigator.onLine) {
          console.log('Using cached quran.com data');
          return of(cached);
        }

        // For now, return placeholder - full implementation would download all chapters
        // This is a simplified version that works with the existing text format
        console.log('Quran.com source selected - using archive fallback for now');
        return this.loadArchiveQuran(TEXT_SOURCES.find((s) => s.id === 'archive-15')!);
      }),
      tap(() => {
        this.isLoading$.next(false);
      })
    );
  }

  /**
   * Get a specific Juz
   */
  getJuz(juzNumber: number): Observable<JuzData> {
    return this.loadFullQuran().pipe(
      map((quranText) => {
        const pages = quranText.split('\n\n');
        const startPage = this.surahService.juzPageNumbers[juzNumber - 1];
        const endPage = this.surahService.juzPageNumbers[juzNumber] || pages.length + 1;

        const juzPages = pages.slice(startPage - 1, endPage - 1);

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
        const startPage = this.surahService.surahPageNumbers[surahNumber - 1];
        const endPage = this.surahService.surahPageNumbers[surahNumber] || pages.length + 1;

        // Handle surahs that share a page
        let surahPages = pages.filter((_, i) => {
          const pageNum = i + 1;
          return pageNum >= startPage && pageNum < endPage;
        });

        return {
          juzNumber: this.surahService.juzCalculated(startPage),
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

