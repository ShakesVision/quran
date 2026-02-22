import { HttpClient } from "@angular/common/http";
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import {
  AlertController,
  GestureController,
  Gesture,
  ModalController,
  Platform,
} from "@ionic/angular";
import { Subscription } from "rxjs";
import { finalize, map, take } from "rxjs/operators";
import { SurahService } from "../services/surah.service";
import {
  MorphologyService,
  WordMorphology,
} from "../services/morphology.service";
import { QuranData } from "src/assets/data/quran-data";
import { Storage } from "@ionic/storage-angular";
import { DomSanitizer } from "@angular/platform-browser";

/**
 * Translation resource info for display
 */
interface TranslationDisplay {
  id: number;
  resourceName: string;
  languageName: string;
  text: string;
  expanded: boolean;
  color: string;
  icon: string;
}

/** Translation ordering preference */
interface TranslationOrder {
  id: number;
  visible: boolean;
  position: number;
}

/** Supported WBW translation languages (Quran.com API) */
const WBW_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو" },
  { code: "bn", label: "বাংলা" },
  { code: "tr", label: "Türkçe" },
  { code: "id", label: "Bahasa" },
  { code: "fa", label: "فارسی" },
  { code: "hi", label: "हिन्दी" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
];

// Color palette for translation blocks (deterministic by language + index)
const TRANSLATION_COLORS: Record<string, string[]> = {
  urdu: [
    "#1B5E20",
    "#006064",
    "#4E342E",
    "#1A237E",
    "#BF360C",
    "#33691E",
    "#880E4F",
  ],
  english: [
    "#0D47A1",
    "#4A148C",
    "#E65100",
    "#1B5E20",
    "#880E4F",
    "#004D40",
    "#263238",
  ],
  default: ["#37474F", "#455A64", "#546E7A", "#607D8B"],
};

// Icons for known translations
const TRANSLATION_ICONS: Record<number, string> = {
  20: "shield-checkmark-outline", // Saheeh International
  85: "book-outline", // Abdel Haleem
  84: "school-outline", // Mufti Taqi Usmani
  95: "library-outline", // Maududi English
  22: "earth-outline", // Yusuf Ali
  203: "ribbon-outline", // Al-Hilali & Khan
  97: "library-outline", // Maududi Urdu
  54: "document-text-outline", // Junagarhi
  234: "bookmark-outline", // Jalandhari
  151: "layers-outline", // Tafsir E Usmani
  158: "bulb-outline", // Bayan-ul-Quran (Israr Ahmad)
  156: "leaf-outline", // Fe Zilal al-Qur'an
  819: "heart-outline", // Wahiduddin Khan
};

@Component({
  selector: "tafseer-modal",
  templateUrl: "tafseer-modal.html",
  styleUrls: ["tafseer-modal.scss"],
})
export class TafseerModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() verseKey: string;
  @ViewChild("swipeArea", { read: ElementRef }) swipeArea: ElementRef;

  verse: any;
  audioSrc: string;
  baseurl = "https://verses.quran.com/";
  tafsir: Record<string, string | null> = { ar: null, ur: null, en: null };
  loading = false;
  sajdahMessage: string;
  isConfigMode = false;
  wbwExpanded = false;

  // Morphology on word tap
  selectedWordIndex: number | null = null;
  selectedWordMorphology: WordMorphology | null = null;
  morphologyLoading = false;

  // WBW language switcher
  wbwLanguages = WBW_LANGUAGES;
  wbwTransLang = "en";
  wbwLangLoading = false;

  // Organized translation blocks
  translations: TranslationDisplay[] = [];

  // User's ordering/visibility preference
  private readonly STORAGE_KEY_TRANS_ORDER = "ReaderTranslationOrder";
  translationOrder: TranslationOrder[] = [];

  // Swipe gesture for navigating between ayahs
  private swipeGesture: Gesture | null = null;

  // Back button subscription
  private backButtonSub: Subscription;

  svgContent: string = ""; // will hold the SVG HTML for morphology visualization
  svgExpanded = false; // collapsed by default
  zoomProperties = {
    "double-tap": true,
    overflow: "hidden",
    wheel: false,
    disableZoomControl: "disable",
    backgroundColor: "rgba(0,0,0,0)",
  };

  constructor(
    private modalCtrl: ModalController,
    private httpClient: HttpClient,
    private surahService: SurahService,
    private alertController: AlertController,
    private storage: Storage,
    private gestureCtrl: GestureController,
    private platform: Platform,
    private morphologyService: MorphologyService,
    private sanitizer: DomSanitizer,
  ) {}

  async ngOnInit() {
    await this.loadTranslationOrder();
    this.fetchTrans(this.verseKey);

    this.getSvgContent(this.verseKey);
    // Intercept hardware/browser back button to dismiss modal instead of closing app
    this.backButtonSub = this.platform.backButton.subscribeWithPriority(
      200,
      () => {
        console.log(
          "[TafseerModal] Back button intercepted → dismissing modal",
        );
        this.dismissModal();
      },
    );
  }

  ngAfterViewInit() {
    // Wait for content to render, then try to set up gesture
    setTimeout(() => this.setupSwipeGesture(), 500);
  }

  ngOnDestroy() {
    if (this.swipeGesture) {
      this.swipeGesture.destroy();
      this.swipeGesture = null;
    }
    if (this.backButtonSub) {
      this.backButtonSub.unsubscribe();
    }
  }

  /**
   * Setup horizontal swipe gesture for navigating between ayahs.
   * Uses a wrapper div inside ion-content (shadow DOM blocks gestures on ion-content itself).
   */
  private setupSwipeGesture() {
    const el = this.swipeArea?.nativeElement;
    if (!el) {
      console.warn(
        "[TafseerModal] swipeArea element not found, retrying in 500ms...",
      );
      setTimeout(() => this.setupSwipeGesture(), 500);
      return;
    }

    console.log(
      "[TafseerModal] Setting up swipe gesture on",
      el.tagName,
      el.className,
    );

    this.swipeGesture = this.gestureCtrl.create(
      {
        el,
        gestureName: "tafseer-swipe",
        threshold: 15,
        onStart: () => {
          console.log("[TafseerModal] Swipe started");
        },
        onEnd: (ev) => {
          console.log("[TafseerModal] Swipe ended, deltaX:", ev.deltaX);
          const SWIPE_THRESHOLD = 50;
          if (ev.deltaX > SWIPE_THRESHOLD) {
            // Swipe right → next ayah (RTL: right = forward in Arabic)
            console.log("[TafseerModal] Swipe RIGHT → next ayah");
            this.loadNextAyah(1);
          } else if (ev.deltaX < -SWIPE_THRESHOLD) {
            // Swipe left → previous ayah
            console.log("[TafseerModal] Swipe LEFT → prev ayah");
            this.loadNextAyah(-1);
          }
        },
      },
      true,
    ); // runInsideAngularZone = true

    this.swipeGesture.enable(true);
    console.log("[TafseerModal] Swipe gesture enabled");
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }

  playWord(word: any) {
    if (word.audio_url) {
      const url = `${this.baseurl}${word.audio_url}`;
      const audio = new Audio(url);
      audio.play().catch(() => {});
    }
  }

  /**
   * Show morphology for a word in the arabic-card.
   * The word object from the API has position/location data.
   */
  onArabicWordClick(word: any, index: number) {
    // Play audio
    this.playWord(word);

    // Toggle morphology for this word
    if (this.selectedWordIndex === index) {
      this.selectedWordIndex = null;
      this.selectedWordMorphology = null;
      return;
    }

    this.selectedWordIndex = index;
    this.selectedWordMorphology = null;
    this.morphologyLoading = true;

    // Extract surah:ayah:word from word position
    const [surah, ayah] = this.verse.verse_key.split(":").map(Number);
    console.log(surah);
    const wordPosition = word.position || index + 1;

    this.morphologyService
      .getWordMorphology(surah, ayah, wordPosition)
      .pipe(take(1))
      .subscribe(
        (morph) => {
          this.selectedWordMorphology = morph;
          this.morphologyLoading = false;
        },
        () => {
          this.morphologyLoading = false;
        },
      );
  }

  /**
   * Change the WBW translation language and re-fetch word data
   */
  changeWbwLang(langCode: string) {
    if (langCode === this.wbwTransLang || !this.verse?.verse_key) return;
    this.wbwTransLang = langCode;
    this.wbwLangLoading = true;

    const url = `https://api.quran.com/api/v4/verses/by_key/${this.verse.verse_key}?language=${langCode}&words=true&word_fields=text_indopak,text_uthmani&word_translation_language=${langCode}`;
    this.httpClient
      .get<any>(url)
      .pipe(take(1))
      .subscribe(
        (res) => {
          if (res?.verse?.words) {
            // Update word translations while keeping existing word objects structure
            const newWords = res.verse.words;
            if (this.verse.words) {
              this.verse.words.forEach((w: any, i: number) => {
                if (newWords[i]) {
                  w.translation = newWords[i].translation;
                  w.transliteration = newWords[i].transliteration;
                }
              });
            }
          }
          this.wbwLangLoading = false;
        },
        () => {
          this.wbwLangLoading = false;
        },
      );
  }

  /**
   * Toggle a translation block expanded/collapsed
   */
  toggleTranslation(tr: TranslationDisplay) {
    tr.expanded = !tr.expanded;
  }

  /**
   * Toggle config mode to reorder/hide translations
   */
  toggleConfigMode() {
    this.isConfigMode = !this.isConfigMode;
  }

  /**
   * Move a translation up in order
   */
  moveUp(index: number) {
    if (index <= 0) return;
    const temp = this.translations[index];
    this.translations[index] = this.translations[index - 1];
    this.translations[index - 1] = temp;
    this.saveTranslationOrder();
  }

  /**
   * Move a translation down in order
   */
  moveDown(index: number) {
    if (index >= this.translations.length - 1) return;
    const temp = this.translations[index];
    this.translations[index] = this.translations[index + 1];
    this.translations[index + 1] = temp;
    this.saveTranslationOrder();
  }

  /**
   * Move a translation to a specific priority position (1-based).
   * User types a number to directly set order.
   */
  moveToPosition(currentIndex: number, targetPosStr: string) {
    const targetPos = parseInt(targetPosStr, 10);
    if (
      isNaN(targetPos) ||
      targetPos < 1 ||
      targetPos > this.translations.length
    )
      return;
    const targetIndex = targetPos - 1;
    if (targetIndex === currentIndex) return;

    const [item] = this.translations.splice(currentIndex, 1);
    this.translations.splice(targetIndex, 0, item);
    this.saveTranslationOrder();
  }

  /**
   * Toggle visibility of a translation
   */
  toggleVisibility(tr: TranslationDisplay) {
    const order = this.translationOrder.find((o) => o.id === tr.id);
    if (order) {
      order.visible = !order.visible;
    } else {
      this.translationOrder.push({
        id: tr.id,
        visible: false,
        position: this.translationOrder.length,
      });
    }
    this.saveTranslationOrder();
  }

  /**
   * Check if translation is visible according to saved order
   */
  isVisible(tr: TranslationDisplay): boolean {
    const order = this.translationOrder.find((o) => o.id === tr.id);
    return order ? order.visible : true; // visible by default
  }

  loadTafsir(lang: string) {
    this.loading = true;
    const [s, a] = this.verse.verse_key.split(":");
    const base_url = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
    let slug = "";
    switch (lang) {
      case "ar":
        slug = "ar-tafsir-ibn-kathir";
        break;
      case "ur":
        slug = "ur-tafseer-ibn-e-kaseer";
        break;
      case "en":
        slug = "en-tafsir-maarif-ul-quran";
        break;
      default:
        slug = "ur-tafseer-ibn-e-kaseer";
        break;
    }
    const url = `${base_url}/${slug}/${s}/${a}.json`;
    return this.httpClient
      .get<any>(url)
      .pipe(
        map((res) => res.text),
        finalize(() => (this.loading = false)),
      )
      .subscribe((res) => (this.tafsir[lang] = res));
  }

  loadNextAyah(offset: number) {
    const [s, a] = this.verse.verse_key.split(":");
    const nextAyahNumber = parseInt(a) + offset;
    if (nextAyahNumber === 0) {
      this.surahService.presentToastWithOptions(
        `Invalid Ayah: ${nextAyahNumber}`,
        "danger",
        "middle",
      );
      return;
    }
    const nextAyahKey = `${s}:${nextAyahNumber}`;
    this.fetchTrans(nextAyahKey);
  }

  async loadAnyAyah() {
    const alert = await this.alertController.create({
      header: "Enter Ayah Key",
      inputs: [{ name: "ayahKey", type: "text", placeholder: "e.g. 2:255" }],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Go",
          handler: (data) => {
            if (data.ayahKey) this.fetchTrans(data.ayahKey);
          },
        },
      ],
    });
    await alert.present();
  }

  fetchTrans(verse_key: string) {
    // Also fetch morphology for the new ayah
    this.getSvgContent(verse_key);
    this.loading = true;
    this.translations = [];
    this.tafsir = { ur: null, ar: null, en: null };
    this.surahService
      .fetchTrans(verse_key)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        (res: any) => {
          this.verse = res.verse;
          this.audioSrc = `${this.baseurl}${this.verse.audio.url}`;
          this.checkIfAyahHasSajdah();
          this.buildTranslationBlocks(this.verse.translations || []);
        },
        (err) => {
          console.error(err);
          this.surahService.presentToastWithOptions(
            `${err.error?.status || "Error"}: ${err.error?.error || "Failed to load"}`,
            "danger",
            "middle",
          );
        },
      );
  }

  /**
   * Build organized, colorful translation display blocks
   */
  private buildTranslationBlocks(rawTranslations: any[]) {
    const urduCounters: Record<string, number> = {};
    const englishCounters: Record<string, number> = {};

    let blocks: TranslationDisplay[] = rawTranslations.map((t) => {
      const lang = (t.language_name || "").toLowerCase();
      const isUrdu = lang === "urdu";
      const isEnglish = lang === "english";
      const langKey = isUrdu ? "urdu" : isEnglish ? "english" : "default";

      // Track per-language index for color assignment
      if (!urduCounters[langKey]) urduCounters[langKey] = 0;
      const colorIdx = urduCounters[langKey]++;
      const colors = TRANSLATION_COLORS[langKey] || TRANSLATION_COLORS.default;
      const color = colors[colorIdx % colors.length];

      const cleanText = (t.text || "")
        .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim();

      return {
        id: t.resource_id,
        resourceName: t.resource_name || `Translation #${t.resource_id}`,
        languageName: t.language_name || "Unknown",
        text: cleanText,
        expanded: true, // Start expanded by default
        color,
        icon: TRANSLATION_ICONS[t.resource_id] || "document-text-outline",
      };
    });

    // Apply saved ordering
    if (this.translationOrder.length > 0) {
      blocks.sort((a, b) => {
        const orderA = this.translationOrder.find((o) => o.id === a.id);
        const orderB = this.translationOrder.find((o) => o.id === b.id);
        const posA = orderA ? orderA.position : 999;
        const posB = orderB ? orderB.position : 999;
        return posA - posB;
      });
    }

    this.translations = blocks;
  }

  getAyahOrVerseNumberFromKey(whatToGet: "surah" | "ayah", key: string) {
    const [s, a] = key.split(":");
    return parseInt(whatToGet === "surah" ? s : a);
  }

  checkIfAyahHasSajdah() {
    const [s, a] = this.verse.verse_key.split(":");
    const sajdaRef = QuranData.Sajda.find(
      (sajdah) => sajdah[0] === parseInt(s) && sajdah[1] === parseInt(a),
    );
    if (sajdaRef)
      this.sajdahMessage = `A sajdah is ${sajdaRef[2]} on this verse`;
  }

  /**
   * Save translation ordering to storage
   */
  private async saveTranslationOrder() {
    const order: TranslationOrder[] = this.translations.map((t, i) => {
      const existing = this.translationOrder.find((o) => o.id === t.id);
      return {
        id: t.id,
        visible: existing ? existing.visible : true,
        position: i,
      };
    });
    this.translationOrder = order;
    try {
      await this.storage.set(this.STORAGE_KEY_TRANS_ORDER, order);
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Load saved translation ordering from storage
   */
  private async loadTranslationOrder() {
    try {
      const saved = await this.storage.get(this.STORAGE_KEY_TRANS_ORDER);
      if (saved && Array.isArray(saved)) {
        this.translationOrder = saved;
      }
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Download morphology SVG or PNG
   * size: '1x' or '2x'
   * format: 'svg' or 'png'
   */
  downloadMorphologySvg(size: "1x" | "2x", format: "svg" | "png") {
    if (!this.svgContent) {
      console.warn("SVG content not available");
      return;
    }

    const [s, a] = this.verseKey.split(":");
    const filename = `quran-morphology-${s}-${a}-${size}.${format}`;

    if (format === "svg") {
      // Extract SVG from HTML content
      const div = document.createElement("div");
      div.innerHTML = this.svgContent as string;
      const svgElement = div.querySelector("svg");

      if (svgElement) {
        // Scale if 2x
        if (size === "2x") {
          svgElement.setAttribute(
            "width",
            (
              parseInt(svgElement.getAttribute("width") || "800") * 2
            ).toString(),
          );
          svgElement.setAttribute(
            "height",
            (
              parseInt(svgElement.getAttribute("height") || "600") * 2
            ).toString(),
          );
        }

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        this.downloadBlob(blob, filename);
      }
    } else if (format === "png") {
      const div = document.createElement("div");
      div.innerHTML = this.svgContent as string;
      const svgElement = div.querySelector("svg") as SVGSVGElement;

      if (svgElement) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = parseInt(svgElement.getAttribute("width") || "800");
        let height = parseInt(svgElement.getAttribute("height") || "600");

        if (size === "2x") {
          width *= 2;
          height *= 2;
        }

        canvas.width = width;
        canvas.height = height;

        // Ensure namespace (important for export)
        svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        // ✅ Use Blob instead of btoa (Unicode safe)
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });

        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              this.downloadBlob(blob, filename);
            }
          }, "image/png");

          URL.revokeObjectURL(url);
        };

        img.src = url;
      }
    }
  }

  /**
   * Helper to download blob as file
   */
  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  getSvgContent(verseKey: string) {
    // URL of your JSON file
    const [s, a] = verseKey.split(":");
    const url = `https://raw.githubusercontent.com/ShakesVision/quran-archive/refs/heads/master/morphology/raw_svg/${s}/${a}.json`;

    this.httpClient.get<{ data: string }>(url).subscribe({
      next: (res) => {
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(
          res.data,
        ) as string;
      },
      error: (err) => console.error("Failed to load SVG JSON:", err),
    });
  }
}
