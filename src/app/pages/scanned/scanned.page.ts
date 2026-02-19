import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Storage } from "@ionic/storage-angular";

export interface ScannedSource {
  id: string;
  label: string;
  identifier: string;
  /** If the archive has multiple files, filter by partial name */
  fileFilter?: string;
  /** Known total pages (0 = unknown, will show until 404) */
  totalPages: number;
  /** Whether juz/surah jump controls are available */
  hasJuzSurahMeta: boolean;
}

export const SCANNED_SOURCES: ScannedSource[] = [
  {
    id: '15-saudi',
    label: '15-Line Saudi Mushaf',
    identifier: '15-lined-saudi',
    fileFilter: '',
    totalPages: 611,
    hasJuzSurahMeta: true,
  },
  {
    id: '16-darussalam',
    label: '16-Line (Darussalam)',
    identifier: '16-line-quran-with-large-font-size',
    fileFilter: '',
    totalPages: 548,
    hasJuzSurahMeta: false,
  },
  {
    id: '13-taj',
    label: '13-Line (Taj Company)',
    identifier: 'holyquran13lines',
    fileFilter: 'Holy Quran- 13 Lines',
    totalPages: 850,
    hasJuzSurahMeta: false,
  },
  {
    id: '16-taj',
    label: '16-Line (Taj Company)',
    identifier: 'holyquran13lines',
    fileFilter: 'Holy Quran- 16 Lines',
    totalPages: 548,
    hasJuzSurahMeta: false,
  },
  {
    id: '17-taj',
    label: '17-Line (Taj Company)',
    identifier: 'holyquran13lines',
    fileFilter: 'Holy Quran- 17 Lines',
    totalPages: 520,
    hasJuzSurahMeta: false,
  },
  {
    id: '18-taj',
    label: '18-Line (Taj Company)',
    identifier: 'holyquran13lines',
    fileFilter: 'Holy Quran- 18 Lines',
    totalPages: 490,
    hasJuzSurahMeta: false,
  },
  {
    id: '21-taj',
    label: '21-Line (Taj Company)',
    identifier: 'holyquran13lines',
    fileFilter: 'Holy Quran- 21 Lines',
    totalPages: 410,
    hasJuzSurahMeta: false,
  },
];

@Component({
  selector: "app-scanned",
  templateUrl: "./scanned.page.html",
  styleUrls: ["./scanned.page.scss"],
})
export class ScannedPage implements OnInit {
  page: number = 1;
  urls: string[] = [];
  incompleteUrl: string;
  identifier: string;
  imgQuality: ImageQuality = ImageQuality.High;
  ImageQuality = ImageQuality;
  loading: boolean = false;
  surahNumberField: number;
  juzNumberField: number;
  errorLoading = false;

  // Multi-source support
  sources = SCANNED_SOURCES;
  selectedSourceId = '15-saudi';
  selectedSource: ScannedSource = SCANNED_SOURCES[0];

  // 15-line Saudi metadata (only source with juz/surah page mappings)
  surahPageNumbers = [
    2, 3, 51, 78, 107, 129, 152, 178, 188, 209, 222, 236, 250, 256, 262, 268,
    283, 294, 306, 313, 323, 332, 343, 351, 360, 367, 377, 386, 397, 405, 412,
    416, 419, 429, 435, 441, 446, 453, 459, 468, 478, 484, 490, 496, 499, 503,
    507, 512, 516, 519, 521, 524, 527, 529, 532, 535, 538, 543, 546, 550, 552,
    554, 555, 557, 559, 561, 563, 565, 568, 570, 572, 574, 577, 579, 581, 583,
    585, 587, 588, 590, 591, 592, 593, 595, 596, 597, 598, 598, 599, 601, 601,
    602, 603, 603, 604, 604, 605, 605, 606, 606, 607, 607, 608, 608, 608, 609,
    609, 609, 609, 610, 610, 610, 611, 611,
  ];
  juzPageNumbers = [
    2, 23, 43, 63, 83, 103, 123, 143, 163, 183, 203, 223, 243, 263, 283, 303,
    323, 343, 363, 383, 403, 423, 443, 463, 483, 503, 523, 543, 563, 587,
  ];
  sectionPageNumbers = [
    [8, 13, 18], [27, 32, 38], [47, 53, 58], [67, 72, 77],
    [88, 92, 97], [107, 113, 118], [127, 133, 137], [147, 151, 156],
    [167, 172, 177], [187, 193, 198], [208, 213, 217], [227, 232, 238],
    [247, 253, 257], [268, 273, 277], [287, 292, 297], [307, 313, 317],
    [327, 332, 338], [347, 353, 357], [367, 373, 378], [387, 393, 397],
    [408, 413, 418], [427, 432, 437], [447, 452, 457], [468, 473, 478],
    [487, 492, 497], [507, 514, 517], [528, 533, 537], [548, 552, 558],
    [568, 574, 581], [593, 599, 605],
  ];

  zoomProperties = {
    "double-tap": true,
    overflow: "hidden",
    wheel: false,
    disableZoomControl: "disable",
    backgroundColor: "rgba(0,0,0,0)",
  };

  constructor(
    private httpClient: HttpClient,
    private storage: Storage,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.getBookmark();
  }

  async getBookmark() {
    await this.storage.create();
    const savedSource = await this.storage.get('scannedSource');
    if (savedSource) {
      this.selectedSourceId = savedSource;
      this.selectedSource = this.sources.find(s => s.id === savedSource) || this.sources[0];
    }
    const savedPage = await this.storage.get('scannedBookmark');
    if (savedPage) this.page = savedPage;

    // Check route params
    const pageParam = this.route.snapshot.paramMap.get('page');
    if (pageParam) this.page = parseInt(pageParam, 10) || 1;

    this.setupLinks();
  }

  onSourceChange(sourceId: string) {
    this.selectedSourceId = sourceId;
    this.selectedSource = this.sources.find(s => s.id === sourceId) || this.sources[0];
    this.page = 1;
    this.urls = [];
    this.incompleteUrl = '';
    this.storage.set('scannedSource', sourceId);
    this.setupLinks();
  }

  setupLinks() {
    this.loading = true;
    this.errorLoading = false;
    const source = this.selectedSource;

    this.httpClient
      .get(`https://archive.org/metadata/${source.identifier}`)
      .subscribe(
        (res: any) => {
          let targetFile: any;

          if (source.fileFilter) {
            // Multi-file archive: find the matching file
            targetFile = res.files.find(
              (f: any) => f.name.includes(source.fileFilter) && f.name.endsWith('.pdf')
            );
          } else {
            // Single-file or find the largest PDF
            targetFile = res.files
              .filter((f: any) => f.name.endsWith('.pdf'))
              .sort((a: any, b: any) => parseInt(b.size) - parseInt(a.size))[0];
          }

          if (targetFile) {
            const fileNameIdentifier = targetFile.name.replace('.pdf', '').trim();
            this.identifier = res.metadata.identifier;
            this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${encodeURIComponent(fileNameIdentifier)}_jp2.zip&file=${encodeURIComponent(fileNameIdentifier)}_jp2/${encodeURIComponent(fileNameIdentifier)}_`;
            this.loadImg(this.page, this.imgQuality);
          } else {
            console.error('Could not find PDF file for source:', source.id);
            this.errorLoading = true;
            this.loading = false;
          }
        },
        (err) => {
          console.error('Failed to fetch archive metadata:', err);
          this.errorLoading = true;
          this.loading = false;
        }
      );
  }

  getPaddedNumber(n: number) {
    return String(n).padStart(4, "0");
  }

  loadImg(p: number, quality?: ImageQuality) {
    if (!quality) quality = this.imgQuality;
    if (!this.incompleteUrl) return;
    this.loading = true;

    const maxPage = this.selectedSource.totalPages || 9999;
    if (p < 1) p = 1;
    if (p > maxPage) p = maxPage;

    const u0 = `${this.incompleteUrl}${this.getPaddedNumber(p - 1)}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    const u1 = `${this.incompleteUrl}${this.getPaddedNumber(p)}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    const u2 = `${this.incompleteUrl}${this.getPaddedNumber(p + 1)}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;

    this.urls = [u0, u1, u2];
    this.page = p;

    this.storage.set("scannedBookmark", this.page);

    if (this.selectedSource.hasJuzSurahMeta) {
      let juzCalculated = this.juzPageNumbers.findIndex((e) => e > p);
      let surahCalculated = this.surahPageNumbers.findIndex((e) => e > p);
      if (juzCalculated === -1) juzCalculated = 30;
      if (surahCalculated === -1) surahCalculated = 114;
      this.juzNumberField = juzCalculated;
      this.surahNumberField = surahCalculated;
    }

    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  jumpToSurah(n: number) {
    if (!this.selectedSource.hasJuzSurahMeta) return;
    this.loadImg(this.surahPageNumbers[n - 1], this.imgQuality);
  }

  jumpToJuz(n: number, section?: number) {
    if (!this.selectedSource.hasJuzSurahMeta) return;
    if (section)
      this.loadImg(this.juzPageNumbers[n - 1] + section * 20, this.imgQuality);
    else this.loadImg(this.juzPageNumbers[n - 1], this.imgQuality);
  }

  jumpToSection(section: number) {
    if (!this.selectedSource.hasJuzSurahMeta) return;
    let index: number;
    switch (section) {
      case 0:
        if (this.page !== this.juzPageNumbers[this.juzNumberField - 1])
          this.jumpToJuz(this.juzNumberField);
        return;
      case 0.25: index = 0; break;
      case 0.5: index = 1; break;
      case 0.75: index = 2; break;
      case 1:
        if (this.juzNumberField === 30) this.loadImg(611, this.imgQuality);
        else if (this.page !== this.juzPageNumbers[this.juzNumberField] - 1)
          this.loadImg(this.juzPageNumbers[this.juzNumberField] - 1, this.imgQuality);
        return;
      default: index = 0; break;
    }
    this.loadImg(this.sectionPageNumbers[this.juzNumberField - 1][index], this.imgQuality);
  }
}

export enum ImageQuality {
  Low = 8,
  High = 4,
  HD = 2,
}
