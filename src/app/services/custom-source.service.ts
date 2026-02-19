import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, take, catchError, tap } from 'rxjs/operators';
import { CustomSourceInput, TextSource, MushafLines, createCustomSource } from '../models/text-sources';

/**
 * Input formats for custom Quran text
 */
export type CustomTextFormat = 'archive' | 'ayah-per-line' | 'json-ayahs';

/**
 * Parsed ayah from custom input
 */
export interface ParsedAyah {
  surah: number;
  ayah: number;
  text: string;
}

/**
 * Reference word position from quran.com mushaf data
 */
interface RefWordPosition {
  surah: number;
  ayah: number;
  wordIndex: number;
  pageNumber: number;
  lineNumber: number;
}

/**
 * Result of the text adapter algorithm
 */
export interface AdapterResult {
  /** Full text with \n\n page separators and \n line separators */
  fullText: string;
  /** Total pages generated */
  totalPages: number;
  /** Lines per page (target) */
  linesPerPage: number;
  /** Any warnings during conversion */
  warnings: string[];
}

/**
 * Saved custom source (stored in IndexedDB)
 */
export interface SavedCustomSource {
  source: TextSource;
  fullText: string;
  createdAt: string;
  format: CustomTextFormat;
}

@Injectable({
  providedIn: 'root',
})
export class CustomSourceService {
  private readonly STORAGE_KEY = 'customSources';
  private readonly REF_CACHE_KEY = 'customSourceRefData';

  customSources$ = new BehaviorSubject<SavedCustomSource[]>([]);

  constructor(
    private http: HttpClient,
    private storage: Storage,
  ) {
    this.loadSavedSources();
  }

  /**
   * Load all saved custom sources from storage
   */
  async loadSavedSources() {
    try {
      const saved = await this.storage.get(this.STORAGE_KEY);
      if (saved && Array.isArray(saved)) {
        this.customSources$.next(saved);
      }
    } catch (e) {
      console.warn('[CustomSource] Failed to load saved sources:', e);
    }
  }

  /**
   * Save a custom source
   */
  async saveSource(saved: SavedCustomSource) {
    const current = this.customSources$.getValue();
    const updated = [...current.filter(s => s.source.id !== saved.source.id), saved];
    this.customSources$.next(updated);
    try {
      await this.storage.set(this.STORAGE_KEY, updated);
    } catch (e) {
      console.warn('[CustomSource] Failed to save source:', e);
    }
  }

  /**
   * Delete a custom source
   */
  async deleteSource(sourceId: string) {
    const current = this.customSources$.getValue();
    const updated = current.filter(s => s.source.id !== sourceId);
    this.customSources$.next(updated);
    try {
      await this.storage.set(this.STORAGE_KEY, updated);
    } catch (e) {
      console.warn('[CustomSource] Failed to delete source:', e);
    }
  }

  /**
   * Get the full text for a custom source
   */
  getSourceText(sourceId: string): string | null {
    const source = this.customSources$.getValue().find(s => s.source.id === sourceId);
    return source?.fullText || null;
  }

  /**
   * Parse raw text input based on format
   */
  parseInput(rawText: string, format: CustomTextFormat): ParsedAyah[] {
    switch (format) {
      case 'ayah-per-line':
        return this.parseAyahPerLine(rawText);
      case 'json-ayahs':
        return this.parseJsonAyahs(rawText);
      case 'archive':
        // Archive format is already page/line split, no parsing needed
        return [];
      default:
        return [];
    }
  }

  /**
   * Parse ayah-per-line format:
   * Each line: surah:ayah|arabic text
   * e.g., "1:1|بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
   */
  private parseAyahPerLine(text: string): ParsedAyah[] {
    const lines = text.split('\n').filter(l => l.trim());
    const ayahs: ParsedAyah[] = [];

    for (const line of lines) {
      const pipeIdx = line.indexOf('|');
      if (pipeIdx === -1) continue;

      const key = line.substring(0, pipeIdx).trim();
      const arabicText = line.substring(pipeIdx + 1).trim();
      const [surahStr, ayahStr] = key.split(':');
      const surah = parseInt(surahStr, 10);
      const ayah = parseInt(ayahStr, 10);

      if (!isNaN(surah) && !isNaN(ayah) && arabicText) {
        ayahs.push({ surah, ayah, text: arabicText });
      }
    }

    return ayahs;
  }

  /**
   * Parse JSON ayahs format:
   * Array of { "surah": 1, "ayah": 1, "text": "..." }
   * Or { "verse_key": "1:1", "text": "..." }
   */
  private parseJsonAyahs(jsonText: string): ParsedAyah[] {
    try {
      const data = JSON.parse(jsonText);
      const arr = Array.isArray(data) ? data : (data.verses || data.ayahs || []);
      return arr.map((item: any) => {
        if (item.verse_key) {
          const [s, a] = item.verse_key.split(':').map(Number);
          return { surah: s, ayah: a, text: item.text || item.arabic || '' };
        }
        return {
          surah: item.surah || item.chapter_id || 0,
          ayah: item.ayah || item.verse_number || 0,
          text: item.text || item.arabic || '',
        };
      }).filter((a: ParsedAyah) => a.surah > 0 && a.ayah > 0 && a.text);
    } catch (e) {
      console.error('[CustomSource] Failed to parse JSON:', e);
      return [];
    }
  }

  /**
   * Fetch quran.com reference word positions for page/line mapping.
   * Uses mushaf code 6 (IndoPak 15-line) or 7 (IndoPak 16-line).
   */
  async fetchReferenceData(linesPerPage: MushafLines): Promise<RefWordPosition[]> {
    const mushafCode = linesPerPage === 15 ? 6 : 7;
    const cacheKey = `${this.REF_CACHE_KEY}_${linesPerPage}`;

    // Check cache first
    try {
      const cached = await this.storage.get(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log(`[CustomSource] Using cached reference data for ${linesPerPage}-line (${cached.length} words)`);
        return cached;
      }
    } catch (e) { /* ignore */ }

    console.log(`[CustomSource] Fetching reference data for ${linesPerPage}-line mushaf`);
    const positions: RefWordPosition[] = [];

    // Fetch all 114 surahs to get word-level positions
    for (let surah = 1; surah <= 114; surah++) {
      try {
        const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?words=true&word_fields=text_indopak&per_page=300&mushaf=${mushafCode}`;
        const res: any = await this.http.get(url).pipe(take(1)).toPromise();
        const verses = res?.verses || [];

        for (const verse of verses) {
          const [s, a] = (verse.verse_key || '').split(':').map(Number);
          (verse.words || []).forEach((word: any, idx: number) => {
            if (word.page_number && word.line_number) {
              positions.push({
                surah: s,
                ayah: a,
                wordIndex: idx,
                pageNumber: word.page_number,
                lineNumber: word.line_number,
              });
            }
          });
        }

        // Small delay to avoid rate limiting
        if (surah % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (e) {
        console.warn(`[CustomSource] Failed to fetch surah ${surah}:`, e);
      }
    }

    // Cache
    try {
      await this.storage.set(cacheKey, positions);
    } catch (e) { /* ignore */ }

    console.log(`[CustomSource] Fetched ${positions.length} word positions`);
    return positions;
  }

  /**
   * The main adapter algorithm: convert parsed ayahs into page/line-split text.
   *
   * Strategy:
   * 1. Use quran.com reference data to know where each word falls (page, line)
   * 2. For each ayah in the custom text, tokenize into words
   * 3. Map each word to the reference position
   * 4. Build output pages with line breaks
   *
   * If reference data isn't available, fall back to simple equal-distribution splitting.
   */
  async adaptToPageLines(
    ayahs: ParsedAyah[],
    linesPerPage: MushafLines,
    useReference: boolean = true,
  ): Promise<AdapterResult> {
    const warnings: string[] = [];

    if (useReference) {
      const refData = await this.fetchReferenceData(linesPerPage);
      if (refData.length > 0) {
        return this.adaptWithReference(ayahs, refData, linesPerPage, warnings);
      }
      warnings.push('Reference data not available. Using fallback splitting.');
    }

    return this.adaptSimpleSplit(ayahs, linesPerPage, warnings);
  }

  /**
   * Adapt using quran.com reference word positions.
   * Maps custom words to reference page/line positions.
   */
  private adaptWithReference(
    ayahs: ParsedAyah[],
    refData: RefWordPosition[],
    linesPerPage: MushafLines,
    warnings: string[],
  ): AdapterResult {
    // Build a lookup: "surah:ayah:wordIdx" → { page, line }
    const refMap = new Map<string, { page: number; line: number }>();
    for (const ref of refData) {
      refMap.set(`${ref.surah}:${ref.ayah}:${ref.wordIndex}`, {
        page: ref.pageNumber,
        line: ref.lineNumber,
      });
    }

    // Build pages → lines → words
    const pages = new Map<number, Map<number, string[]>>();

    for (const ayah of ayahs) {
      const words = ayah.text.split(/\s+/).filter(w => w);
      for (let wi = 0; wi < words.length; wi++) {
        const key = `${ayah.surah}:${ayah.ayah}:${wi}`;
        const pos = refMap.get(key);

        if (pos) {
          if (!pages.has(pos.page)) pages.set(pos.page, new Map());
          const pageLines = pages.get(pos.page)!;
          if (!pageLines.has(pos.line)) pageLines.set(pos.line, []);
          pageLines.get(pos.line)!.push(words[wi]);
        } else {
          // Word not in reference data; try closest match
          // Use "end" word logic: last word of ayah gets the end mark position
          const endKey = `${ayah.surah}:${ayah.ayah}:${words.length}`;
          const endPos = refMap.get(endKey);
          if (endPos) {
            if (!pages.has(endPos.page)) pages.set(endPos.page, new Map());
            const pageLines = pages.get(endPos.page)!;
            if (!pageLines.has(endPos.line)) pageLines.set(endPos.line, []);
            pageLines.get(endPos.line)!.push(words[wi]);
          } else {
            warnings.push(`No ref position for ${ayah.surah}:${ayah.ayah} word ${wi}`);
          }
        }
      }
    }

    // Build text output
    const sortedPages = Array.from(pages.keys()).sort((a, b) => a - b);
    const pageTexts: string[] = [];

    for (const pageNum of sortedPages) {
      const pageLines = pages.get(pageNum)!;
      const sortedLines = Array.from(pageLines.keys()).sort((a, b) => a - b);
      const lineTexts: string[] = [];

      for (const lineNum of sortedLines) {
        const words = pageLines.get(lineNum)!;
        lineTexts.push(words.join(' '));
      }

      // Pad to expected lines per page
      while (lineTexts.length < linesPerPage) {
        lineTexts.push('');
      }

      pageTexts.push(lineTexts.join('\n'));
    }

    return {
      fullText: pageTexts.join('\n\n'),
      totalPages: pageTexts.length,
      linesPerPage,
      warnings,
    };
  }

  /**
   * Simple fallback: split all text equally across estimated pages.
   * Uses known 15-line mushaf having ~611 pages as reference.
   */
  private adaptSimpleSplit(
    ayahs: ParsedAyah[],
    linesPerPage: MushafLines,
    warnings: string[],
  ): AdapterResult {
    // Concatenate all words
    const allWords = ayahs.flatMap(a => a.text.split(/\s+/).filter(w => w));
    const totalWords = allWords.length;

    // Estimate target: ~611 pages for 15 lines, ~523 for 16 lines
    const targetPages = linesPerPage === 15 ? 611 : 523;
    const totalLines = targetPages * linesPerPage;
    const wordsPerLine = Math.ceil(totalWords / totalLines);

    const pageTexts: string[] = [];
    let wordIdx = 0;

    for (let page = 0; page < targetPages && wordIdx < totalWords; page++) {
      const lineTexts: string[] = [];
      for (let line = 0; line < linesPerPage && wordIdx < totalWords; line++) {
        const lineWords = allWords.slice(wordIdx, wordIdx + wordsPerLine);
        lineTexts.push(lineWords.join(' '));
        wordIdx += wordsPerLine;
      }
      pageTexts.push(lineTexts.join('\n'));
    }

    warnings.push('Used simple word distribution (no reference data). Page breaks may not match standard mushaf.');

    return {
      fullText: pageTexts.join('\n\n'),
      totalPages: pageTexts.length,
      linesPerPage,
      warnings,
    };
  }

  /**
   * Create and save a custom source from user input.
   *
   * For 'archive' format, the text is used directly.
   * For 'ayah-per-line' or 'json-ayahs', the adapter algorithm is run.
   */
  async createSource(
    input: CustomSourceInput,
    rawText: string,
    format: CustomTextFormat,
    useReference: boolean = true,
  ): Promise<{ source: TextSource; result: AdapterResult | null; error?: string }> {
    const source = createCustomSource(input);
    let fullText = '';
    let result: AdapterResult | null = null;

    if (format === 'archive') {
      // Archive format is already split
      fullText = rawText;
      const pages = rawText.split('\n\n');
      result = {
        fullText,
        totalPages: pages.length,
        linesPerPage: input.linesPerPage,
        warnings: [],
      };
    } else {
      const ayahs = this.parseInput(rawText, format);
      if (ayahs.length === 0) {
        return { source, result: null, error: 'No valid ayahs parsed from input.' };
      }
      result = await this.adaptToPageLines(ayahs, input.linesPerPage, useReference);
      fullText = result.fullText;
    }

    const saved: SavedCustomSource = {
      source,
      fullText,
      createdAt: new Date().toISOString(),
      format,
    };

    await this.saveSource(saved);
    return { source, result };
  }
}

