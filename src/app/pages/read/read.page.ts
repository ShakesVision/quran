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

  // Inline translation mode
  inlineTransMode = false;
  inlineTransLang: 'en' | 'ur' = 'en';
  inlineTranslations: string[] = [];
  private inlineTransCache: Map<string, string[]> = new Map();

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
    private actionSheetController: ActionSheetController
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
      this.isCompleteMushaf = this.pages.length === 611;
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
    console.log("setting bookmarks: ", this.bookmarks, this.MUSHAF_MODE);
    if (
      this.juzmode &&
      this.isCompleteMushaf &&
      this.currentPage !== 1 &&
      this.currentPage !== this.pages.length
    )
      this.storage.set("unicodeBookmark", this.currentPage).then((_) => {});

    // complete mushaf
    if (this.MUSHAF_MODE.COMPLETE_MUSHAF)
      this.bookmarks.auto.unicode = this.currentPage;

    // juz version
    if (this.MUSHAF_MODE.JUZ_VERSION) {
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
    if (this.MUSHAF_MODE.SURAH_VERSION) {
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
    this.currentPage += n;
    this.arabicLines = this.pages[this.currentPage - 1].split("\n");
    this.updateCalculatedNumbers();
    this.scanView = false;
    if (this.translationExists)
      this.translationLines = this.tPages[this.currentPage - 1].split("\n");
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
        this.readTrans(
          `${this.getCorrectedSurahNumberWithRespectTo(
            n
          )}:${this.getNextAyahNumberFromCurrentLine(n)}`
        );
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
        text: '▶ Play from here',
        icon: 'play-outline',
        handler: () => {
          this.playAudioFromLine(lineIndex);
        },
      },
      {
        text: '📖 Show Translation',
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
        text: '📋 Copy Line',
        icon: 'copy-outline',
        handler: () => {
          this.copyAnything(line);
          this.surahService.presentToastWithOptions('Line copied!', 'success-light', 'bottom');
        },
      },
      {
        text: '📋 Copy Page',
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
        text: '🔖 Bookmark this line',
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
    await this.appDataService.addManualBookmark(name, page, 'Reading');
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

    buttons.push(
      {
        text: 'Copy Page Range...',
        handler: () => {
          this.promptCopyPageRange();
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

  getNextAyahNumberFromCurrentLine(lineNumber: number) {
    const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
    let lineCounter = lineNumber;
    let txt = "";
    do {
      txt = this.lines[lineCounter];
      lineCounter++;
    } while (!re.test(txt));
    console.log(txt);
    let verseNum = txt
      .split(" ")
      .find((word) => re.test(word))
      .split(this.surahService.diacritics.AYAH_MARK)[1];
    verseNum = this.getEnNumber(verseNum);
    return verseNum;
  }
  getCorrectedSurahNumberWithRespectTo(lineNo) {
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
          text: "⧉ Copy",
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
        // Need to add number in the equation too, const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
        page.split(this.surahService.diacritics.AYAH_MARK).length - 1
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
  addIndicators(line: string, i: number): string {
    if (line.includes(this.surahService.diacritics.RUKU_MARK)) {
      let rukuIndex = -1;
      const juzrukuarr = this.rukuArray[this.juzCalculated - 1];
      juzrukuarr?.forEach((el, index) => {
        const mushafPageNumber =
          el.pageNumber ||
          this.surahService.juzPageNumbers[this.juzCalculated - 1] +
            el.juzPageIndex;
        if (
          this.currentPageCalculated === mushafPageNumber &&
          el.lineIndex === i
        )
          rukuIndex = index;
      });

      const rukuNumber = rukuIndex + 1;
      const ayahCount = this.getAyahCountForRuku(rukuIndex);
      const ayahCountAr = ayahCount > 0 ? this.surahService.e2a(ayahCount.toString()) : '';
      const rukuNumberAr = this.surahService.e2a(rukuNumber.toString());

      return `<div class="ruku-ain-group">` +
        `<span class="ruku-ain">ع</span>` +
        `<span class="ruku-ayah-count">${ayahCountAr}</span>` +
        `</div>` +
        `<div class="ruku-number">${rukuNumberAr}</div>`;
    } else return "";
  }

  /**
   * Count ayah marks (۝) between this ruku and the previous one in the current juz.
   * This gives the number of ayahs in this ruku section.
   */
  private getAyahCountForRuku(rukuIndex: number): number {
    if (!this.pages || rukuIndex < 0) return 0;
    const juzrukuarr = this.rukuArray[this.juzCalculated - 1];
    if (!juzrukuarr || !juzrukuarr[rukuIndex]) return 0;

    const AYAH_MARK = this.surahService.diacritics.AYAH_MARK;
    const currentRuku = juzrukuarr[rukuIndex];
    const prevRuku = rukuIndex > 0 ? juzrukuarr[rukuIndex - 1] : null;

    // Determine the range of pages and lines to scan
    const juzStartPage = this.surahService.juzPageNumbers[this.juzCalculated - 1] - 1; // 0-indexed

    // Get text between previous ruku (exclusive) and current ruku (inclusive)
    let ayahCount = 0;
    const startPage = prevRuku ? (prevRuku.pageNumber || (juzStartPage + prevRuku.juzPageIndex + 1)) - 1 : juzStartPage;
    const endPage = (currentRuku.pageNumber || (juzStartPage + currentRuku.juzPageIndex + 1)) - 1;

    for (let p = startPage; p <= endPage && p < this.pages.length; p++) {
      const pageLines = this.pages[p]?.split('\n') || [];
      for (let l = 0; l < pageLines.length; l++) {
        // Skip lines at or before the previous ruku mark
        if (p === startPage && prevRuku) {
          const prevLineIdx = prevRuku.lineIndex;
          if (p === endPage && l <= prevLineIdx) continue;
          if (p !== endPage && l <= prevLineIdx) continue;
        }
        // Stop after the current ruku line
        if (p === endPage && l > currentRuku.lineIndex) break;

        // Count ayah marks in this line
        const matches = pageLines[l].match(new RegExp(AYAH_MARK, 'g'));
        if (matches) ayahCount += matches.length;
      }
    }

    return ayahCount;
  }
  toggleMuhammadiFont() {
    document.querySelector(".page-wrapper").classList.toggle("ar2");
  }
  getFirstAndLastAyahNumberOnPage(): FirstLastAyah {
    if (
      (this.juzmode && this.isCompleteMushaf && this.currentPage === 1) ||
      !this.juzmode
    )
      return;
    //first ayah
    const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
    let lineCounter = 0;
    let txt = "";
    do {
      txt = this.lines[lineCounter];
      lineCounter++;
    } while (!re.test(txt));
    let firstVerseNum = parseInt(
      this.getEnNumber(
        txt
          .split(" ")
          .find((word) => re.test(word))
          .split(this.surahService.diacritics.AYAH_MARK)[1]
      )
    );
    //last ayah
    let lastLineWordsArr = this.lines[this.lines?.length - 1].trim().split(" ");
    let lastVerseNum = parseInt(
      this.getEnNumber(
        lastLineWordsArr[lastLineWordsArr.length - 1]?.split(
          this.surahService.diacritics.AYAH_MARK
        )[1]
      )
    );
    console.log(
      `FIRST AND LAST AYAH ON PAGE: ${firstVerseNum} ${lastVerseNum}`
    );
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
    console.log(firstLastAyah);
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
    let url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?language=${lang}&fields=text_indopak&words=true&word_fields=text_indopak&translations=131,151,158,84&translation_fields=resource_name,language_name&audio=2`;
    // const u = "https://api.qurancdn.com/api/qdc/verses/by_chapter/52?words=true&translation_fields=resource_name,language_id&per_page=15&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&translations=131,151,234,158&reciter=7&word_translation_language=en&page=1&from=52:35&to=52:49&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,qpc_uthmani_hafs&mushaf=2"
    this.httpClient.get(url).subscribe((res: any) => {
      console.log(res);
      let verse = res.verse;
      let msg = "";
      msg += `${verse.text_indopak.replace(/ۡ/g, "ْ")}<br>`;
      verse.translations.forEach((trans) => {
        msg += `${trans.text} <br> <small>— <i>${trans.resource_name}</i> </small> <br><br>`;
      });
      verse.words.forEach((w) => {
        msg += `${w.text_indopak} — ${w.translation.text} <br>`;
      });
      // this.presentAlert(msg, verse.verse_key);
      this.presentModal(verseKey);
    });
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
      key = `${this.getCorrectedSurahNumberWithRespectTo(
        n
      )}:${this.getNextAyahNumberFromCurrentLine(n)}`;
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
  } {
    const firstAndLast = this.getFirstAndLastAyahNumberOnPage();
    let verseIdList = [];
    let verseIdListForAudio = [];
    const firstSurahInfo = this.surahInfo.find((s) => {
      return parseInt(s.index) == firstAndLast.first.firstSurahNum;
    });
    const lastSurahInfo = this.surahInfo.find((s) => {
      return parseInt(s.index) == firstAndLast.last.lastSurahNum;
    });
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
    const fullUrl = `${this.incompleteUrl}${this.surahService.getPaddedNumber(
      p
    )}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    this.fullImageUrl = fullUrl;
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

    document.querySelectorAll(".line").forEach((el: HTMLElement) => {
      while (
        el.clientWidth <
        this.textWidth(
          el.innerText,
          this.getFontProp(el)
        )
      )
        el.style.fontSize =
          (parseFloat(window.getComputedStyle(el).fontSize) - 1).toString() +
          "px";
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
    const alert = await this.alertController.create({
      header: "Add Bookmark",
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: "Bookmark name",
          value: `Page ${this.currentPageCalculated || this.currentPage}`,
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
            const page =
              this.currentPageCalculated || this.currentPage || 1;
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
      this.lines = this.pages[this.currentPage - 1]?.split('\n') || [];
    }

    this.MUSHAF_MODE = {
      COMPLETE_MUSHAF: mode === 'full',
      JUZ_VERSION: mode === 'juz',
      SURAH_VERSION: mode === 'surah',
    };

    // TODO: Jump to ayah if provided (needs word-level tracking)

    this.isDataLoaded = true;
    this.updateCalculatedNumbers();
    this.getFirstAndLastAyahNumberOnPage();
    this.getBookmark();
    this.adjustFontsize();

    this.surahService
      .getSurahInfo()
      .pipe(take(1))
      .subscribe((res: any) => {
      this.surahInfo = res;
      this.surahService.surahInfo = res;
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
  private calculateRukuArrayForJuz(juzNumber: number, juzPages: string[]) {
    const juzRukuArray: any[] = [];
    
    juzPages.forEach((page, juzPageIndex) => {
      if (page.includes(this.surahService.diacritics.RUKU_MARK)) {
        page.split('\n').forEach((line, lineIndex) => {
          if (line.includes(this.surahService.diacritics.RUKU_MARK)) {
            juzRukuArray.push({
              juzPageIndex,
              lineIndex,
              line,
              pageNumber: juzPageIndex + this.surahService.juzPageNumbers[juzNumber - 1],
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
