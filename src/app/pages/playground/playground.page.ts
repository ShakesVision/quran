import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController, ToastController } from '@ionic/angular';
import { CustomSourceService, CustomTextFormat, AdapterResult, ParsedAyah } from '../../services/custom-source.service';
import { MushafLines } from '../../models/text-sources';
import { take } from 'rxjs/operators';

interface PageBreak {
  afterLineIndex: number; // Global line index after which a page break occurs
  label?: string;
}

@Component({
  selector: 'app-playground',
  templateUrl: './playground.page.html',
  styleUrls: ['./playground.page.scss'],
})
export class PlaygroundPage implements OnInit {
  // ── Input Controls ──
  textSource: 'qurancom' | 'tanzil' | 'custom' = 'qurancom';
  inputFormat: CustomTextFormat = 'ayah-per-line';
  customText = '';
  fontFamily = 'IndoPak Waqf Lazim';
  fontSize = 22;
  linesPerPage: MushafLines = 15;
  pageWidth = 400; // px

  // ── Preview State ──
  allLines: string[] = [];
  pageBreaks: PageBreak[] = [];
  previewPages: string[][] = [];
  currentPreviewPage = 0;
  totalAyahs = 0;

  // ── Loading/Status ──
  loading = false;
  statusMessage = '';
  warnings: string[] = [];

  // ── Available fonts ──
  fonts = [
    { label: 'IndoPak Waqf Lazim', value: 'IndoPak Waqf Lazim' },
    { label: 'Muhammadi', value: 'Muhammadi' },
    { label: 'Uthmanic Hafs', value: 'Uthmanic Hafs' },
    { label: 'Traditional Arabic', value: 'Traditional Arabic' },
    { label: 'Scheherazade', value: 'Scheherazade' },
    { label: 'KFGQPC Uthmanic', value: 'KFGQPC Uthmanic Script HAFS Regular' },
  ];

  constructor(
    private http: HttpClient,
    private customSourceService: CustomSourceService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {}

  /**
   * Load Quran text from selected source
   */
  async loadText() {
    this.loading = true;
    this.statusMessage = 'Loading Quran text...';
    this.allLines = [];
    this.pageBreaks = [];
    this.warnings = [];

    try {
      if (this.textSource === 'qurancom') {
        await this.loadFromQuranCom();
      } else if (this.textSource === 'tanzil') {
        await this.loadFromTanzil();
      } else if (this.textSource === 'custom') {
        this.loadFromCustomInput();
      }

      this.buildPreview();
      this.statusMessage = `Loaded ${this.allLines.length} lines (${this.totalAyahs} ayahs)`;
    } catch (e) {
      console.error('[Playground] Load failed:', e);
      this.statusMessage = 'Failed to load text. Check console for details.';
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  /**
   * Load from Quran.com API (IndoPak text, all 114 surahs)
   */
  private async loadFromQuranCom() {
    const allAyahs: string[] = [];
    let ayahCount = 0;

    for (let surah = 1; surah <= 114; surah++) {
      this.statusMessage = `Loading surah ${surah}/114...`;
      this.cdr.detectChanges();

      try {
        const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?fields=text_indopak&per_page=300`;
        const res: any = await this.http.get(url).pipe(take(1)).toPromise();
        const verses = res?.verses || [];
        for (const verse of verses) {
          allAyahs.push(verse.text_indopak || '');
          ayahCount++;
        }
      } catch (e) {
        console.warn(`[Playground] Failed to load surah ${surah}:`, e);
      }

      // Small delay every 10 surahs
      if (surah % 10 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    this.totalAyahs = ayahCount;
    // Each ayah becomes a line in the playground view
    this.allLines = allAyahs;
  }

  /**
   * Load from Tanzil.net (simple text format)
   */
  private async loadFromTanzil() {
    const url = 'https://tanzil.net/pub/download/index.php?quranType=simple-enhanced&outType=txt';
    // Note: Tanzil may have CORS restrictions. Fallback to manual paste.
    try {
      const text: string = await this.http.get(url, { responseType: 'text' }).pipe(take(1)).toPromise();
      const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      this.allLines = lines;
      this.totalAyahs = lines.length;
    } catch (e) {
      this.warnings.push('Tanzil.net may block direct downloads. Paste text manually using Custom mode.');
      throw e;
    }
  }

  /**
   * Load from custom text input
   */
  private loadFromCustomInput() {
    if (!this.customText.trim()) {
      this.warnings.push('No text entered. Paste Quran text in the input area.');
      return;
    }

    if (this.inputFormat === 'archive') {
      // Archive format: already page/line split
      const pages = this.customText.split('\n\n');
      this.allLines = [];
      for (const page of pages) {
        const lines = page.split('\n');
        this.allLines.push(...lines);
        // Auto-add page break after each page
        this.pageBreaks.push({ afterLineIndex: this.allLines.length - 1 });
      }
      this.totalAyahs = 0; // Unknown
    } else {
      const parsed = this.customSourceService.parseInput(this.customText, this.inputFormat);
      this.allLines = parsed.map(a => a.text);
      this.totalAyahs = parsed.length;
    }
  }

  /**
   * Build preview pages from allLines and pageBreaks
   */
  buildPreview() {
    this.previewPages = [];
    if (this.allLines.length === 0) return;

    if (this.pageBreaks.length > 0) {
      // Use manually marked page breaks
      let startIdx = 0;
      for (const pb of this.pageBreaks) {
        const pageLines = this.allLines.slice(startIdx, pb.afterLineIndex + 1);
        this.previewPages.push(pageLines);
        startIdx = pb.afterLineIndex + 1;
      }
      // Remaining lines
      if (startIdx < this.allLines.length) {
        this.previewPages.push(this.allLines.slice(startIdx));
      }
    } else {
      // Auto-split by linesPerPage
      for (let i = 0; i < this.allLines.length; i += this.linesPerPage) {
        this.previewPages.push(this.allLines.slice(i, i + this.linesPerPage));
      }
    }

    this.currentPreviewPage = 0;
    this.cdr.detectChanges();
  }

  /**
   * Toggle a page break after a specific line (click handler in preview)
   */
  togglePageBreak(globalLineIndex: number) {
    const existing = this.pageBreaks.findIndex(pb => pb.afterLineIndex === globalLineIndex);
    if (existing >= 0) {
      this.pageBreaks.splice(existing, 1);
    } else {
      this.pageBreaks.push({ afterLineIndex: globalLineIndex });
      this.pageBreaks.sort((a, b) => a.afterLineIndex - b.afterLineIndex);
    }
    this.buildPreview();
  }

  /**
   * Check if there's a page break after a given global line index
   */
  hasPageBreak(globalLineIndex: number): boolean {
    return this.pageBreaks.some(pb => pb.afterLineIndex === globalLineIndex);
  }

  /**
   * Get global line index for a line within the current preview page
   */
  getGlobalLineIndex(localIndex: number): number {
    let offset = 0;
    for (let i = 0; i < this.currentPreviewPage; i++) {
      offset += this.previewPages[i]?.length || 0;
    }
    return offset + localIndex;
  }

  /**
   * Navigate preview pages
   */
  goToPreviewPage(delta: number) {
    const target = this.currentPreviewPage + delta;
    if (target >= 0 && target < this.previewPages.length) {
      this.currentPreviewPage = target;
    }
  }

  /**
   * Auto-mark page breaks every N lines
   */
  autoMarkPages() {
    this.pageBreaks = [];
    for (let i = this.linesPerPage - 1; i < this.allLines.length; i += this.linesPerPage) {
      this.pageBreaks.push({ afterLineIndex: i });
    }
    this.buildPreview();
    this.showToast(`Auto-marked ${this.pageBreaks.length} page breaks (${this.linesPerPage} lines/page)`);
  }

  /**
   * Clear all page breaks
   */
  clearPageBreaks() {
    this.pageBreaks = [];
    this.buildPreview();
    this.showToast('All page breaks cleared');
  }

  /**
   * Export current data in the selected format
   */
  async exportData(format: 'json' | 'archive' | 'csv') {
    if (this.previewPages.length === 0) {
      this.showToast('No data to export. Load text first.', 'warning');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'json': {
        const data = {
          metadata: {
            totalPages: this.previewPages.length,
            linesPerPage: this.linesPerPage,
            font: this.fontFamily,
            fontSize: this.fontSize,
            exportedAt: new Date().toISOString(),
            source: 'Quran Hifz Helper Playground',
          },
          pages: this.previewPages.map((lines, i) => ({
            pageNumber: i + 1,
            lines,
          })),
        };
        content = JSON.stringify(data, null, 2);
        filename = `quran-custom-${this.linesPerPage}lines.json`;
        mimeType = 'application/json';
        break;
      }
      case 'archive': {
        content = this.previewPages.map(lines => lines.join('\n')).join('\n\n');
        filename = `quran-custom-${this.linesPerPage}lines.txt`;
        mimeType = 'text/plain';
        break;
      }
      case 'csv': {
        const rows = ['page,line,text'];
        this.previewPages.forEach((lines, pageIdx) => {
          lines.forEach((line, lineIdx) => {
            rows.push(`${pageIdx + 1},${lineIdx + 1},"${line.replace(/"/g, '""')}"`);
          });
        });
        content = rows.join('\n');
        filename = `quran-custom-${this.linesPerPage}lines.csv`;
        mimeType = 'text/csv';
        break;
      }
    }

    // Trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Exported as ${filename}`, 'success');
  }

  /**
   * Save current work as a custom source in the app
   */
  async saveAsCustomSource() {
    const alert = await this.alertController.create({
      header: 'Save as Custom Source',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Source name (e.g., My 15-Line Quran)' },
        { name: 'description', type: 'text', placeholder: 'Description (optional)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name) return false;

            const fullText = this.previewPages.map(lines => lines.join('\n')).join('\n\n');
            await this.customSourceService.createSource(
              {
                name: data.name,
                linesPerPage: this.linesPerPage,
                fontFamily: this.fontFamily,
                baseUrl: '',
                description: data.description || '',
              },
              fullText,
              'archive',
              false,
            );
            this.showToast('Saved as custom source! Available in reader source selector.', 'success');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(msg: string, color = 'primary') {
    const t = await this.toastController.create({ message: msg, color, duration: 3000 });
    t.present();
  }
}

