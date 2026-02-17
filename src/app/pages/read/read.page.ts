import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import {
  GestureController,
  ModalController,
  PopoverController,
  ToastController,
} from "@ionic/angular";
import { AlertController } from "@ionic/angular";
import { alertController } from "@ionic/core";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { VirtualScrollerComponent } from "ngx-virtual-scroller";
import { Storage } from "@ionic/storage-angular";
import { Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";
import { ActionSheetController } from "@ionic/angular";
import { FirstLastAyah } from "src/app/models/firstLastModels";
import {
  RukuLocationItem,
  SearchResults,
  SearchResultsList,
} from "src/app/models/common";
import { MushafLines } from "src/app/models/mushaf-versions";
import { ImageQuality } from "../scanned/scanned.page";
import { Bookmarks } from "src/app/models/bookmarks";
import { TafseerModalComponent } from "src/app/components/tafseer-modal";
import { QuranDataService } from "src/app/services/quran-data.service";
import { AppDataService } from "src/app/services/app-data.service";
import { applyTajweed, TAJWEED_LEGEND } from "src/app/lib/tajweed";
import { MorphologyService, WordMorphology } from "src/app/services/morphology.service";

export interface WbwWord {
  arabic: string;
  translation: string;
  transliteration?: string;
  audioUrl?: string;
  location?: string; // "surah:ayah:word"
  verseKey?: string;
}

@Component({
  selector: "app-read",
  templateUrl: "./read.page.html",
  styleUrls: ["./read.page.scss"],
})
export class ReadPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("swipeContainer", { read: ElementRef })
  swipeContainer!: ElementRef;
  @ViewChild(VirtualScrollerComponent, { static: false })
  surah;
  lines: string[] = [];
  pages: string[] = [];
  tPages: string[] = [];
  arabicLines: string[] = [];
  translationLines: string[] = [];
  isDataLoaded: boolean = false;
  currentPage: number = 1;
  translation: string;
  tMode: boolean = false;
  hMode: boolean = false;
  translationExists: boolean = false;
  isPopoverOpen: boolean = false;
  isSearchOpen: boolean = false;
  currentSurahInfo;
  pageFontSize: string;
  audioSrc: string;
  audio: HTMLAudioElement;
  audioPlaying = false;
  audioPlayIndex = 1;
  audioSpeed = "1";
  playingVerseNum: string;
  reciters = [];
  qariId: number = 7;
  selectedQari;
  enableTatweel = true;
  quranComProgress = { loaded: 0, total: 0, done: true };
  showQuranComProgress = false;
  mushafVersion = MushafLines.Fifteen;
  isFullscreen: boolean = false;

  // Dynamic font class based on current text source
  currentFontClass: string = 'ar2'; // default: Muhammadi for archive

  // Inline translation mode
  inlineTransMode = false;
  inlineTransLang: 'en' | 'ur' = 'en';
  inlineTranslations: string[] = [];
  private inlineTransCache: Map<string, string[]> = new Map();

  // Word-by-word translation mode
  wbwMode = false;
  wbwData: WbwWord[][] = []; // per line, array of word pairs
  private wbwCache: Map<string, WbwWord[][]> = new Map();

  // Word detail popover
  selectedWord: WbwWord | null = null;
  selectedWordMorphology: WordMorphology | null = null;
  isWordDetailOpen = false;

  // Tajweed mode
  tajweedMode = false;
  tajweedLines: string[] = []; // HTML strings with tajweed coloring
  tajweedLegend = TAJWEED_LEGEND;
  private tajweedCache: Map<string, string[]> = new Map();

  // Long-press tracking
  private longPressTimer: any;
  private longPressTriggered = false;
  private readonly LONG_PRESS_DURATION = 500; // ms

  searchResults: SearchResults;

  juzPages = [];

  surahPages = [];

  isCompleteMushaf: boolean;

  juzCalculated: number;

  surahCalculated: number;

  currentPageCalculated: number;

  surahCalculatedForJuz: number;

  rukuArray: RukuLocationItem[][] = [];

  surahArray = [];
  queryString: string;
  isResultSelected: boolean = false;

  bookmarks: Bookmarks;

  MUSHAF_MODE: {
    COMPLETE_MUSHAF: boolean;
    JUZ_VERSION: boolean;
    SURAH_VERSION: boolean;
  };

  surahInfo;

  title;
  juzNumber;
  ignoreTashkeel: boolean = true;
  juzmode: boolean;
  juzsurahmode: boolean;
  startIndex: number;
  copyResultsBG = "dark";
  scanView: boolean = false;
  fullImageUrl: string;
  identifier;
  incompleteUrl;
  zoomProperties = {
    "double-tap": true, // double tap to zoom in and out.
    overflow: "hidden", // Am not sure. But Documentation says, it will not render elements outside the container.
    wheel: false, // Disables mouse - To enable scrolling. Else mouse scrolling will be used to zoom in and out on web.
    disableZoomControl: "disable", // stops showing zoom + and zoom - images.
    backgroundColor: "rgba(0,0,0,0)", // Makes the pinch zoom container color to transparent. So that ionic themes can be applied without issues.
  };
  private destroy$ = new Subject<void>();
  private swipeGesture: any;
  private arElement?: HTMLElement;
  private arMouseupHandler = () => {
    const selection = window.getSelection();
    const start = selection?.anchorOffset ?? 0;
    const end = selection?.focusOffset ?? 0;
    if (start >= 0 && end >= 0) {
      console.log("start: " + start);
      console.log("end: " + end);
    }
  };
  private arSelectStartHandler = () => {
    const selection = window.getSelection();
    const txt = selection?.toString();
    if (txt && txt !== "") {
      const selectedElement = selection?.anchorNode?.parentElement;
      if (selectedElement) {
        console.log("Element where selection happened:", selectedElement);
      }
    }
  };
  private selectionChangeHandler = () => {
    this.selectionChangeReportHandler();
  };
  selectionMap = {
    somethingSelected: false,
    selectedElementId: "",
    message: "",
  };

  /**
   * Immersive mode - hides header and footer for full-screen reading
   */
  isImmersive: boolean = false;

  constructor(
    public surahService: SurahService,
    public toastController: ToastController,
    public alertController: AlertController,
    private router: Router,
    private httpClient: HttpClient,
    private activatedRoute: ActivatedRoute,
    public changeDetectorRef: ChangeDetectorRef,
    private storage: Storage,
    private popoverController: PopoverController,
    private modalController: ModalController,
    private gestureCtrl: GestureController,
    private quranDataService: QuranDataService,
    private appDataService: AppDataService,
    private actionSheetController: ActionSheetController,
    private morphologyService: MorphologyService
  ) {}

  ngOnInit() {
    this.quranDataService
      .getQuranComProgress()
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress) => {
        this.quranComProgress = progress;
        this.showQuranComProgress =
          progress.total > 0 && progress.loaded < progress.total;
      });

    // Check for route params first (new URL-based navigation)
    const routeParams = this.activatedRoute.snapshot.params;
    const routeData = this.activatedRoute.snapshot.data;
    const juzData = this.router.getCurrentNavigation()?.extras?.state?.juzData;
    
    // Handle URL-based navigation (refresh-safe)
    if (routeParams.id || routeData.mode === 'full') {
      this.initFromRouteParams(routeParams, routeData);
      // initFromRouteParams handles async data loading, so return early
      // The rest of initialization will be done after data loads
      return;
    }
    // Handle legacy state-based navigation
    else if (juzData) {
      this.juzmode = true;
      this.juzsurahmode = juzData.mode === "surah";
      this.surah = juzData.data;
      this.title = juzData.title;
      this.pages = this.surah?.split("\n\n") || [];
      this.lines = this.pages[this.currentPage - 1]?.split("\n") || [];
      console.log(this.lines);
      this.rukuArray = [...(juzData.rukuArray || [])];
      this.isDataLoaded = true;
    } else if (!juzData && !routeParams.id) {
      console.log("not jz mode", this.surah);
      this.juzmode = false;
      this.surah = this.surahService.currentSurah;
      if (!this.surah) {
        // No data available, redirect to browse
        this.router.navigate(['/browse']);
        return;
      }
      this.title = this.surah.name;
      this.pages = this.surah.arabic?.split("\n\n") || [];
      this.arabicLines = this.pages[this.currentPage - 1]?.split("\n") || [];
      this.lines = this.arabicLines;
      if (this.surah.urdu && this.surah.urdu != "") {
        this.translationExists = true;
        this.tPages = this.surah.urdu.split("\n\n");
        this.translationLines = this.tPages[this.currentPage - 1]?.split("\n") || [];
      }
      this.isDataLoaded = true;
    }
    
    // Only run these if we have data loaded (not async route loading)
    if (this.pages.length > 0) {
      // Archive-15 has 611 pages, Quran.com 15-line has 605 (604+title), etc.
      this.isCompleteMushaf = this.pages.length > 500;
      this.MUSHAF_MODE = {
        COMPLETE_MUSHAF: this.juzmode && this.isCompleteMushaf,
        JUZ_VERSION: this.juzmode && !this.isCompleteMushaf && !this.juzsurahmode,
        SURAH_VERSION:
          this.juzmode && !this.isCompleteMushaf && this.juzsurahmode,
      };

      // get bookmark
      this.getBookmark();
      this.updateCalculatedNumbers();
    }
    
    // get surah info file
    this.surahService
      .getSurahInfo()
      .pipe(take(1))
      .subscribe((res: any) => {
      this.surahInfo = res;
      this.surahService.surahInfo = res;
    });
    // Adjust font size
    this.adjustFontsize();
    // Get scan info
    this.setupLinks();
  }

  ngAfterViewInit(): void {
    this.fetchQariList();
    var el: HTMLElement = document.querySelector(".content-wrapper");
    this.pageFontSize = window
      .getComputedStyle(el, null)
      .getPropertyValue("font-size");
    this.setupSwipeGesture();
    this.attachSelectionListeners();
    this.loadSavedTheme();
  }

  async getBookmark() {
    await this.storage.create();
    // this.storage.get("unicodeBookmark").then((pageNum) => {
    //   console.log("bookmark fetched:", pageNum);
    //   if (pageNum) this.gotoPageNum(pageNum);
    // });
    this.bookmarks = await this.storage.get("bookmarks");
    if (this.bookmarks) {
      let pageNumberToJumpTo: number;
      if (this.MUSHAF_MODE.COMPLETE_MUSHAF)
        pageNumberToJumpTo = this.bookmarks?.auto?.unicode;
      if (this.MUSHAF_MODE.JUZ_VERSION)
        pageNumberToJumpTo = this.bookmarks?.auto?.juz?.find(
          (j) => j.juz === parseInt(this.title)
        )?.page;
      if (this.MUSHAF_MODE.SURAH_VERSION)
        pageNumberToJumpTo = this.bookmarks?.auto?.surah?.find(
          (j) => j.surah === parseInt(this.title)
        )?.page;
      this.gotoPageNum(pageNumberToJumpTo);
    } else {
      this.bookmarks = {
        auto: {
          unicode: 1,
          scanned: 1,
          juz: [],
          surah: [],
        },
        manual: [],
      };
    }
    console.log("bookmarks fetched:", this.bookmarks);
  }

  setBookmark() {
    if (!this.bookmarks || !this.MUSHAF_MODE) return;
    console.log("setting bookmarks: ", this.bookmarks, this.MUSHAF_MODE);
    if (
      this.juzmode &&
      this.isCompleteMushaf &&
      this.currentPage !== 1 &&
      this.currentPage !== this.pages.length
    )
      this.storage.set("unicodeBookmark", this.currentPage).then((_) => {});

    // complete mushaf
    if (this.MUSHAF_MODE.COMPLETE_MUSHAF && this.bookmarks?.auto)
      this.bookmarks.auto.unicode = this.currentPage;

    // juz version
    if (this.MUSHAF_MODE.JUZ_VERSION && this.bookmarks?.auto?.juz) {
      const index = this.bookmarks.auto.juz.findIndex(
        (bookmark) => bookmark.juz === parseInt(this.title)
      );
      if (index !== -1) {
        this.bookmarks.auto.juz[index].page = this.currentPage;
      } else {
        this.bookmarks.auto.juz.push({
          juz: parseInt(this.title),
          page: this.currentPage,
        });
      }
    }
    // surah (juzsurah) version
    if (this.MUSHAF_MODE.SURAH_VERSION && this.bookmarks?.auto?.surah) {
      console.log("surah version =>", this.bookmarks.auto.surah);
      const index = this.bookmarks.auto.surah.findIndex(
        (bookmark) => bookmark.surah === parseInt(this.title)
      );
      if (index !== -1) {
        this.bookmarks.auto.surah[index].page = this.currentPage;
      } else {
        this.bookmarks.auto.surah.push({
          surah: parseInt(this.title),
          page: this.currentPage,
        });
      }
    }
    this.storage.set("bookmarks", this.bookmarks).then((_) => {});
  }
  goToPage(n: number) {
    const nextPage = this.currentPage + n;
    // Boundary check: don't go below 1 or above total pages
    if (nextPage < 1 || nextPage > this.pages.length) return;
    this.currentPage = nextPage;

    this.arabicLines = this.pages[this.currentPage - 1]?.split("\n") || [];
    this.updateCalculatedNumbers();
    this.scanView = false;
    if (this.translationExists)
      this.translationLines = this.tPages[this.currentPage - 1]?.split("\n") || [];
    this.lines = this.tMode ? this.translationLines : this.arabicLines;

    //close popup if open
    let popup: HTMLElement = document.querySelector(".popup");
    this.resetPopup(popup);

    //show translation only if toggled prop is on
    // this.translationMode(false);

    //if last line of last page, center the text
    console.log(
      this.currentPage,
      this.pages.length,
      `div#line_${this.arabicLines.length - 1}`
    );
    if (this.currentPage === this.pages.length) {
      console.log("running");
      document
        .querySelector(`div#line_${this.arabicLines.length - 1}`)
        ?.classList.add("centered-table-text");
    }
    this.setBookmark();
    this.getFirstAndLastAyahNumberOnPage();
    if (this.inlineTransMode) this.loadInlineTranslations();
    if (this.wbwMode) this.loadWbwTranslations();
    if (this.tajweedMode) this.loadTajweedText();
    setTimeout(() => {
      this.adjustFontsize();
    }, 100);
  }

  resetPopup(popup: HTMLElement) {
    popup.style.opacity = "0";
    popup.style.height = "0";
    popup.style.width = "0";
  }

  openTrans(event, n: number) {
    if (this.translationExists && !this.tMode && !this.juzmode) {
      this.translation = this.translationLines[n];
      console.log(n + 1 + ". " + this.translation);
      let popup: HTMLElement = document.querySelector(".popup");
      let e1: HTMLElement = document.querySelector(".popup .popup-header");
      let e2: HTMLElement = document.querySelector(".popup .popup-text");
      let cross: HTMLElement = document.querySelector(".cross");
      popup.style.width = "100%";
      popup.style.height = "auto";
      popup.style.opacity = "1";
      if (n < 10) popup.style.top = event.clientY - 40 + "px";
      else popup.style.top = event.clientY - 200 + "px";
      e1.textContent = "ترجمہ برائے سطر " + (n + 1);
      e2.textContent = this.translation;
      cross.addEventListener("click", () => {
        this.resetPopup(popup);
      });
      popup.addEventListener("click", () => {
        this.resetPopup(popup);
      });
    } else if (!this.surah?.urdu || this.juzmode) {
      console.log("Translation not available!");
      if (!this.juzmode)
        this.surahService.presentToastWithOptions(
          `Translation for ${this.title} is not available!`,
          "dark",
          "top"
        );
      else {
        const surahNum = this.getCorrectedSurahNumberWithRespectTo(n);
        const ayahNum = this.getNextAyahNumberFromCurrentLine(n);
        if (surahNum && ayahNum) {
          this.readTrans(`${surahNum}:${ayahNum}`);
        } else {
          this.surahService.presentToastWithOptions(
            'Could not determine the ayah for this line.',
            'warning',
            'bottom'
          );
        }
      }
    }
  }
  // ===========================================
  // LINE INTERACTION HANDLERS
  // Click = translate, DblClick = copy, LongPress = more options
  // ===========================================

  /**
   * Single click on a line - show translation (existing behavior)
   * Uses a timeout to distinguish from double-click
   */
  private singleClickTimer: any;
  private preventSingleClick = false;

  onLineClick(event: Event, lineIndex: number) {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }
    this.preventSingleClick = false;
    this.singleClickTimer = setTimeout(() => {
      if (!this.preventSingleClick) {
        this.openTrans(event, lineIndex);
      }
    }, 250);
  }

  /**
   * Double-click on a line - copy the line text
   */
  onLineDblClick(event: Event, lineIndex: number) {
    event.preventDefault();
    this.preventSingleClick = true;
    clearTimeout(this.singleClickTimer);

    const lineText = this.lines[lineIndex]?.trim();
    if (lineText) {
      this.copyAnything(lineText);
      this.surahService.presentToastWithOptions(
        'Line copied!',
        'success-light',
        'bottom'
      );
    }
  }

  /**
   * Long-press start (touch devices) - start timer for context menu
   */
  onLineTouchStart(event: TouchEvent, lineIndex: number) {
    this.longPressTriggered = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      event.preventDefault();
      this.showLineContextMenu(lineIndex);
    }, this.LONG_PRESS_DURATION);
  }

  onLineTouchEnd(event: TouchEvent, lineIndex: number) {
    clearTimeout(this.longPressTimer);
  }

  onLineTouchCancel() {
    clearTimeout(this.longPressTimer);
    this.longPressTriggered = false;
  }

  /**
   * Right-click context menu (desktop) - show options
   */
  onLineContextMenu(event: Event, lineIndex: number) {
    event.preventDefault();
    this.showLineContextMenu(lineIndex);
  }

  /**
   * Show the context menu with all options for a line
   */
  async showLineContextMenu(lineIndex: number) {
    const line = this.lines[lineIndex]?.trim() || '';
    const verseKey = this.getVerseKeyForLine(lineIndex);
    const surahNum = this.getCorrectedSurahNumberWithRespectTo(lineIndex);

    const buttons: any[] = [
      {
        text: 'Play from here',
        icon: 'play-outline',
        handler: () => {
          this.playAudioFromLine(lineIndex);
        },
      },
      {
        text: 'Show Translation',
        icon: 'language-outline',
        handler: () => {
          if (verseKey) {
            this.presentModal(verseKey);
          } else {
            this.openTrans({} as Event, lineIndex);
          }
        },
      },
      {
        text: 'Copy Line',
        icon: 'copy-outline',
        handler: () => {
          this.copyAnything(line);
          this.surahService.presentToastWithOptions('Line copied!', 'success-light', 'bottom');
        },
      },
      {
        text: 'Copy Page',
        icon: 'documents-outline',
        handler: () => {
          const pageText = this.lines.join('\n');
          this.copyAnything(pageText);
          this.surahService.presentToastWithOptions('Page copied!', 'success-light', 'bottom');
        },
      },
    ];

    // Add copy ayah option if we can identify the verse
    if (verseKey) {
      buttons.push({
        text: `📜 Copy Ayah (${verseKey})`,
        icon: 'document-text-outline',
        handler: () => {
          this.copyAyahText(verseKey);
        },
      });
      buttons.push({
        text: `📜 Copy Translation (${verseKey})`,
        icon: 'language-outline',
        handler: () => {
          this.copyAyahTranslation(verseKey);
        },
      });
    }

    buttons.push(
      {
        text: 'Bookmark this line',
        icon: 'bookmark-outline',
        handler: () => {
          this.bookmarkLine(lineIndex);
        },
      },
      {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
      }
    );

    const header = verseKey
      ? `Line ${lineIndex + 1} · Ayah ${verseKey}`
      : `Line ${lineIndex + 1} · Page ${this.currentPageCalculated || this.currentPage}`;

    const actionSheet = await this.actionSheetController.create({
      header,
      buttons,
      cssClass: 'line-context-menu',
    });
    await actionSheet.present();
  }

  /**
   * Get the verse key (surah:ayah) for a given line index.
   * Scans current and subsequent lines for an ayah mark.
   */
  private getVerseKeyForLine(lineIndex: number): string | null {
    try {
      const surahNum = this.getCorrectedSurahNumberWithRespectTo(lineIndex);
      const ayahNum = this.getNextAyahNumberFromCurrentLine(lineIndex);
      if (surahNum && ayahNum) {
        return `${surahNum}:${ayahNum}`;
      }
    } catch (e) {
      // Line might not have an ayah mark nearby
    }
    return null;
  }

  /**
   * Play audio starting from the ayah on a specific line
   */
  playAudioFromLine(lineIndex: number) {
    // Stop any currently playing audio
    if (this.audioPlaying && this.audio) {
      this.stopAudio();
    }

    const verseKey = this.getVerseKeyForLine(lineIndex);
    if (!verseKey) {
      this.surahService.presentToastWithOptions(
        'Could not determine ayah for this line',
        'warning',
        'middle'
      );
      return;
    }

    // Build ayah list from the line's ayah to end of page
    const ayahList = this.getAyahsListOnPage();
    if (!ayahList) return;

    const { verseIdList, verseIdListForAudio } = ayahList;
    const startIdx = verseIdList.indexOf(verseKey);
    if (startIdx === -1) {
      // Verse not in the page list — just play the single verse
      this.playSingleVerse(verseKey);
      return;
    }

    // Slice lists from the clicked line's ayah onwards
    const remainingIds = verseIdList.slice(startIdx);
    const remainingAudioIds = verseIdListForAudio.slice(startIdx);

    const key = remainingIds[0];
    const lang = 'en';
    const url = `https://api.quran.com/api/v4/verses/by_key/${key}?language=${lang}&audio=${this.qariId}`;
    this.httpClient.get(url).pipe(take(1)).subscribe((res: any) => {
      if (!res.verse?.audio) {
        this.surahService.presentToastWithOptions(
          `Audio not available for verse ${key}`,
          'warning',
          'middle'
        );
        return;
      }
      this.audioSrc = 'https://verses.quran.com/' + res.verse.audio.url;
      this.audio = new Audio(this.audioSrc);
      this.audioPlayIndex = 1;
      this.audioPlayRoutine(remainingAudioIds, remainingIds, key);
    });
  }

  /**
   * Play a single verse
   */
  private playSingleVerse(verseKey: string) {
    const url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?language=en&audio=${this.qariId}`;
    this.httpClient.get(url).pipe(take(1)).subscribe((res: any) => {
      if (!res.verse?.audio) {
        this.surahService.presentToastWithOptions(
          `Audio not available for ${verseKey}`,
          'warning',
          'middle'
        );
        return;
      }
      this.audioSrc = 'https://verses.quran.com/' + res.verse.audio.url;
      this.audio = new Audio(this.audioSrc);
      this.audioPlaying = true;
      this.playingVerseNum = verseKey;
      this.setAudioSpeed(this.audioSpeed);
      this.audio.play();
      this.audio.onended = () => {
        this.audioPlaying = false;
        this.audio = undefined;
      };
    });
  }

  /**
   * Copy the Arabic text of a specific ayah
   */
  private copyAyahText(verseKey: string) {
    const url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?fields=text_indopak`;
    this.httpClient.get(url).pipe(take(1)).subscribe(
      (res: any) => {
        const text = res.verse?.text_indopak || '';
        this.copyAnything(text);
        this.surahService.presentToastWithOptions(`Ayah ${verseKey} copied!`, 'success-light', 'bottom');
      },
      () => {
        // Fallback: copy from line text
        this.surahService.presentToastWithOptions('Failed to fetch ayah text', 'danger', 'bottom');
      }
    );
  }

  /**
   * Copy translation of a specific ayah
   */
  private copyAyahTranslation(verseKey: string) {
    const url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?translations=131,84`;
    this.httpClient.get(url).pipe(take(1)).subscribe(
      (res: any) => {
        const translations = res.verse?.translations || [];
        const text = translations.map((t: any) => `${this.convertToPlain(t.text)} — ${t.resource_name}`).join('\n\n');
        this.copyAnything(`${verseKey}\n${text}`);
        this.surahService.presentToastWithOptions(`Translation copied!`, 'success-light', 'bottom');
      },
      () => {
        this.surahService.presentToastWithOptions('Failed to fetch translation', 'danger', 'bottom');
      }
    );
  }

  /**
   * Bookmark a specific line
   */
  private async bookmarkLine(lineIndex: number) {
    const page = this.currentPageCalculated || this.currentPage || 1;
    const verseKey = this.getVerseKeyForLine(lineIndex);
    const name = verseKey
      ? `Ayah ${verseKey} (Page ${page}, Line ${lineIndex + 1})`
      : `Page ${page}, Line ${lineIndex + 1}`;
    await this.appDataService.addManualBookmark(name, page, 'Reading', lineIndex, verseKey);
    this.surahService.presentToastWithOptions('Bookmark saved!', 'success', 'bottom');
  }

  // ===========================================
  // INLINE TRANSLATION
  // ===========================================

  /**
   * Toggle inline translation mode
   */
  toggleInlineTranslation(enabled: boolean) {
    this.inlineTransMode = enabled;
    if (enabled) {
      this.loadInlineTranslations();
    } else {
      this.inlineTranslations = [];
    }
  }

  /**
   * Reload inline translations (e.g., when language changes)
   */
  reloadInlineTranslations() {
    if (this.inlineTransMode) {
      this.loadInlineTranslations();
    }
  }

  /**
   * Load inline translations for all lines on the current page.
   * Maps each line to the ayah(s) it contains, fetches translations.
   */
  private loadInlineTranslations() {
    const cacheKey = `${this.currentPage}_${this.inlineTransLang}`;
    if (this.inlineTransCache.has(cacheKey)) {
      this.inlineTranslations = this.inlineTransCache.get(cacheKey)!;
      return;
    }

    // For surah mode with existing translation data
    if (this.translationExists && this.tPages?.length && this.inlineTransLang === 'ur') {
      const tLines = this.tPages[this.currentPage - 1]?.split('\n') || [];
      this.inlineTranslations = tLines;
      this.inlineTransCache.set(cacheKey, tLines);
      return;
    }

    // For juz mode (quran.com API) — build verse keys for all lines on this page
    if (!this.juzmode || !this.surahInfo) {
      this.inlineTranslations = [];
      return;
    }

    try {
      const firstAndLast = this.getFirstAndLastAyahNumberOnPage();
      if (!firstAndLast) {
        this.inlineTranslations = [];
        return;
      }

      const firstKey = firstAndLast.first.verseId;
      const lastKey = firstAndLast.last.verseId;
      const transId = this.inlineTransLang === 'ur' ? '151' : '131';
      const [fSurah, fAyah] = firstKey.split(':').map(Number);
      const [lSurah, lAyah] = lastKey.split(':').map(Number);

      // Build a list of all verse keys on this page
      const verseKeys: string[] = [];
      for (let s = fSurah; s <= lSurah; s++) {
        const startA = s === fSurah ? fAyah : 1;
        const surahAyahCount = this.surahService.surahAyahCounts?.[s - 1] || 999;
        const endA = s === lSurah ? lAyah : surahAyahCount;
        for (let a = startA; a <= endA; a++) {
          verseKeys.push(`${s}:${a}`);
        }
      }

      // Fetch translations for all verses at once via chapter endpoint
      const url = `https://api.quran.com/api/v4/verses/by_key/${firstKey}?translations=${transId}&fields=text_indopak`;
      // Actually fetch all in batch by using the page-range approach
      const batchUrl = `https://api.quran.com/api/v4/verses/by_chapter/${fSurah}?translations=${transId}&per_page=50&fields=text_indopak&from=${firstKey}&to=${lastKey}`;

      this.httpClient.get(batchUrl).pipe(take(1)).subscribe(
        (res: any) => {
          const verseTrans: Map<string, string> = new Map();
          (res.verses || []).forEach((v: any) => {
            const transText = v.translations?.[0]?.text || '';
            verseTrans.set(v.verse_key, this.convertToPlain(transText));
          });

          // Map each line to a translation based on which ayah it contains
          const result: string[] = [];
          for (let i = 0; i < this.lines.length; i++) {
            const vk = this.getVerseKeyForLine(i);
            result.push(vk ? (verseTrans.get(vk) || '') : '');
          }
          this.inlineTranslations = result;
          this.inlineTransCache.set(cacheKey, result);
        },
        () => {
          this.inlineTranslations = [];
        }
      );
    } catch (e) {
      console.warn('Inline translation failed:', e);
      this.inlineTranslations = [];
    }
  }

  // ===========================================
  // WORD-BY-WORD TRANSLATION
  // ===========================================

  toggleWbwMode(enabled: boolean) {
    this.wbwMode = enabled;
    if (enabled) {
      this.loadWbwTranslations();
    } else {
      this.wbwData = [];
    }
  }

  private loadWbwTranslations() {
    const cacheKey = `wbw_${this.currentPage}`;
    if (this.wbwCache.has(cacheKey)) {
      this.wbwData = this.wbwCache.get(cacheKey)!;
      return;
    }

    if (!this.juzmode || !this.surahInfo) {
      this.wbwData = [];
      return;
    }

    try {
      const firstAndLast = this.getFirstAndLastAyahNumberOnPage();
      if (!firstAndLast) {
        this.wbwData = [];
        return;
      }

      const firstKey = firstAndLast.first.verseId;
      const lastKey = firstAndLast.last.verseId;
      const [fSurah] = firstKey.split(':').map(Number);

      // Fetch verses with words and word translations
      const url = `https://api.quran.com/api/v4/verses/by_chapter/${fSurah}?words=true&word_translation_language=en&word_fields=text_indopak,text_uthmani&per_page=50&fields=text_indopak&from=${firstKey}&to=${lastKey}`;

      this.httpClient.get(url).pipe(take(1)).subscribe(
        (res: any) => {
          const verseWords: Map<string, WbwWord[]> = new Map();
          (res.verses || []).forEach((v: any) => {
            const words: WbwWord[] = (v.words || [])
              .filter((w: any) => w.char_type_name !== 'end')
              .map((w: any) => ({
                arabic: w.text_indopak || w.text_uthmani || w.text || '',
                translation: w.translation?.text || '',
                transliteration: w.transliteration?.text || '',
                audioUrl: w.audio_url ? `https://audio.qurancdn.com/${w.audio_url}` : '',
                location: w.location || '',
                verseKey: v.verse_key || '',
              }));
            verseWords.set(v.verse_key, words);
          });

          // Map each line to its verse's word data
          const result: WbwWord[][] = [];
          for (let i = 0; i < this.lines.length; i++) {
            const vk = this.getVerseKeyForLine(i);
            result.push(vk ? (verseWords.get(vk) || []) : []);
          }
          this.wbwData = result;
          this.wbwCache.set(cacheKey, result);
        },
        () => {
          this.wbwData = [];
        }
      );
    } catch (e) {
      console.warn('WBW load failed:', e);
      this.wbwData = [];
    }
  }

  // ===========================================
  // WORD DETAIL (MORPHOLOGY)
  // ===========================================

  showWordDetail(word: WbwWord) {
    this.selectedWord = word;
    this.selectedWordMorphology = null;
    this.isWordDetailOpen = true;

    // Load morphology data if we have a location
    if (word.location) {
      const parts = word.location.split(':');
      if (parts.length >= 3) {
        const surah = parseInt(parts[0]);
        const ayah = parseInt(parts[1]);
        const wordIdx = parseInt(parts[2]);
        if (surah && ayah && wordIdx) {
          this.morphologyService.getWordMorphology(surah, ayah, wordIdx)
            .pipe(take(1))
            .subscribe(morph => {
              this.selectedWordMorphology = morph;
            });
        }
      }
    }
  }

  closeWordDetail() {
    this.isWordDetailOpen = false;
    this.selectedWord = null;
    this.selectedWordMorphology = null;
  }

  playWordAudio(word: WbwWord) {
    if (!word.audioUrl) return;
    const audio = new Audio(word.audioUrl);
    audio.play().catch(() => {});
  }

  getCorpusUrl(word: WbwWord): string {
    // Link to corpus.quran.com for detailed morphology
    // Format: http://corpus.quran.com/wordmorphology.jsp?location=(surah:ayah:word)
    if (word.location) {
      return `http://corpus.quran.com/wordmorphology.jsp?location=(${word.location})`;
    }
    return '';
  }

  // ===========================================
  // TAJWEED COLORS (OFFLINE – no API dependency)
  // Uses src/app/lib/tajweed – ported from quran/tajweed Java lib
  // ===========================================

  toggleTajweedMode(enabled: boolean) {
    this.tajweedMode = enabled;
    if (enabled) {
      this.loadTajweedText();
    } else {
      this.tajweedLines = [];
    }
  }

  /**
   * Apply tajweed colouring to every line on the current page.
   * This is fully offline – it analyses the Arabic text directly
   * using the ported tajweed rules (ghunna, ikhfa, idgham, etc.)
   * and wraps character ranges with <span class="tj-..."> tags.
   * The original text is NEVER modified – only wrapped.
   */
  private loadTajweedText() {
    const cacheKey = `tajweed_${this.currentPage}`;
    if (this.tajweedCache.has(cacheKey)) {
      this.tajweedLines = this.tajweedCache.get(cacheKey)!;
      return;
    }

    if (!this.lines || this.lines.length === 0) {
      this.tajweedLines = [];
      return;
    }

    try {
      const result: string[] = [];
      for (const line of this.lines) {
        const trimmed = line?.trim();
        if (!trimmed || trimmed === '﷽') {
          result.push(trimmed || '');
        } else {
          // applyTajweed returns HTML with <span class="tj-..."> wrappers.
          // It NEVER removes any codepoints from the input.
          result.push(applyTajweed(trimmed, 'class'));
        }
      }
      this.tajweedLines = result;
      this.tajweedCache.set(cacheKey, result);
    } catch (e) {
      console.warn('Tajweed offline processing failed:', e);
      this.tajweedLines = [];
    }
  }

  // ===========================================
  // JUMP TO AYAH
  // ===========================================

  /**
   * Navigate to a specific ayah (format: "surah:ayah")
   * Finds the page containing that ayah and navigates to it
   */
  gotoAyah(val: string) {
    if (!val || !val.includes(':')) return;
    const [surahStr, ayahStr] = val.split(':');
    const surah = parseInt(surahStr);
    const ayah = parseInt(ayahStr);
    if (isNaN(surah) || isNaN(ayah) || surah < 1 || surah > 114 || ayah < 1) return;

    // For complete mushaf, scan pages to find the ayah
    if (this.isCompleteMushaf) {
      const AYAH_MARK = this.surahService.diacritics.AYAH_MARK;
      const BISM = this.surahService.diacritics.BISM;
      let currentSurah = 1;

      for (let p = 0; p < this.pages.length; p++) {
        const pageText = this.pages[p];
        const pageLines = pageText.split('\n');

        // Track surah number changes on this page
        for (const line of pageLines) {
          if (line.includes(BISM) && p > 0) {
            // Bismillah indicates start of a new surah
            // (except for Surah Fatihah on page 1)
            currentSurah++;
          }
        }

        if (currentSurah >= surah) {
          // Check if this page contains the target ayah
          const ayahPattern = new RegExp(
            `${AYAH_MARK}${this.surahService.e2a(ayah.toString())}(?:[^۰-۹]|$)`
          );
          if (ayahPattern.test(pageText) || (currentSurah === surah && ayah === 1)) {
            this.gotoPageNum(p + 1);
            // Try to highlight the line containing the ayah
            setTimeout(() => {
              for (let l = 0; l < pageLines.length; l++) {
                if (ayahPattern.test(pageLines[l]) || (ayah === 1 && l === 0)) {
                  const el = document.querySelector(`#line_${l}`) as HTMLElement;
                  if (el) {
                    el.classList.add('highlight-line');
                    setTimeout(() => el.classList.remove('highlight-line'), 2000);
                  }
                  break;
                }
              }
            }, 200);
            return;
          }
        }
      }
      // Fallback: use surah page numbers
      this.gotoPageNum(this.surahService.surahPageNumbers[surah - 1]);
    }
  }

  // ===========================================
  // EXPORT TEXT
  // ===========================================

  /**
   * Show export text options - copy line, page, surah, juz, or range
   */
  async exportText() {
    const buttons: any[] = [
      {
        text: 'Copy Current Page',
        handler: () => {
          const text = this.lines.join('\n');
          this.copyAnything(text);
          this.surahService.presentToastWithOptions('Page copied!', 'success-light', 'bottom');
        },
      },
    ];

    if (this.isCompleteMushaf) {
      buttons.push({
        text: `Copy Current Surah (${this.surahService.surahNames[this.surahCalculated - 1] || ''})`,
        handler: () => {
          this.copySurahText(this.surahCalculated);
        },
      });
      buttons.push({
        text: `Copy Current Juz (${this.juzCalculated})`,
        handler: () => {
          this.copyJuzText(this.juzCalculated);
        },
      });
    }

    // Copy current ruku if applicable
    if (this.isCompleteMushaf && this.juzCalculated) {
      buttons.push({
        text: 'Copy Current Ruku',
        handler: () => {
          this.copyRukuText();
        },
      });
    }

    buttons.push(
      {
        text: 'Copy Page Range...',
        handler: () => {
          this.promptCopyPageRange();
        },
      },
      {
        text: 'Save as Text File...',
        handler: () => {
          this.saveAsTextFile();
        },
      },
      {
        text: 'Cancel',
        role: 'cancel',
      }
    );

    const actionSheet = await this.actionSheetController.create({
      header: 'Export / Copy Text',
      buttons,
    });
    await actionSheet.present();
  }

  private copySurahText(surahNum: number) {
    if (!surahNum || surahNum < 1 || surahNum > 114) return;
    const startPage = this.surahService.surahPageNumbers[surahNum - 1] - 1;
    const endPage = surahNum < 114
      ? this.surahService.surahPageNumbers[surahNum] - 1
      : this.pages.length;
    const text = this.pages.slice(startPage, endPage).join('\n\n--- Page Break ---\n\n');
    this.copyAnything(text);
    this.surahService.presentToastWithOptions(
      `Surah ${this.surahService.surahNames[surahNum - 1]} copied!`,
      'success-light',
      'bottom'
    );
  }

  private copyJuzText(juzNum: number) {
    if (!juzNum || juzNum < 1 || juzNum > 30) return;
    const startPage = this.surahService.juzPageNumbers[juzNum - 1] - 1;
    const endPage = juzNum < 30
      ? this.surahService.juzPageNumbers[juzNum] - 1
      : this.pages.length;
    const text = this.pages.slice(startPage, endPage).join('\n\n--- Page Break ---\n\n');
    this.copyAnything(text);
    this.surahService.presentToastWithOptions(
      `Juz ${juzNum} copied!`,
      'success-light',
      'bottom'
    );
  }

  private async promptCopyPageRange() {
    const alert = await this.alertController.create({
      header: 'Copy Page Range',
      inputs: [
        { name: 'from', type: 'number', placeholder: 'From page', min: 1, max: this.pages.length },
        { name: 'to', type: 'number', placeholder: 'To page', min: 1, max: this.pages.length },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Copy',
          handler: (data) => {
            const from = Math.max(1, parseInt(data.from) || 1) - 1;
            const to = Math.min(this.pages.length, parseInt(data.to) || this.pages.length);
            const text = this.pages.slice(from, to).join('\n\n--- Page Break ---\n\n');
            this.copyAnything(text);
            this.surahService.presentToastWithOptions(
              `Pages ${from + 1}–${to} copied!`,
              'success-light',
              'bottom'
            );
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Copy current ruku text (from current ruku mark to next ruku mark)
   */
  private copyRukuText() {
    if (!this.rukuArray || !this.juzCalculated) return;
    const juzRukus = this.rukuArray[this.juzCalculated - 1];
    if (!juzRukus?.length) return;

    // Find the current ruku based on page/line
    let currentRukuIdx = 0;
    for (let i = 0; i < juzRukus.length; i++) {
      const ruku = juzRukus[i];
      const rukuPage = ruku.pageNumber || (this.surahService.juzPageNumbers[this.juzCalculated - 1] + ruku.juzPageIndex);
      if (rukuPage <= (this.currentPageCalculated || this.currentPage)) {
        currentRukuIdx = i;
      }
    }

    // Get start and end pages/lines for this ruku
    const currentRuku = juzRukus[currentRukuIdx];
    const nextRuku = juzRukus[currentRukuIdx + 1];
    const startPage = currentRuku.pageNumber || (this.surahService.juzPageNumbers[this.juzCalculated - 1] + currentRuku.juzPageIndex);
    const endPage = nextRuku
      ? (nextRuku.pageNumber || (this.surahService.juzPageNumbers[this.juzCalculated - 1] + nextRuku.juzPageIndex))
      : startPage + 2; // approximate

    const textParts: string[] = [];
    for (let p = startPage - 1; p < Math.min(endPage, this.pages.length); p++) {
      const pageLines = this.pages[p]?.split('\n') || [];
      const startLine = (p === startPage - 1) ? (currentRuku.lineIndex || 0) : 0;
      const endLine = (p === endPage - 1 && nextRuku) ? (nextRuku.lineIndex || pageLines.length) : pageLines.length;
      textParts.push(pageLines.slice(startLine, endLine).join('\n'));
    }

    const text = textParts.join('\n');
    this.copyAnything(text);
    this.surahService.presentToastWithOptions(
      `Ruku ${currentRukuIdx + 1} copied!`,
      'success-light',
      'bottom'
    );
  }

  /**
   * Save text as a downloadable .txt file
   */
  private async saveAsTextFile() {
    const alert = await this.alertController.create({
      header: 'Save as Text File',
      message: 'Choose what to save:',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Current Page',
          handler: () => {
            const text = this.lines.join('\n');
            const page = this.currentPageCalculated || this.currentPage;
            this.downloadTextFile(text, `quran-page-${page}.txt`);
          },
        },
        {
          text: 'All Pages',
          handler: () => {
            const text = this.pages.join('\n\n--- Page Break ---\n\n');
            this.downloadTextFile(text, `quran-full-text.txt`);
          },
        },
      ],
    });
    await alert.present();
  }

  private downloadTextFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.surahService.presentToastWithOptions(`Saved as ${filename}`, 'success-light', 'bottom');
  }

  getNextAyahNumberFromCurrentLine(lineNumber: number) {
    if (!this.lines || this.lines.length === 0) return null;

    // For qurancom: use ayah metadata instead of text scanning
    const source = this.quranDataService.getCurrentSourceValue();
    if (source.type === 'qurancom') {
      return this.getNextAyahNumberFromMetadata(lineNumber);
    }

    // Archive text: scan for ayah marks
    const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹١-٩]`);
    let lineCounter = lineNumber;
    let txt = "";
    let found = false;

    while (lineCounter < this.lines.length) {
      txt = this.lines[lineCounter];
      lineCounter++;
      if (txt && re.test(txt)) {
        found = true;
        break;
      }
    }

    if (!found) return null;

    const matchedWord = txt.split(" ").find((word) => re.test(word));
    if (!matchedWord) return null;

    let verseNum = matchedWord.split(this.surahService.diacritics.AYAH_MARK)[1];
    verseNum = this.getEnNumber(verseNum);
    return verseNum;
  }

  /**
   * Get the ayah number for a line using qurancom metadata.
   * Looks at the current line and subsequent lines for the nearest ayah end.
   */
  private getNextAyahNumberFromMetadata(lineNumber: number): string | null {
    const pageIdx = this.currentPage; // 1-indexed in this.pages
    const ayahsOnPage = this.quranDataService.getQuranComAyahsForPage(pageIdx);
    if (!ayahsOnPage || ayahsOnPage.length === 0) return null;

    // Find the nearest ayah end at or after this line
    let nearestAyah: { line: number; surah: number; ayah: number } | null = null;
    let minDist = Infinity;

    for (const a of ayahsOnPage) {
      const dist = a.line - lineNumber;
      if (dist >= 0 && dist < minDist) {
        minDist = dist;
        nearestAyah = a;
      }
    }

    // If no ayah found after this line on current page, try to get the first one on current page
    if (!nearestAyah && ayahsOnPage.length > 0) {
      // Fallback: use the last ayah on the page (the line might be after all ayah ends)
      nearestAyah = ayahsOnPage[ayahsOnPage.length - 1];
    }

    return nearestAyah ? nearestAyah.ayah.toString() : null;
  }

  /**
   * Get surah number from metadata for qurancom.
   */
  private getSurahNumberFromMetadata(lineNumber: number): number | null {
    const pageIdx = this.currentPage;
    const ayahsOnPage = this.quranDataService.getQuranComAyahsForPage(pageIdx);
    if (!ayahsOnPage || ayahsOnPage.length === 0) return null;

    // Find nearest ayah end at or after this line
    let nearestAyah: { line: number; surah: number; ayah: number } | null = null;
    let minDist = Infinity;

    for (const a of ayahsOnPage) {
      const dist = a.line - lineNumber;
      if (dist >= 0 && dist < minDist) {
        minDist = dist;
        nearestAyah = a;
      }
    }

    if (!nearestAyah && ayahsOnPage.length > 0) {
      nearestAyah = ayahsOnPage[ayahsOnPage.length - 1];
    }

    return nearestAyah ? nearestAyah.surah : null;
  }
  getCorrectedSurahNumberWithRespectTo(lineNo) {
    // For qurancom: use metadata for surah number
    const source = this.quranDataService.getCurrentSourceValue();
    if (source.type === 'qurancom') {
      const fromMeta = this.getSurahNumberFromMetadata(lineNo);
      if (fromMeta) return fromMeta;
    }

    let lineNumbers = this.lines
      .map((l, i) => {
        if (l.includes(this.surahService.diacritics.BISM) && lineNo != i - 1)
          return i;
      })
      .filter(Boolean);
    const correctedSurahNum =
      (this.isCompleteMushaf
        ? this.surahCalculated
        : this.surahCalculatedForJuz) -
      lineNumbers.filter((l) => l > lineNo).length;
    return correctedSurahNum;
  }

  async presentAlert(msg, header?, subheader?) {
    const alertmsg = await this.alertController.create({
      header: header,
      subHeader: subheader,
      message: msg,
      cssClass: "trans",
      buttons: [
        {
          text: "Copy",
          handler: () => {
            this.copyAnything(
              this.convertToPlain(`<div>${msg.replaceAll("<br>", "\n")}</div>`)
            );
            this.surahService.presentToastWithOptions(
              "Copied successfully!",
              "success-light",
              "bottom"
            );
          },
        },
        {
          text: "Next",
          handler: () => {
            const [surah, ayah] = header?.split(":");
            this.readTrans(`${surah}:${parseInt(ayah) + 1}`);
          },
        },
        {
          text: "Previous",
          handler: () => {
            const [surah, ayah] = header?.split(":");
            this.readTrans(`${surah}:${parseInt(ayah) - 1}`);
          },
        },
        {
          text: "OK",
          role: "cancel",
        },
      ],
    });
    alertmsg.present();
  }
  fillerLineFix() {
    let div: HTMLElement = document.querySelector(".filler-lines");
    div.style.height = document.getElementById("line_0").clientHeight + "px";
  }

  changeFontSize(val, inputValue: boolean = false) {
    var el: HTMLElement = document.querySelector(".content-wrapper");
    const stored = el?.style?.getPropertyValue("--reader-font-size");
    var currentSize = parseFloat(stored || this.pageFontSize);
    // Reset all line fontsizes - remove all inline styles for font-size
    document.querySelectorAll(".line").forEach((e: any) => {
      if (e.style.removeProperty) {
        e.style.removeProperty("font-size");
      } else {
        e.style.removeAttribute("font-size");
      }
    });
    const nextSize = inputValue ? parseFloat(val) : currentSize + val;
    if (!isNaN(nextSize)) {
      el.style.setProperty("--reader-font-size", `${nextSize}px`);
      this.pageFontSize = `${nextSize}px`;
      this.applyTatweelToLines();
    }
  }

  // Reader Themes
  readerThemes = [
    { id: 'golden',   name: 'Golden',     bg: '#FDF5E6', text: '#2C1810', accent: '#C9A227', border: '#D4B896' },
    { id: 'paper',    name: 'Paper',      bg: '#FFF9F0', text: '#1A1A1A', accent: '#8B7355', border: '#E8DCC8' },
    { id: 'ivory',    name: 'Ivory',      bg: '#FFFFF0', text: '#1C1C1C', accent: '#A0855B', border: '#E0D8C0' },
    { id: 'sage',     name: 'Sage',       bg: '#F0F4E8', text: '#1B3A1B', accent: '#4A7C4A', border: '#B8C8A0' },
    { id: 'ocean',    name: 'Ocean',      bg: '#EDF4F8', text: '#0D2137', accent: '#1565C0', border: '#B0C8D8' },
    { id: 'lavender', name: 'Lavender',   bg: '#F3EFF8', text: '#2A1B3D', accent: '#7B1FA2', border: '#C8B8D8' },
    { id: 'rose',     name: 'Rose',       bg: '#FFF0F3', text: '#3D1020', accent: '#C62828', border: '#E8C0C8' },
    { id: 'midnight', name: 'Midnight',   bg: '#0D1117', text: '#E0E0E0', accent: '#58A6FF', border: '#30363D' },
    { id: 'charcoal', name: 'Charcoal',   bg: '#1E1E1E', text: '#D4D4D4', accent: '#4CAF50', border: '#333333' },
    { id: 'sepia',    name: 'Sepia',      bg: '#F4ECD8', text: '#5B4636', accent: '#8B6914', border: '#D2C4A4' },
  ];
  activeTheme = 'golden';

  applyTheme(theme: any) {
    this.activeTheme = theme.id;
    const el: HTMLElement = document.querySelector('.content-wrapper');
    if (!el) return;
    el.style.background = theme.bg;
    el.style.color = theme.text;
    el.style.setProperty('--mushaf-gold-dark', theme.accent);
    el.style.setProperty('--mushaf-gold', theme.accent);
    el.style.setProperty('--mushaf-border-outer', theme.border);
    el.style.setProperty('--mushaf-border-inner', theme.accent);
    el.style.setProperty('--mushaf-corner', theme.accent);
    // Save preference
    this.storage.set('readerTheme', theme.id);
  }

  async loadSavedTheme() {
    const saved = await this.storage.get('readerTheme');
    if (saved) {
      const theme = this.readerThemes.find(t => t.id === saved);
      if (theme) this.applyTheme(theme);
    }
  }

  changeColors(val, field = "bg") {
    var el: HTMLElement = document.querySelector(".content-wrapper");
    if (field === "bg") el.style.background = val;
    if (field === "color") el.style.color = val;
  }
  gotoJuzSurah(val, field = "juz") {
    if (!val || val == "" || val < 1 || typeof parseInt(val) != "number")
      return;
    switch (field) {
      case "juz":
        if (parseFloat(val) !== parseInt(val) && val.toString().includes(".")) {
          let [v1, v2] = val.toString().split(".");
          v1 = parseInt(v1);
          v2 = parseInt(v2);
          if (v1 > 30) this.gotoPageNum(this.pages.length);
          if (v2 > this.rukuArray[v1 - 1].length)
            this.gotoPageNum(this.surahService.juzPageNumbers[v1] - 1);
          else
            this.gotoPageNum(
              this.surahService.juzPageNumbers[v1 - 1] +
                this.rukuArray[v1 - 1][v2 - 1].juzPageIndex
            );
        } else {
          this.gotoPageNum(this.surahService.juzPageNumbers[parseInt(val) - 1]);
          if (val > 30) this.gotoPageNum(this.pages.length);
        }
        break;
      case "surah":
        this.gotoPageNum(this.surahService.surahPageNumbers[parseInt(val) - 1]);
        if (val > 114) this.gotoPageNum(this.pages.length);
        break;

      default:
        this.gotoPageNum(this.surahService.juzPageNumbers[parseInt(val) - 1]);
        break;
    }
  }
  translationMode(doToggle: boolean) {
    if (doToggle) this.tMode = !this.tMode;
    if (this.tMode === true) {
      this.lines = this.translationLines;
      document.querySelector(".content-wrapper").classList.add("ur");
    } else {
      this.lines = this.arabicLines;
      document.querySelector(".content-wrapper").classList.remove("ur");
    }
  }

  showSurahInfo() {
    this.surahService
      .getSurahInfo()
      .pipe(take(1))
      .subscribe((res: any) => {
      this.surahInfo = res;
      this.surahService.surahInfo = [...res];
      this.currentSurahInfo = this.surahService.surahInfo.find((s) => {
        return parseInt(s.index) == parseInt(this.surah.number);
      });
      console.log(this.currentSurahInfo);
      this.presentSurahInfo(this.currentSurahInfo);
    });
  }
  async showPageInfo() {
    const page = this.pages[this.currentPage - 1];
    const words = [...this.lines]
      .filter(
        (a, i, r) =>
          !(
            a.includes(this.surahService.diacritics.BISM) ||
            r[i + 1]?.includes(this.surahService.diacritics.BISM)
          )
      )
      .join("\n")
      .split(" ");
    const alert = await alertController.create({
      header: `On this page (#${this.currentPage})`,
      subHeader: `Detailed analysis...`,
      message: `Words: ${words.length} <br />
      Unique Words: ${new Set(words).size} <br />
      Unique Words w/o Diacritics: ${
        new Set(this.surahService.tashkeelRemover(words.join(" ")).split(" "))
          .size
      } <br />
      Ayahs: ${
        // Count real ayah marks only (exclude ۝۰ continuation markers)
        (page.match(new RegExp(this.surahService.diacritics.AYAH_MARK + '[\\u06F1-\\u06F9\\u0661-\\u0669]', 'g')) || []).length
      } <br />
      Surah Beginnings: ${
        page.split(this.surahService.diacritics.BISM).length - 1
      } <br />
      Ruku Ends: ${
        page.split(this.surahService.diacritics.RUKU_MARK).length - 1
      } <br />
      Lines: ${this.lines.length} <br />
      Mushaf Page No.: ${this.currentPageCalculated}`,
    });
    alert.present();
  }

  async presentSurahInfo(s) {
    const alert = await alertController.create({
      header: `${s.index}. ${s.title}`,
      subHeader: `${s.type}`,
      message: `Surah ${s.title} (${s.titleAr}) has ${
        s.count
      } Ayahs, was revealed in ${s.place} and is spanned over ${
        s.juz?.length
      } juz, i.e. ${s.juz[0].index}${
        s.juz.length > 1
          ? "-" +
            s.juz[s.juz.length - 1].index +
            ".<br><br>" +
            this.getJuzDistribution(s.juz)
          : ""
      }.`,
      buttons: [
        {
          role: "cancel",
          text: "Ok",
        },
      ],
    });
    alert.present();
  }

  getJuzDistribution(juz): string {
    let d = "";
    for (let j of juz) {
      d += `Verses ${j.verse.start}-${j.verse.end} in juz ${j.index}.<br>`;
    }
    return d;
  }

  toggleHifzMode() {
    this.hMode = !this.hMode;
    let el: HTMLElement = document.querySelector(".content-wrapper");
    el.style.color = this.hMode ? "white" : "black";
  }

  toggleIconOutline(iconName: string) {
    if (iconName.endsWith("-outline")) return iconName.replace("-outline", "");
    else return (iconName += "-outline");
  }
  addSpan(line: string): string {
    // if (this.ayah_marks.some((mark) => line.includes(mark))) {
    //   this.ayah_marks.forEach((mark, i) => {
    //     if (line.includes(mark)) {
    //       const re = new RegExp(mark, "g");
    //       line = line.replace(
    //         re,
    //         `<span class='ayah_mark ayah_mark${i + 1}'>${mark}</span>`
    //       );
    //     }
    //   });
    // }
    line = line.replace("بْ", "<span style='color:#ff2d5b'>بْ</span>");

    return line;
  }
  /**
   * Check if a line has any margin indicators (ruku, sajdah, waqf).
   * Used by the template guard to decide whether to render the ruku-wrapper div.
   * For qurancom: also checks metadata for ruku positions.
   */
  hasIndicator(line: string, lineIndex: number): boolean {
    // Archive text checks
    if (line.includes(this.surahService.diacritics.RUKU_MARK)) return true;
    if (line.includes(this.surahService.diacritics.SAJDAH_MARK)) return true;
    if (line.includes('\u06D8')) return true;
    // Qurancom metadata check for ruku
    if (this._quranComRukuLineSet) {
      const pageNum = this.currentPageCalculated || this.currentPage;
      if (this._quranComRukuLineSet.has(`${pageNum}:${lineIndex}`)) return true;
    }
    return false;
  }

  addIndicators(line: string, i: number): string {
    const indicators: string[] = [];

    // ── 1) RUKU indicator ──
    // For qurancom: ۧ is NOT in the text, check metadata set instead.
    // For archive: ۧ IS in the text, check with includes().
    const pageNum = this.currentPageCalculated || this.currentPage;
    const hasRuku = this._quranComRukuLineSet
      ? this._quranComRukuLineSet.has(`${pageNum}:${i}`)
      : line.includes(this.surahService.diacritics.RUKU_MARK);
    if (hasRuku) {
      let rukuIndex = -1;
      let matchedJuzArr: any[] | null = null;

      // 1a) Try the expected juz array first
      const juzIdx = (this.juzCalculated || 1) - 1;
      const juzrukuarr = this.rukuArray[juzIdx];
      juzrukuarr?.forEach((el, index) => {
        if (el.pageNumber === pageNum && el.lineIndex === i) {
          rukuIndex = index;
          matchedJuzArr = juzrukuarr;
        }
      });

      // 1b) Fallback: search ALL ruku arrays
      if (rukuIndex === -1) {
        for (let j = 0; j < this.rukuArray.length; j++) {
          const arr = this.rukuArray[j];
          if (!arr) continue;
          for (let idx = 0; idx < arr.length; idx++) {
            if (arr[idx].pageNumber === pageNum && arr[idx].lineIndex === i) {
              rukuIndex = idx;
              matchedJuzArr = arr;
              break;
            }
          }
          if (rukuIndex !== -1) break;
        }
      }

      // 1c) Final fallback: try currentPage
      if (rukuIndex === -1 && this.currentPage !== pageNum) {
        for (let j = 0; j < this.rukuArray.length; j++) {
          const arr = this.rukuArray[j];
          if (!arr) continue;
          for (let idx = 0; idx < arr.length; idx++) {
            if (arr[idx].pageNumber === this.currentPage && arr[idx].lineIndex === i) {
              rukuIndex = idx;
              matchedJuzArr = arr;
              break;
            }
          }
          if (rukuIndex !== -1) break;
        }
      }

      const rukuNumber = rukuIndex + 1;
      const ayahCount = rukuIndex >= 0 ? this.getAyahCountForRuku(rukuIndex, matchedJuzArr) : 0;
      const ayahCountAr = ayahCount > 0 ? this.surahService.e2a(ayahCount.toString()) : '';
      const rukuNumberAr = rukuNumber > 0 ? this.surahService.e2a(rukuNumber.toString()) : '';

      indicators.push(
        `<div class="ruku-ain-group">` +
        `<span class="ruku-ain">ع</span>` +
        (ayahCountAr ? `<span class="ruku-ayah-count">${ayahCountAr}</span>` : '') +
        `</div>` +
        (rukuNumberAr ? `<div class="ruku-number">${rukuNumberAr}</div>` : '')
      );
    }

    // ── 2) SAJDAH indicator (U+06DE ۞) ──
    if (line.includes(this.surahService.diacritics.SAJDAH_MARK)) {
      indicators.push(`<div class="margin-indicator sajdah-indicator"><span>سجدة</span></div>`);
    }

    // ── 3) WAQF-LAZIM indicator (U+06D8 ۘ) ──
    // Waqf Lazim = obligatory stop — show "م" (meem) rotated in margin
    if (line.includes('\u06D8')) {
      indicators.push(`<div class="margin-indicator waqf-lazim-indicator"><span>م</span></div>`);
    }

    return indicators.join('');
  }

  /**
   * Count ayah marks (۝) between this ruku and the previous one.
   * This gives the number of ayahs in this ruku section.
   * @param rukuIndex - index within the juz ruku array
   * @param juzArr - optional: the specific ruku array to use (avoids juz lookup mismatch)
   */
  private getAyahCountForRuku(rukuIndex: number, juzArr?: any[]): number {
    if (!this.pages || rukuIndex < 0) return 0;
    const juzrukuarr = juzArr || this.rukuArray[(this.juzCalculated || 1) - 1];
    if (!juzrukuarr || !juzrukuarr[rukuIndex]) return 0;

    const currentRuku = juzrukuarr[rukuIndex];
    const prevRuku = rukuIndex > 0 ? juzrukuarr[rukuIndex - 1] : null;

    // ── Qurancom: use metadata to count ayahs ──
    const source = this.quranDataService.getCurrentSourceValue();
    if (source.type === 'qurancom') {
      const startPage = prevRuku ? prevRuku.pageNumber : Math.max(1, currentRuku.pageNumber - 1);
      const startLine = prevRuku ? prevRuku.lineIndex + 1 : 0;
      const endPage = currentRuku.pageNumber;
      const endLine = currentRuku.lineIndex;
      return this.quranDataService.countQuranComAyahsBetween(startPage, startLine, endPage, endLine);
    }

    // ── Archive: scan text for ۝ + digits ──
    const AYAH_MARK = this.surahService.diacritics.AYAH_MARK;

    let ayahCount = 0;
    const startPage = prevRuku ? (prevRuku.pageNumber - 1) : Math.max(0, currentRuku.pageNumber - 2);
    const endPage = currentRuku.pageNumber - 1;

    for (let p = startPage; p <= endPage && p < this.pages.length; p++) {
      const pageLines = this.pages[p]?.split('\n') || [];
      for (let l = 0; l < pageLines.length; l++) {
        if (prevRuku && p === (prevRuku.pageNumber - 1) && l <= prevRuku.lineIndex) continue;
        if (p === endPage && l > currentRuku.lineIndex) break;

        const matches = pageLines[l].match(new RegExp(AYAH_MARK + '[\\u06F1-\\u06F9\\u0661-\\u0669]', 'g'));
        if (matches) ayahCount += matches.length;
      }
    }

    return ayahCount;
  }
  toggleMuhammadiFont() {
    document.querySelector(".page-wrapper").classList.toggle("ar2");
  }
  getFirstAndLastAyahNumberOnPage(): FirstLastAyah {
    // Skip the title page (page 1 of a complete mushaf has no ayahs)
    if (this.isCompleteMushaf && this.currentPage === 1)
      return null;

    if (!this.lines || this.lines.length === 0) return;

    // ── Qurancom: use metadata (word.text has no ۝+digits) ──
    const qcAyahs = this.quranDataService.getQuranComAyahsForPage(this.currentPage);
    if (qcAyahs && qcAyahs.length > 0) {
      const first = qcAyahs[0];
      const last = qcAyahs[qcAyahs.length - 1];
      const firstLastAyah = {
        first: {
          firstSurahNum: first.surah,
          firstVerseNum: first.ayah,
          verseId: `${first.surah}:${first.ayah}`,
        },
        last: {
          lastSurahNum: last.surah,
          lastVerseNum: last.ayah,
          verseId: `${last.surah}:${last.ayah}`,
        },
      };
      return firstLastAyah;
    }

    // ── Archive: scan text for ۝ + digits ──
    const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹١-٩]`);

    // --- First ayah: scan lines with a BOUNDED loop ---
    let lineCounter = 0;
    let txt = "";
    let foundFirst = false;
    while (lineCounter < this.lines.length) {
      txt = this.lines[lineCounter];
      lineCounter++;
      if (txt && re.test(txt)) {
        foundFirst = true;
        break;
      }
    }

    if (!foundFirst) {
      return null;
    }

    const firstWord = txt
      .split(" ")
      .find((word) => re.test(word));
    if (!firstWord) return null;

    const firstAyahPart = firstWord.split(this.surahService.diacritics.AYAH_MARK)[1];
    let firstVerseNum = parseInt(this.getEnNumber(firstAyahPart));
    if (isNaN(firstVerseNum)) return null;

    // --- Last ayah ---
    const lastLine = this.lines[this.lines.length - 1];
    if (!lastLine) return null;
    let lastLineWordsArr = lastLine.trim().split(" ");
    const lastWordPart = lastLineWordsArr[lastLineWordsArr.length - 1]?.split(
      this.surahService.diacritics.AYAH_MARK
    )[1];
    let lastVerseNum = parseInt(this.getEnNumber(lastWordPart));
    if (isNaN(lastVerseNum)) lastVerseNum = firstVerseNum; // fallback

    let firstSurahNum = this.getCorrectedSurahNumberWithRespectTo(0);
    let lastSurahNum = this.getCorrectedSurahNumberWithRespectTo(
      this.lines?.length - 1
    );
    const firstLastAyah = {
      first: {
        firstSurahNum,
        firstVerseNum,
        verseId: `${firstSurahNum}:${firstVerseNum}`,
      },
      last: {
        lastSurahNum,
        lastVerseNum,
        verseId: `${lastSurahNum}:${lastVerseNum}`,
      },
    };
    return firstLastAyah;
  }
  getEnNumber(num: string) {
    return this.surahService
      .a2e(this.surahService.p2e(num))
      ?.replace(/[^0-9]/g, "");
  }

  toggleIgnoreTashkeel(val) {
    this.ignoreTashkeel = !this.ignoreTashkeel;
    this.onSearchChange(val);
  }

  // returns a [pageIndex,lineIndex] on a search
  onSearchChange(val) {
    this.queryString = val;
    let searchText = val;
    if (!searchText || searchText == "") return;
    var start = new Date().getTime();
    searchText = this.surahService.removeTatweel(
      this.surahService.getArabicScript(searchText)
    );
    let arr: SearchResultsList[] = [];
    let cumulativeTotal = 0;
    let result = [];
    this.pages.forEach((v, pageIndex) => {
      v = this.surahService.removeTatweel(this.surahService.getArabicScript(v));
      if (this.ignoreTashkeel) {
        v = this.surahService.tashkeelRemover(
          this.surahService.getArabicScript(v)
        );
        searchText = this.surahService.tashkeelRemover(searchText);
      }
      if (v.includes(searchText)) {
        result = v.split("\n").filter((l, lineIndex) => {
          if (l.includes(searchText)) {
            const charIndices = l
              .split(searchText)
              .map(
                function (culm) {
                  return (this.pos += culm.length + searchText.length);
                },
                { pos: -searchText.length }
              )
              .slice(0, -1);
            cumulativeTotal += charIndices.length;
            arr.push({
              lineText: l,
              searchText,
              pageIndex,
              lineIndex,
              charIndices,
            });
          }
          return l.includes(searchText);
        });
        // let lineIndex = v.split("\n").findIndex((l) => l.includes(searchText));
      }
    });
    const searchTimeSecs = (new Date().getTime() - start) / 1000;
    console.log(result, arr);
    this.searchResults = {
      results: arr,
      total: cumulativeTotal,
      searchTimeSecs,
    };
    arr.forEach((indices) => {
      let output = this.getLineTextFromIndices(
        indices.pageIndex,
        indices.lineIndex
      );
    });
  }
  getLineTextFromIndices(pageIndex, lineIndex) {
    return this.pages[pageIndex].split("\n")[lineIndex];
  }
  gotoPageNum(p) {
    if (!p || p > this.pages?.length || p < 1) return;
    this.currentPage = parseInt(p);
    this.lines = this.pages[this.currentPage - 1].split("\n");

    this.setBookmark();
    this.updateCalculatedNumbers();
    this.getFirstAndLastAyahNumberOnPage();
    if (this.inlineTransMode) this.loadInlineTranslations();
    if (this.wbwMode) this.loadWbwTranslations();
    if (this.tajweedMode) this.loadTajweedText();
    setTimeout(() => {
      this.adjustFontsize();
    }, 1000);
  }
  gotoPageAndHighlightLine(r: SearchResultsList) {
    console.log(r.pageIndex, r.lineIndex);
    this.gotoPageNum(+r.pageIndex + 1);
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.changeDetectorRef.detectChanges();
    setTimeout(() => {
      let el = document.querySelector(
        `#line_${r.lineIndex} span`
      ) as HTMLElement;
      el.style.color = "#2a86ff";

      /*
       * Logic - Hightlight multiple matches in same line
       * Working, but match is on text without tashkeel, hence can't "show it properly
       */

      /* const lineText = r.lineText; //el.innerText;
      let highlightedText = "";
      let currentIndex = 0;

      for (let i = 0; i < r.charIndices.length; i++) {
        const charIndex = r.charIndices[i];
        const match = lineText.substring(
          charIndex,
          charIndex + r.searchText.length
        );

        highlightedText += lineText.substring(currentIndex, charIndex);
        highlightedText += `<span style="background-color: yellow">${match}</span>`;
        currentIndex = charIndex + r.searchText.length;
      }

      highlightedText += lineText.substring(currentIndex);
      el.innerHTML = highlightedText; */

      el.classList.add("highlight-line");
      setTimeout(() => {
        el.classList.remove("highlight-line");
      }, 1000);
    }, 100);
  }
  updateCalculatedNumbers() {
    this.juzCalculated = this.surahService.juzCalculated(this.currentPage);
    this.surahCalculated = this.surahService.surahCalculated(this.currentPage);
    if (!this.isCompleteMushaf) {
      if (this.juzsurahmode)
        this.currentPageCalculated =
          this.currentPage +
          this.surahService.surahPageNumbers[parseInt(this.title) - 1] -
          1;
      else
        this.currentPageCalculated =
          this.currentPage +
          this.surahService.juzPageNumbers[parseInt(this.title) - 1] -
          1;
      this.surahCalculatedForJuz = this.surahService.surahCalculated(
        this.currentPageCalculated
      );
      this.juzCalculated = this.surahService.juzCalculated(
        this.currentPageCalculated
      );
      this.surahCalculated = this.surahService.surahCalculated(
        this.currentPageCalculated
      );
    } else if (this.isCompleteMushaf)
      this.currentPageCalculated = this.currentPage;
    console.log(
      "JUZ-SURAH CALCULATED",
      this.juzCalculated,
      this.surahCalculated
    );
  }
  vsChange(ev) {
    this.startIndex = ev.startIndex;
  }
  readTafseerOf(ev) {
    // const [s, a] = ev.target.value.split(":");
    // console.log(s, a);
    // this.readTafseer(s, a);
    this.readTrans(ev.target.value);
  }
  readTafseer(s, a, m = "/en.itani") {
    var url = `http://api.alquran.cloud/v1/ayah/${s}:${a}`;
    //`https://api.quran.com/api/v4/quran/tafsirs/169?page_number=${s}`;
    //`https://api.quran.com/api/v4/quran/tafsirs/159?chapter_number=${s}&verse_key=${a}`;
    //`https://tafsir.app/get.php?src=${m}&s=${s}&a=${a}`

    this.httpClient.get(url).subscribe((resAr: any) => {
      this.httpClient.get(url + m).subscribe((resTrans: any) => {
        this.presentAlert(
          `${s}:${a}`,
          resTrans.data.edition.name,
          `${resAr.data.text} \n\n${resTrans.data.text}`
        );
      });
    });
  }
  readTrans(verseKey, lang = "en") {
    // Guard: don't fire the request if the key is missing, null-ish, or
    // contains "null"/"undefined" (e.g. "2:null" from a failed ayah lookup)
    if (
      !verseKey ||
      verseKey === 'null' ||
      verseKey === 'undefined' ||
      verseKey.includes('null') ||
      verseKey.includes('undefined') ||
      !/^\d+:\d+$/.test(verseKey)
    ) {
      console.warn('readTrans: invalid verseKey', verseKey);
      this.surahService.presentToastWithOptions(
        'Could not determine the ayah for this line.',
        'warning',
        'bottom'
      );
      return;
    }
    // Simply open the enhanced tafseer modal — it handles its own API calls
    this.presentModal(verseKey);
  }
  async presentModal(verseKey) {
    const modal = await this.modalController.create({
      component: TafseerModalComponent,
      componentProps: {
        verseKey,
      },
    });
    modal.present();
  }
  copyAnything = (text: string) => window.navigator.clipboard.writeText(text);
  convertToPlain(html) {
    let divEl = document.createElement("div");
    divEl.innerHTML = html;
    return divEl.textContent || divEl.innerText || "";
  }
  copyResults(copyResultEl) {
    let result = `Found ${this.searchResults.results.length} (${this.searchResults.total}) Results in ${this.searchResults.searchTimeSecs} sec:\n\n`;
    this.searchResults.results.forEach((r) => {
      let juzNum: number;
      if (this.isCompleteMushaf)
        juzNum = this.surahService.juzCalculated(r.pageIndex);
      else if (this.juzmode)
        juzNum = this.surahService.juzCalculated(
          r.pageIndex +
            this.surahService.juzPageNumbers[parseInt(this.title) - 1]
        );
      else if (this.juzsurahmode)
        juzNum = this.surahService.juzCalculated(
          r.pageIndex +
            this.surahService.surahPageNumbers[parseInt(this.title) - 1]
        );
      result += `${this.getLineTextFromIndices(
        r.pageIndex,
        r.lineIndex
      )}\nPage ${r.pageIndex + 1} Line ${r.lineIndex + 1} | Juz ${juzNum}\n\n`;
    });
    this.copyAnything(result);
    this.copyResultsBG = "primary";
    setTimeout(() => {
      this.copyResultsBG = "dark";
    }, 1000);
    // this.presentAlert("Copied"+ this.searchResults.length+ "results successfully!");
  }
  playAudio(lang = "en") {
    const ayahList = this.getAyahsListOnPage();
    if (!ayahList || !ayahList.verseIdList?.length) {
      this.surahService.presentToastWithOptions(
        'Could not determine ayahs on this page for audio playback.',
        'warning',
        'middle'
      );
      return;
    }
    const [verseIdList, verseIdListForAudio] = [
      ayahList.verseIdList,
      ayahList.verseIdListForAudio,
    ];

    // Audio already playing
    if (this.audioPlaying) {
      console.log("Audio already playing");
      this.audio.pause();
      this.audioPlaying = false;
      return;
    }
    console.log(this.audio?.src);
    let key = "";
    if (this.selectionMap.somethingSelected) {
      console.log(
        "Something selected, we should play selected verse: ",
        this.selectionMap.selectedElementId
      );
      const n = parseInt(this.selectionMap.selectedElementId.split("_")[1]);
      const surahNum = this.getCorrectedSurahNumberWithRespectTo(n);
      const ayahNum = this.getNextAyahNumberFromCurrentLine(n);
      if (surahNum && ayahNum) {
        key = `${surahNum}:${ayahNum}`;
      } else {
        key = verseIdList[0]; // fallback to first verse on page
      }
    } else {
      key = verseIdList[0];
    }
    // Audio not playing and not paused
    if (!this.audio) {
      console.log("// Audio not playing and not paused");
      let url = `https://api.quran.com/api/v4/verses/by_key/${key}?language=${lang}&audio=${this.qariId}`;
      this.httpClient.get(url).subscribe((res: any) => {
        console.log(res);
        this.audioSrc = "https://verses.quran.com/" + res.verse.audio?.url;
        if (!res.verse.audio) {
          this.surahService.presentToastWithOptions(
            `The selected Qari might not have the audio for the verse ${key}. Try another Qaris from the list.`,
            "warning",
            "middle"
          );
          return;
        }
        // https://verses.quran.com/Shatri/mp3/059010.mp3 or https://audio.qurancdn.com/AbdulBaset/Murattal/mp3/001005.mp3
        this.audio = new Audio(this.audioSrc);
        this.audioPlayRoutine(verseIdListForAudio, verseIdList, key);
      });
    }

    // Audio not playing but paused
    else if (this.audio.paused) {
      console.log("Audio not playing but paused");

      this.audioPlayRoutine(verseIdListForAudio, verseIdList, key);
    }
  }
  audioPlayRoutine(verseIdListForAudio, verseIdList, key) {
    console.log(verseIdListForAudio);
    this.setAudioSpeed(this.audioSpeed);
    this.audioPlaying = true;
    this.audio.play();
    // this.audioPlayIndex = verseIdList.indexOf(parseInt(key.split(":")));
    this.playingVerseNum = verseIdList[this.audioPlayIndex - 1];

    let pageFlipping = true;
    this.audio.onended = (ev) => {
      console.log("PLAY ENDED event");
      //firstAndLast.first.firstSurahNum == firstAndLast.last.lastSurahNum
      // Finished playing last ayah on page
      if (this.audioPlayIndex == verseIdListForAudio.length) {
        if (pageFlipping) {
          console.log("IF part pageflip");
          this.audio.src = "assets/page-flip.mp3";
          this.audio.play();
          pageFlipping = false;
        } else {
          console.log("ELSE part pageflip");
          this.stopAudio();
          this.gotoPageNum(this.currentPage + 1);
          this.playAudio();
        }
      }
      if (this.audioPlayIndex < verseIdListForAudio.length) {
        const re = "mp3/" + verseIdListForAudio[this.audioPlayIndex] + ".mp3";
        this.audio.src = this.audioSrc.replace(/mp3\/(.*?)\.mp3/, re);
        this.setAudioSpeed(this.audioSpeed);
        this.audio.play();
        this.playingVerseNum = verseIdList[this.audioPlayIndex];
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `Quran ${this.playingVerseNum} | Page ${
              this.isCompleteMushaf
                ? this.currentPage
                : this.currentPageCalculated
            }`,
            artist: `Surah ${
              this.surahService.surahNames[
                parseInt(this.playingVerseNum.split(":")[0]) - 1
              ]
            }`,
            album: `Juz ${this.juzCalculated} ${
              this.surahService.juzNames[this.juzCalculated - 1]
            }`,
          });
        }
        console.log(this.audio.src);
        this.audioPlayIndex++;
      }
    };
  }
  stopAudio(persistIndex?: boolean) {
    // this.audio.src = "";
    this.audio.pause();
    this.audio = undefined;
    this.audioPlaying = false;
    if (!persistIndex) this.audioPlayIndex = 1;
  }
  setAudioSpeed(s) {
    if (this.audio) this.audio.playbackRate = s;
  }
  getAyahsListOnPage(): {
    verseIdList: Array<string>;
    verseIdListForAudio: Array<string>;
  } | null {
    const firstAndLast = this.getFirstAndLastAyahNumberOnPage();
    if (!firstAndLast || !firstAndLast.first || !firstAndLast.last) {
      return { verseIdList: [], verseIdListForAudio: [] };
    }
    let verseIdList = [];
    let verseIdListForAudio = [];
    const firstSurahInfo = this.surahInfo?.find((s) => {
      return parseInt(s.index) == firstAndLast.first.firstSurahNum;
    });
    const lastSurahInfo = this.surahInfo?.find((s) => {
      return parseInt(s.index) == firstAndLast.last.lastSurahNum;
    });
    if (!firstSurahInfo) {
      return { verseIdList: [], verseIdListForAudio: [] };
    }
    console.log(firstSurahInfo, lastSurahInfo);

    let counter = 0;
    for (
      let i = firstAndLast.first.firstSurahNum;
      i <= firstAndLast.last.lastSurahNum;
      i++
    ) {
      let countTill = firstSurahInfo.count + counter;
      console.log({ countTill, fCounter: firstSurahInfo.count, counter });
      if (firstAndLast.first.firstSurahNum == firstAndLast.last.lastSurahNum) {
        countTill = firstAndLast.last.lastVerseNum;
      }
      if (i > firstAndLast.first.firstSurahNum) {
        if (i == firstAndLast.last.lastSurahNum)
          countTill = firstAndLast.last.lastVerseNum;
        else
          countTill = this.surahInfo.find((s) => {
            return (
              parseInt(s.index) == firstAndLast.first.firstSurahNum + counter
            );
          }).count;

        // Add Bism line before each 'next surah'
        verseIdList.push(`${1}:${1}`);
        verseIdListForAudio.push(`${this.padStart(1) + this.padStart(1)}`);
      }
      for (
        let j =
          i > firstAndLast.first.firstSurahNum
            ? 1
            : firstAndLast.first.firstVerseNum;
        j <= countTill;
        j++
      ) {
        verseIdList.push(`${i}:${j}`);
        verseIdListForAudio.push(`${this.padStart(i) + this.padStart(j)}`);
      }
      counter++;
    }
    console.log(verseIdList);
    return { verseIdList, verseIdListForAudio };
  }
  padStart(val, num = 3) {
    return val.toString().padStart(3, "0");
  }
  fetchQariList() {
    this.surahService
      .fetchQariList()
      .pipe(take(1))
      .subscribe((res: any) => {
      console.log(res);
      this.reciters = res.reciters?.sort((a, b) => a.id - b.id);
      this.qariId = this.qariId ?? 7;
      this.selectedQari = this.reciters.find((r) => r.id == this.qariId);
      console.log(this.selectedQari);
    });
  }
  qariChanged(r) {
    console.log(r);
    this.selectedQari = r;
    this.qariId = parseInt(r);
  }
  getJuzNumber() {
    if (!this.isDataLoaded) return '';
    
    let result = "";
    try {
      // Complete Mushaf mode
      if (this.isCompleteMushaf) {
        if (this.surahCalculated === 1) result = "سورۃ";
        else if (this.juzCalculated && this.juzCalculated > 0) {
          const juzIndex = this.juzCalculated - 1;
          if (juzIndex >= 0 && juzIndex < this.surahService.juzNames?.length) {
            result =
              this.surahService.juzNames[juzIndex] +
              " " +
              this.surahService.e2a(this.juzCalculated.toString());
          }
        }
      } else if (this.surahCalculatedForJuz === 1) result = "سورۃ";
      // Surah mode
      else if (this.juzsurahmode && this.juzCalculated && this.juzCalculated > 0) {
        const juzIndex = this.juzCalculated - 1;
        if (juzIndex >= 0 && juzIndex < this.surahService.juzNames?.length) {
          result =
            this.surahService.juzNames[juzIndex] +
            " " +
            this.surahService.e2a(this.juzCalculated.toString());
        }
      }
      // Juz mode
      else if (this.title) {
        const titleNum = +this.title;
        if (titleNum > 0 && titleNum <= this.surahService.juzNames?.length) {
          result =
            this.surahService.juzNames[titleNum - 1] +
            " " +
            this.surahService.e2a(this.title.toString());
        }
      }
    } catch (e) {
      console.warn('Error getting juz number:', e);
    }
    return result;
  }
  setupLinks() {
    this.httpClient
      .get("https://archive.org/metadata/15-lined-saudi")
      .subscribe((res: any) => {
        if (res.files.filter((f) => f.size == "43240062")[0]) {
          const fileNameIdentifier = res.files
            .filter((f) => f.size == "43240062")[0]
            ?.name?.replace(".pdf", "")
            .trim();
          this.identifier = res.metadata.identifier;
          this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${fileNameIdentifier}_jp2.zip&file=${fileNameIdentifier}_jp2/${fileNameIdentifier}_`;
        } else {
          this.httpClient
            .get("https://archive.org/metadata/QuranMajeed-15Lines-SaudiPrint")
            .subscribe((res: any) => {
              this.identifier = res.metadata.identifier;
              this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${this.identifier}_jp2.zip&file=${res.metadata.identifier}_jp2/${this.identifier}_`;
              const fullUrl = `${
                this.incompleteUrl
              }${this.surahService.getPaddedNumber(
                this.currentPageCalculated
              )}.jp2&id=${this.identifier}&scale=${ImageQuality.High}&rotate=0`;
              this.fullImageUrl = fullUrl;
            });
        }
      });
  }
  async loadImg(p: number, quality: ImageQuality = ImageQuality.High) {
    if (!this.incompleteUrl || !this.identifier) {
      this.surahService.presentToastWithOptions(
        'Scan images are loading, please try again in a moment.',
        'warning',
        'bottom'
      );
      this.scanView = false;
      return;
    }
    const fullUrl = `${this.incompleteUrl}${this.surahService.getPaddedNumber(
      p
    )}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    this.fullImageUrl = fullUrl;
    this.scanView = true;
  }

  textWidth(text, fontProp) {
    var tag = document.createElement("div");
    tag.style.position = "absolute";
    tag.style.left = "-99in";
    tag.style.whiteSpace = "nowrap";
    tag.style.font = fontProp;
    tag.innerHTML = text;

    document.body.appendChild(tag);
    var result = tag.clientWidth;
    document.body.removeChild(tag);
    return result;
  }

  adjustFontsize() {
    const wrapper = document.querySelector(".content-wrapper") as HTMLElement;
    if (!wrapper) return;

    // Mark preparing — hides text instantly (opacity: 0)
    wrapper.classList.remove("text-ready");
    wrapper.classList.add("text-preparing");

    const MIN_FONT_SIZE = 6; // Never go below 6px
    const MAX_ITERATIONS = 50; // Safety cap to prevent infinite loops

    document.querySelectorAll(".line").forEach((el: HTMLElement) => {
      let iterations = 0;
      let currentSize = parseFloat(window.getComputedStyle(el).fontSize);
      while (
        el.clientWidth > 0 &&
        currentSize > MIN_FONT_SIZE &&
        iterations < MAX_ITERATIONS &&
        el.clientWidth <
        this.textWidth(
          el.innerText,
          this.getFontProp(el)
        )
      ) {
        currentSize -= 1;
        el.style.fontSize = currentSize + "px";
        iterations++;
      }
    });

    requestAnimationFrame(() => {
      this.applyTatweelToLines();
      // Reveal with animation after tatweel is done
      wrapper.classList.remove("text-preparing");
      wrapper.classList.add("text-ready");
    });
  }

  private getFontProp(el: HTMLElement): string {
    const computed = window.getComputedStyle(el);
    return computed.font || `${computed.fontSize} ${computed.fontFamily}`;
  }

  toggleTatweel(enabled: boolean) {
    this.enableTatweel = enabled;
    this.applyTatweelToLines();
  }

  async addManualBookmark() {
    const page = this.currentPageCalculated || this.currentPage || 1;
    const alert = await this.alertController.create({
      header: "Add Bookmark",
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: "Bookmark name",
          value: `Page ${page}`,
        },
        {
          name: "folder",
          type: "text",
          placeholder: "Folder (optional)",
          value: "Default",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: async (data) => {
            const name = (data?.name || "").trim();
            const folder = (data?.folder || "Default").trim();
            if (!name) return;
            await this.appDataService.addManualBookmark(name, page, folder);
            this.surahService.presentToastWithOptions(
              "Bookmark saved",
              "success",
              "middle"
            );
          },
        },
      ],
    });
    await alert.present();
  }

  // ===========================================
  // VIEW / MANAGE BOOKMARKS
  // ===========================================

  isBookmarksOpen = false;
  bookmarkFolders: any[] = [];

  async openBookmarksViewer() {
    this.bookmarkFolders = await this.appDataService.getManualBookmarks();
    this.isBookmarksOpen = true;
  }

  navigateToBookmark(bookmark: any) {
    this.isBookmarksOpen = false;
    if (bookmark.page) {
      this.gotoPageNum(bookmark.page);
      // Highlight the bookmarked line briefly
      if (bookmark.lineNumber != null) {
        setTimeout(() => {
          const lineEl = document.getElementById(`line_${bookmark.lineNumber}`);
          if (lineEl) {
            lineEl.classList.add('highlight-line');
            setTimeout(() => lineEl.classList.remove('highlight-line'), 2000);
          }
        }, 500);
      }
    }
  }

  async deleteBookmark(bookmark: any) {
    await this.appDataService.deleteManualBookmark(bookmark.id);
    this.bookmarkFolders = await this.appDataService.getManualBookmarks();
    this.surahService.presentToastWithOptions('Bookmark deleted', 'danger', 'bottom');
  }

  async deleteFolder(folder: any) {
    if (folder.id === 'default') {
      this.surahService.presentToastWithOptions('Cannot delete default folder', 'warning', 'bottom');
      return;
    }
    const alert = await this.alertController.create({
      header: 'Delete Folder',
      message: `Delete "${folder.name}" and all its bookmarks?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          cssClass: 'delete-btn',
          handler: async () => {
            await this.appDataService.deleteBookmarkFolder(folder.id);
            this.bookmarkFolders = await this.appDataService.getManualBookmarks();
            this.surahService.presentToastWithOptions('Folder deleted', 'danger', 'bottom');
          },
        },
      ],
    });
    await alert.present();
  }

  async addNoteEntry() {
    const alert = await this.alertController.create({
      header: "Add Note",
      inputs: [
        {
          name: "title",
          type: "text",
          placeholder: "Note title",
        },
        {
          name: "content",
          type: "textarea",
          placeholder: "Write your note...",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Save",
          handler: async (data) => {
            const title = (data?.title || "").trim();
            const content = (data?.content || "").trim();
            if (!title || !content) return;
            await this.appDataService.addOrAppendNote(title, content, {
              page: this.currentPageCalculated || this.currentPage,
              surah: this.surahCalculatedForJuz || this.surahCalculated,
              juz: this.juzCalculated,
            });
            this.surahService.presentToastWithOptions(
              "Note saved",
              "success",
              "middle"
            );
          },
        },
      ],
    });
    await alert.present();
  }

  async exportAppData() {
    const json = await this.appDataService.exportAppData();
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
      this.surahService.presentToastWithOptions(
        "App data copied to clipboard",
        "success",
        "middle"
      );
      return;
    }

    const alert = await this.alertController.create({
      header: "Export Data",
      message: "<small>Copy the JSON below</small>",
      inputs: [
        {
          name: "json",
          type: "textarea",
          value: json,
        },
      ],
      buttons: [{ text: "Close", role: "cancel" }],
    });
    await alert.present();
  }

  async importAppData() {
    const alert = await this.alertController.create({
      header: "Import Data",
      inputs: [
        {
          name: "json",
          type: "textarea",
          placeholder: "Paste JSON here",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Import",
          handler: async (data) => {
            const json = (data?.json || "").trim();
            if (!json) return;
            await this.appDataService.importAppData(json, true);
            this.surahService.presentToastWithOptions(
              "App data imported",
              "success",
              "middle"
            );
          },
        },
      ],
    });
    await alert.present();
  }

  private applyTatweelToLines() {
    const lines = document.querySelectorAll(".line span");
    lines.forEach((spanEl: HTMLElement) => {
      const rawText =
        spanEl.getAttribute("data-raw-text") ?? spanEl.innerText ?? "";

      if (!spanEl.getAttribute("data-raw-text")) {
        spanEl.setAttribute("data-raw-text", rawText);
      }

      if (!this.enableTatweel) {
        spanEl.innerText = rawText;
        return;
      }

      if (!this.shouldApplyTatweel(rawText)) {
        spanEl.innerText = rawText;
        return;
      }

      const parent = spanEl.parentElement as HTMLElement;
      if (!parent) return;
      const computed = window.getComputedStyle(spanEl);
      const fontProp = computed.font || `${computed.fontSize} ${computed.fontFamily}`;
      const containerWidth = parent.clientWidth;
      const currentWidth = this.textWidth(rawText, fontProp);
      if (currentWidth >= containerWidth) {
        spanEl.innerText = rawText;
        return;
      }

      const tatweelWidth = this.textWidth("ـ", fontProp);
      if (!tatweelWidth || tatweelWidth <= 0) {
        spanEl.innerText = rawText;
        return;
      }

      const deficit = containerWidth - currentWidth;
      const tatweelCount = Math.floor(deficit / tatweelWidth);
      if (tatweelCount <= 0) {
        spanEl.innerText = rawText;
        return;
      }

      spanEl.innerText = this.insertTatweel(rawText, tatweelCount);
    });
  }

  private shouldApplyTatweel(text: string): boolean {
    if (!text) return false;
    if (text.includes("﷽")) return false;
    if (!/[\u0600-\u06FF]/.test(text)) return false;
    return true;
  }

  /**
   * Properly insert tatweel (kashida) characters between connected Arabic letters.
   *
   * Rules:
   * - Tatweel goes AFTER a base letter + its tashkeel marks, BEFORE the next base letter
   * - Only after letters that connect to the left (dual-joining letters)
   * - Never across word boundaries (spaces)
   * - Distributed as evenly as possible across all eligible slots
   * - Max 3 tatweels per slot to prevent ugly over-stretching
   */
  private insertTatweel(text: string, count: number): string {
    const TATWEEL = "\u0640";

    // Arabic combining marks (tashkeel / diacritics) that sit above/below a base letter
    const isTashkeel = (c: string) =>
      /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/.test(c);

    // Arabic base letter (not marks, not special symbols)
    const isArabicBase = (c: string) =>
      /[\u0621-\u063A\u0641-\u064A\u066E\u066F\u0671-\u06D3\u06FA-\u06FC]/.test(c);

    // Right-joining-only letters — they do NOT connect to the left,
    // so tatweel CANNOT follow them (it would float disconnected).
    // ا أ إ آ ٱ ى د ذ ر ز و ؤ
    const isNonLeftJoining = (c: string) =>
      /[\u0627\u0623\u0625\u0622\u0671\u0649\u062F\u0630\u0631\u0632\u0648\u0624]/.test(c);

    const chars = [...text]; // spread handles multi-byte correctly

    // --- Find eligible insertion positions ---
    // For each Arabic base letter at index i, look backward (past tashkeel)
    // to find the previous base letter. If that previous letter connects
    // left and there is no space between them, index i is a valid slot
    // (tatweel inserted just before chars[i]).
    const slots: number[] = [];

    for (let i = 0; i < chars.length; i++) {
      if (!isArabicBase(chars[i])) continue;

      // NEVER insert tatweel BEFORE a non-left-joining letter (alef, dal, etc.)
      // because it breaks ligatures like lam-alef (لا → لـا looks wrong)
      if (isNonLeftJoining(chars[i])) continue;

      // Walk backward past tashkeel and existing tatweels
      let j = i - 1;
      while (j >= 0 && (isTashkeel(chars[j]) || chars[j] === TATWEEL)) j--;

      if (j < 0) continue;

      const prev = chars[j];
      if (!isArabicBase(prev)) continue; // previous is space, symbol, etc.
      if (isNonLeftJoining(prev)) continue; // previous letter doesn't connect left

      // Make sure there is no space between j and i
      let hasGap = false;
      for (let k = j + 1; k < i; k++) {
        if (chars[k] === " " || chars[k] === "\u00A0") {
          hasGap = true;
          break;
        }
      }
      if (hasGap) continue;

      slots.push(i);
    }

    if (slots.length === 0) return text;

    // --- Distribute tatweels evenly, max 3 per slot ---
    const MAX_PER_SLOT = 3;
    const effectiveMax = slots.length * MAX_PER_SLOT;
    const total = Math.min(count, effectiveMax);

    const perSlot = Math.floor(total / slots.length);
    const remainder = total % slots.length;
    const allocation: number[] = new Array(slots.length).fill(perSlot);

    // Spread the remainder across evenly-spaced slots
    if (remainder > 0) {
      const step = slots.length / remainder;
      for (let k = 0; k < remainder; k++) {
        const idx = Math.min(Math.round(k * step), allocation.length - 1);
        allocation[idx]++;
      }
    }

    // --- Build result string, inserting from end to preserve indices ---
    const result = [...chars];
    for (let k = slots.length - 1; k >= 0; k--) {
      if (allocation[k] > 0) {
        const stretch = TATWEEL.repeat(allocation[k]);
        result.splice(slots[k], 0, ...stretch.split(""));
      }
    }

    return result.join("");
  }

  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverController.dismiss();
    const alert = await this.alertController.getTop();
    if (alert) this.alertController.dismiss();
    if (this.audio) this.stopAudio();
  }

  private attachSelectionListeners() {
    if (!this.arElement) {
      this.arElement = document.querySelector(".ar") as HTMLElement;
    }
    if (this.arElement) {
      this.arElement.addEventListener("mouseup", this.arMouseupHandler);
      this.arElement.addEventListener("selectstart", this.arSelectStartHandler);
    }
    document.addEventListener("selectionchange", this.selectionChangeHandler);
  }

  // Show Ionic alert
  async selectionChangeReportHandler() {
    var selection = window.getSelection();
    if (selection.toString() != "") {
      var selectedElement = selection.anchorNode?.parentElement?.parentElement;
      if (selectedElement) {
        this.selectionMap.selectedElementId = selectedElement.id;
      }
      this.selectionMap.somethingSelected = true;
      const i = this.selectionMap.selectedElementId.split("_")[1];
      const el = document.getElementById(this.selectionMap.selectedElementId);
      const line = el ? el.textContent.trim() : "";
      let msg = `Report Pg${this.currentPage}:L${i}
      
      ${line}
      Selected: ${window.getSelection().toString()}`;
      this.selectionMap.message = msg;
    } else {
      this.selectionMap = {
        somethingSelected: false,
        selectedElementId: "",
        message: "",
      };
    }
  }

  setupSwipeGesture() {
    const gesture = this.gestureCtrl.create(
      {
        el: this.swipeContainer.nativeElement, // Target element
        threshold: 10, // Minimum movement to trigger
        gestureName: "swipe",
        onEnd: (detail) => {
          const SWIPE_THRESHOLD = 50; // Only register swipe if it moves more than this many pixels.

          if (detail.deltaX > SWIPE_THRESHOLD) {
            this.onSwipeRight();
          } else if (detail.deltaX < -SWIPE_THRESHOLD) {
            this.onSwipeLeft();
          }
        },
      },
      true
    );

    this.swipeGesture = gesture;
    gesture.enable();
  }

  onSwipeLeft() {
    this.goToPage(-1);
  }

  onSwipeRight() {
    this.goToPage(1);
  }

  /**
   * Toggle immersive mode for full-screen reading
   */
  toggleImmersiveMode() {
    this.isImmersive = !this.isImmersive;
    if (this.isImmersive) {
      document.body.classList.add('immersive-mode');
    } else {
      document.body.classList.remove('immersive-mode');
    }
  }

  /**
   * Initialize page from route params (URL-based navigation)
   * This enables refresh-safe navigation
   */
  private initFromRouteParams(params: any, data: any) {
    const mode = data.mode || 'full';
    const id = params.id ? parseInt(params.id) : null;
    const page = params.page ? parseInt(params.page) : null;
    const ruku = params.ruku ? parseInt(params.ruku) : null;
    const ayah = params.ayah ? parseInt(params.ayah) : null;
    const queryParams = this.activatedRoute.snapshot.queryParams || {};
    const sourceId = this.resolveSourceId(queryParams.source, queryParams.lines);

    console.log('Initializing from route params:', { mode, id, page, ruku, ayah });

    // Set mode flags
    this.juzmode = true;
    this.juzsurahmode = mode === 'surah';

    // Load data from storage/network
    this.loadQuranDataFromRoute(mode, id, page, ruku, ayah, sourceId);
  }

  /**
   * Load Quran data based on route parameters
   */
  private loadQuranDataFromRoute(
    mode: string,
    id: number | null,
    page: number | null,
    ruku: number | null,
    ayah: number | null,
    sourceId: string
  ) {
    this.quranDataService
      .setSource(sourceId)
      .then(() => {
        // Set font class based on the selected source
        this.currentFontClass = this.quranDataService.getCurrentFontClass();
        
        if (mode === 'full') {
          this.quranDataService.loadFullQuran().subscribe(
            (res) => {
              const allPages = res.split('\n\n');
              this.surah = res;
              this.pages = allPages;
              this.title = 'Quran';
              this.isCompleteMushaf = true;

              if (page) {
                this.currentPage = Math.min(Math.max(1, page), this.pages.length);
              }

              this.finalizeRouteLoad(mode);
            },
            (err) => this.handleLoadError(err)
          );
          return;
        }

        if (mode === 'juz' && id) {
          this.quranDataService.getJuz(id).subscribe(
            (res: any) => {
              this.surah = res.pages;
              this.pages = res.pages.split('\n\n');
              this.title = res.title;
              this.juzNumber = id;
              this.isCompleteMushaf = false;
              this.calculateRukuArrayForJuz(id || 1, this.pages);

              if (ruku && this.rukuArray[id - 1] && this.rukuArray[id - 1][ruku - 1]) {
                const rukuInfo = this.rukuArray[id - 1][ruku - 1];
                this.currentPage = rukuInfo.juzPageIndex + 1;
              }

              this.finalizeRouteLoad(mode);
            },
            (err) => this.handleLoadError(err)
          );
          return;
        }

        if (mode === 'surah' && id) {
          this.quranDataService.getSurah(id).subscribe(
            (res: any) => {
              this.surah = res.pages;
              this.pages = res.pages.split('\n\n');
              this.title = res.title;
              this.isCompleteMushaf = false;
              this.finalizeRouteLoad(mode);

              // Jump to specific ayah if provided in route
              if (ayah && ayah > 0 && id) {
                setTimeout(() => this.jumpToAyahInSurahMode(id, ayah), 500);
              }
            },
            (err) => this.handleLoadError(err)
          );
        }
      })
      .catch((err) => {
        console.error('Failed to initialize text source:', err);
        this.router.navigate(['/browse']);
      });
  }

  private finalizeRouteLoad(mode: string) {
    if (this.pages && this.pages.length > 0) {
      this.arabicLines = this.pages[this.currentPage - 1]?.split('\n') || [];
      this.lines = this.arabicLines;
    }

    this.MUSHAF_MODE = {
      COMPLETE_MUSHAF: mode === 'full',
      JUZ_VERSION: mode === 'juz',
      SURAH_VERSION: mode === 'surah',
    };

    // For full Quran mode, calculate ruku array for all 30 juz.
    // For qurancom sources, use metadata (no ۧ in text). For archive, scan text.
    if (mode === 'full' && this.pages.length > 0) {
      const source = this.quranDataService.getCurrentSourceValue();
      if (source.type === 'qurancom') {
        this.buildRukuArrayFromMetadata();
      } else {
        for (let juz = 1; juz <= 30; juz++) {
          const juzStartPage = this.surahService.juzPageNumbers[juz - 1] - 1;
          const juzEndPage = juz < 30
            ? this.surahService.juzPageNumbers[juz] - 1
            : this.pages.length;
          const clampedStart = Math.min(juzStartPage, this.pages.length);
          const clampedEnd = Math.min(juzEndPage, this.pages.length);
          const juzPages = this.pages.slice(clampedStart, clampedEnd);
          this.calculateRukuArrayForJuz(juz, juzPages, clampedStart);
        }
      }
    }

    this.isDataLoaded = true;
    this.updateCalculatedNumbers();
    this.getBookmark();

    // Load surahInfo FIRST, then run ayah detection + adjustFontsize.
    // This ensures surahInfo is available for inline/wbw/audio features.
    this.surahService
      .getSurahInfo()
      .pipe(take(1))
      .subscribe((res: any) => {
        this.surahInfo = res;
        this.surahService.surahInfo = res;
        this.getFirstAndLastAyahNumberOnPage();

        // Use a timeout to let Angular render the lines in the DOM
        // before adjusting font sizes and applying tatweel
        setTimeout(() => {
          this.adjustFontsize();
          this.setupLinks();
        }, 150);
      });
  }

  private handleLoadError(err: any) {
    console.error('Failed to load Quran data:', err);
    this.surahService.presentToastWithOptions(
      'Failed to load Quran data. Please check your connection.',
      'danger',
      'middle'
    );
    this.router.navigate(['/browse']);
  }

  private resolveSourceId(sourceParam?: string, linesParam?: string): string {
    const sources = this.quranDataService.getAllSources();
    const direct = sourceParam
      ? sources.find((s) => s.id.toLowerCase() === sourceParam.toLowerCase())
      : null;
    if (direct) return direct.id;

    const lines = linesParam ? parseInt(linesParam, 10) : 15;
    const sourceKey = (sourceParam || '').toLowerCase();
    if (sourceKey === 'archive') return lines === 16 ? 'archive-16' : 'archive-15';
    if (sourceKey === 'qurancom' || sourceKey === 'quran.com')
      return lines === 16 ? 'qurancom-indopak-16' : 'qurancom-indopak-15';

    // Default to archive for fast loading (single file vs 114 JSON files)
    return 'archive-15';
  }

  /**
   * Calculate ruku array for a specific juz
   */
  /**
   * Calculate ruku array for a specific juz.
   * @param juzNumber 1-based juz number
   * @param juzPages Array of page texts for this juz
   * @param absolutePageOffset 0-based index of the first page in this.pages (used for absolute page numbering)
   */
  /**
   * Build rukuArray from qurancom metadata (no ۧ character in text).
   * Converts mushaf page numbers to this.pages array indices,
   * then partitions by juz using surahService.juzPageNumbers.
   */
  private buildRukuArrayFromMetadata() {
    const positions = this.quranDataService.getQuranComRukuPositions();
    if (!positions || positions.length === 0) return;

    // Convert each ruku position to a pages-array entry
    const allRukuEntries: any[] = [];
    for (const pos of positions) {
      const pageIdx = this.quranDataService.getQuranComPageIndex(pos.page);
      if (pageIdx === undefined) continue;
      // pageIdx is 1-indexed in this.pages (0 = title page)
      const pageText = this.pages[pageIdx];
      if (!pageText) continue;
      // line number from qurancom is 1-based; find which lineIndex (0-based) it maps to
      // The lines in this.pages[pageIdx] are ordered, and line numbers may not be sequential
      // (e.g., line 1, 2, ... 15). Use (pos.line - 1) as the 0-based index.
      const lineIndex = pos.line - 1;
      allRukuEntries.push({
        juzPageIndex: 0, // not used for metadata-based
        lineIndex,
        line: pageText.split('\n')[lineIndex] || '',
        pageNumber: pageIdx + 1, // 1-indexed absolute page in this.pages (matches how archive does it)
      });
    }

    // Partition into juz-based arrays using surahService.juzPageNumbers
    this.rukuArray = [];
    for (let juz = 1; juz <= 30; juz++) {
      const juzStartPage = this.surahService.juzPageNumbers[juz - 1]; // 1-indexed
      const juzEndPage = juz < 30
        ? this.surahService.juzPageNumbers[juz] - 1
        : this.pages.length;

      const juzRukuEntries = allRukuEntries.filter(
        (e) => e.pageNumber >= juzStartPage && e.pageNumber <= juzEndPage
      );

      while (this.rukuArray.length < juz) {
        this.rukuArray.push([]);
      }
      this.rukuArray[juz - 1] = juzRukuEntries;
    }

    // Also build a fast lookup set for addIndicators: "pageNumber:lineIndex"
    this._quranComRukuLineSet = new Set(
      allRukuEntries.map((e) => `${e.pageNumber}:${e.lineIndex}`)
    );
  }

  /** Fast lookup for qurancom ruku lines: "pageNumber:lineIndex" */
  private _quranComRukuLineSet: Set<string> | null = null;

  /**
   * Jump to a specific ayah within surah-only mode (non-complete mushaf).
   * Scans pages for the ayah mark and navigates + highlights.
   */
  private jumpToAyahInSurahMode(surahNum: number, ayahNum: number) {
    if (!this.pages || this.pages.length === 0) return;

    // For qurancom: use metadata
    const source = this.quranDataService.getCurrentSourceValue();
    if (source.type === 'qurancom') {
      // In surah mode, pages are indexed relative to the surah.
      // quranComAyahMap uses absolute page indices.
      // We need to search all pages for the matching surah:ayah.
      for (let p = 0; p < this.pages.length; p++) {
        const pageLines = this.pages[p].split('\n');
        // Use the absolute page index: the surah reader maps surah pages to qurancom indices differently.
        // For surah mode, pages are extracted from full text, so we check metadata for each page.
        // Since we're in surah mode (not complete mushaf), ayah metadata may not be available.
        // Fall back to text scanning below.
      }
    }

    // Text scanning approach (works for both archive and qurancom since end markers are in text)
    const AYAH_MARK = this.surahService.diacritics.AYAH_MARK;
    const targetMark = AYAH_MARK + this.surahService.e2a(ayahNum.toString());

    for (let p = 0; p < this.pages.length; p++) {
      const pageText = this.pages[p];
      const pageLines = pageText.split('\n');

      // Check if this page contains the target ayah mark
      // For qurancom, word.text won't have AYAH_MARK, so also check for verse number in text
      let foundLine = -1;

      for (let l = 0; l < pageLines.length; l++) {
        // Archive text: check for AYAH_MARK + digits
        if (pageLines[l].includes(targetMark)) {
          foundLine = l;
          break;
        }
      }

      // For qurancom (no AYAH_MARK in text), use metadata
      if (foundLine < 0 && source.type === 'qurancom') {
        // Search qurancom ayah metadata across ALL pages (absolute index)
        // This is a heuristic: in surah mode, page p maps to some absolute page.
        // But we may not know the mapping. Instead, search ALL metadata for surah:ayah.
        for (const [pageIdx, ayahs] of this.quranComAyahMapEntries()) {
          for (const a of ayahs) {
            if (a.surah === surahNum && a.ayah === ayahNum) {
              // Found it. Now we need to find which SURAH page this corresponds to.
              // In surah mode, pages are a subset. Map absolute pageIdx → surah page index.
              const surahPageIdx = this.findSurahPageForAbsoluteIndex(pageIdx);
              if (surahPageIdx >= 0) {
                this.gotoPageNum(surahPageIdx + 1);
                setTimeout(() => {
                  this.highlightLine(a.line);
                }, 300);
                return;
              }
            }
          }
        }
        break; // If metadata approach didn't find it, stop
      }

      if (foundLine >= 0) {
        this.gotoPageNum(p + 1);
        setTimeout(() => {
          this.highlightLine(foundLine);
        }, 300);
        return;
      }
    }

    // Fallback: if ayah 1, go to page 1
    if (ayahNum === 1) {
      this.gotoPageNum(1);
    }
  }

  /**
   * Highlight a specific line temporarily (2s).
   */
  private highlightLine(lineIndex: number) {
    const el = document.querySelector(`#line_${lineIndex}`) as HTMLElement;
    if (el) {
      el.classList.add('highlight-line');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.classList.remove('highlight-line'), 3000);
    }
  }

  /**
   * Get qurancom ayah map entries (for iteration).
   */
  private quranComAyahMapEntries(): [number, { line: number; surah: number; ayah: number }[]][] {
    const result: [number, { line: number; surah: number; ayah: number }[]][] = [];
    // Use the service to check pages
    for (let i = 1; i < 700; i++) {
      const ayahs = this.quranDataService.getQuranComAyahsForPage(i);
      if (ayahs === null) break; // No more data
      if (ayahs.length > 0) result.push([i, ayahs]);
    }
    return result;
  }

  /**
   * Find which surah-mode page index corresponds to an absolute page index.
   * This is approximate: compare page text content.
   */
  private findSurahPageForAbsoluteIndex(absolutePageIdx: number): number {
    // In surah mode, this.pages are a subset of the full Quran pages.
    // We can't directly map, but we can compare the first line of each page.
    // This is a best-effort approach.
    return -1; // Not easily mappable in surah mode; let text scanning handle it
  }

  private calculateRukuArrayForJuz(juzNumber: number, juzPages: string[], absolutePageOffset?: number) {
    const juzRukuArray: any[] = [];
    // If no explicit offset given, fall back to archive-based page numbers
    const useAbsoluteOffset = absolutePageOffset !== undefined;
    
    juzPages.forEach((page, juzPageIndex) => {
      if (page.includes(this.surahService.diacritics.RUKU_MARK)) {
        page.split('\n').forEach((line, lineIndex) => {
          if (line.includes(this.surahService.diacritics.RUKU_MARK)) {
            juzRukuArray.push({
              juzPageIndex,
              lineIndex,
              line,
              // Absolute 1-indexed page number within this.pages
              pageNumber: useAbsoluteOffset
                ? absolutePageOffset + juzPageIndex + 1
                : juzPageIndex + this.surahService.juzPageNumbers[juzNumber - 1],
            });
          }
        });
      }
    });
    
    // Ensure rukuArray has entries for all juz
    while (this.rukuArray.length < juzNumber) {
      this.rukuArray.push([]);
    }
    this.rukuArray[juzNumber - 1] = juzRukuArray;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.arElement) {
      this.arElement.removeEventListener("mouseup", this.arMouseupHandler);
      this.arElement.removeEventListener("selectstart", this.arSelectStartHandler);
    }
    document.removeEventListener("selectionchange", this.selectionChangeHandler);

    if (this.swipeGesture?.destroy) {
      this.swipeGesture.destroy();
    }
  }
}
