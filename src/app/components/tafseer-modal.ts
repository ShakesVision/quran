import { HttpClient } from "@angular/common/http";
import { Component, Input, OnInit } from "@angular/core";
import { AlertController, ModalController } from "@ionic/angular";
import { finalize, map } from "rxjs/operators";
import { SurahService } from "../services/surah.service";
import { QuranData } from "src/assets/data/quran-data";
import { Storage } from "@ionic/storage-angular";

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

// Color palette for translation blocks (deterministic by language + index)
const TRANSLATION_COLORS: Record<string, string[]> = {
  urdu: ['#1B5E20', '#006064', '#4E342E', '#1A237E', '#BF360C', '#33691E', '#880E4F'],
  english: ['#0D47A1', '#4A148C', '#E65100', '#1B5E20', '#880E4F', '#004D40', '#263238'],
  default: ['#37474F', '#455A64', '#546E7A', '#607D8B'],
};

// Icons for known translations
const TRANSLATION_ICONS: Record<number, string> = {
  20: 'shield-checkmark-outline',    // Saheeh International
  85: 'book-outline',                // Abdel Haleem
  84: 'school-outline',              // Mufti Taqi Usmani
  95: 'library-outline',             // Maududi English
  22: 'earth-outline',               // Yusuf Ali
  203: 'ribbon-outline',             // Al-Hilali & Khan
  97: 'library-outline',             // Maududi Urdu
  54: 'document-text-outline',       // Junagarhi
  234: 'bookmark-outline',           // Jalandhari
  151: 'layers-outline',             // Tafsir E Usmani
  158: 'bulb-outline',               // Bayan-ul-Quran (Israr Ahmad)
  156: 'leaf-outline',               // Fe Zilal al-Qur'an
  819: 'heart-outline',              // Wahiduddin Khan
};

@Component({
  selector: "tafseer-modal",
  templateUrl: "tafseer-modal.html",
  styleUrls: ["tafseer-modal.scss"],
})
export class TafseerModalComponent implements OnInit {
  @Input() verseKey: string;

  verse: any;
  audioSrc: string;
  baseurl = "https://verses.quran.com/";
  tafsir: Record<string, string | null> = { ar: null, ur: null, en: null };
  loading = false;
  sajdahMessage: string;
  isConfigMode = false;
  wbwExpanded = false;

  // Organized translation blocks
  translations: TranslationDisplay[] = [];

  // User's ordering/visibility preference
  private readonly STORAGE_KEY_TRANS_ORDER = 'ReaderTranslationOrder';
  translationOrder: TranslationOrder[] = [];

  constructor(
    private modalCtrl: ModalController,
    private httpClient: HttpClient,
    private surahService: SurahService,
    private alertController: AlertController,
    private storage: Storage
  ) {}

  async ngOnInit() {
    await this.loadTranslationOrder();
    this.fetchTrans(this.verseKey);
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }

  playWord(word: any) {
    const url = `${this.baseurl}${word.audio_url}`;
    const audio = new Audio(url);
    audio.play();
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
    if (isNaN(targetPos) || targetPos < 1 || targetPos > this.translations.length) return;
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
    const order = this.translationOrder.find(o => o.id === tr.id);
    if (order) {
      order.visible = !order.visible;
    } else {
      this.translationOrder.push({ id: tr.id, visible: false, position: this.translationOrder.length });
    }
    this.saveTranslationOrder();
  }

  /**
   * Check if translation is visible according to saved order
   */
  isVisible(tr: TranslationDisplay): boolean {
    const order = this.translationOrder.find(o => o.id === tr.id);
    return order ? order.visible : true; // visible by default
  }

  loadTafsir(lang: string) {
    this.loading = true;
    const [s, a] = this.verse.verse_key.split(":");
    const base_url = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
    let slug = "";
    switch (lang) {
      case "ar": slug = "ar-tafsir-ibn-kathir"; break;
      case "ur": slug = "ur-tafseer-ibn-e-kaseer"; break;
      case "en": slug = "en-tafsir-maarif-ul-quran"; break;
      default: slug = "ur-tafseer-ibn-e-kaseer"; break;
    }
    const url = `${base_url}/${slug}/${s}/${a}.json`;
    return this.httpClient
      .get<any>(url)
      .pipe(
        map((res) => res.text),
        finalize(() => (this.loading = false))
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
        "middle"
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
        { text: "Go", handler: (data) => { if (data.ayahKey) this.fetchTrans(data.ayahKey); } },
      ],
    });
    await alert.present();
  }

  fetchTrans(verse_key: string) {
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
            `${err.error?.status || 'Error'}: ${err.error?.error || 'Failed to load'}`,
            "danger",
            "middle"
          );
        }
      );
  }

  /**
   * Build organized, colorful translation display blocks
   */
  private buildTranslationBlocks(rawTranslations: any[]) {
    const urduCounters: Record<string, number> = {};
    const englishCounters: Record<string, number> = {};

    let blocks: TranslationDisplay[] = rawTranslations.map((t) => {
      const lang = (t.language_name || '').toLowerCase();
      const isUrdu = lang === 'urdu';
      const isEnglish = lang === 'english';
      const langKey = isUrdu ? 'urdu' : isEnglish ? 'english' : 'default';

      // Track per-language index for color assignment
      if (!urduCounters[langKey]) urduCounters[langKey] = 0;
      const colorIdx = urduCounters[langKey]++;
      const colors = TRANSLATION_COLORS[langKey] || TRANSLATION_COLORS.default;
      const color = colors[colorIdx % colors.length];

      const cleanText = (t.text || '')
        .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();

      return {
        id: t.resource_id,
        resourceName: t.resource_name || `Translation #${t.resource_id}`,
        languageName: t.language_name || 'Unknown',
        text: cleanText,
        expanded: true, // Start expanded by default
        color,
        icon: TRANSLATION_ICONS[t.resource_id] || 'document-text-outline',
      };
    });

    // Apply saved ordering
    if (this.translationOrder.length > 0) {
      blocks.sort((a, b) => {
        const orderA = this.translationOrder.find(o => o.id === a.id);
        const orderB = this.translationOrder.find(o => o.id === b.id);
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
      (sajdah) => sajdah[0] === parseInt(s) && sajdah[1] === parseInt(a)
    );
    if (sajdaRef)
      this.sajdahMessage = `A sajdah is ${sajdaRef[2]} on this verse`;
  }

  /**
   * Save translation ordering to storage
   */
  private async saveTranslationOrder() {
    const order: TranslationOrder[] = this.translations.map((t, i) => {
      const existing = this.translationOrder.find(o => o.id === t.id);
      return {
        id: t.id,
        visible: existing ? existing.visible : true,
        position: i,
      };
    });
    this.translationOrder = order;
    try {
      await this.storage.set(this.STORAGE_KEY_TRANS_ORDER, order);
    } catch (e) { /* ignore */ }
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
    } catch (e) { /* ignore */ }
  }
}
