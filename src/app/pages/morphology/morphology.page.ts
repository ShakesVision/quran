import { Component, OnInit } from "@angular/core";
import {
  MorphologyService,
  WordMorphology,
} from "src/app/services/morphology.service";
import { SurahService } from "src/app/services/surah.service";
import { ToastController } from "@ionic/angular";

@Component({
  selector: "app-morphology",
  templateUrl: "./morphology.page.html",
  styleUrls: ["./morphology.page.scss"],
})
export class MorphologyPage implements OnInit {
  searchQuery: string = "";
  selectedSurah: number = 1;
  selectedAyah: number = 1;
  morphologyData: WordMorphology[] = [];
  isLoading: boolean = false;
  ayahCount: number = 0;
  surahList: any[] = [];

  constructor(
    private morphologyService: MorphologyService,
    private surahService: SurahService,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.loadSurahList();
    this.loadMorphology();
  }

  /**
   * Load the list of surahs from SurahService
   */
  loadSurahList() {
    this.surahService.getSurahInfo().subscribe(
      (surahs: any[]) => {
        this.surahList = surahs;
      },
      (error) => {
        console.error("Error loading surah list:", error);
      },
    );
  }

  /**
   * Load morphology for the selected surah and ayah
   */
  async loadMorphology() {
    if (!this.selectedSurah || !this.selectedAyah) return;

    this.isLoading = true;
    try {
      this.morphologyService
        .getAyahMorphology(this.selectedSurah, this.selectedAyah)
        .subscribe(
          (data: WordMorphology[]) => {
            this.morphologyData = data;
            this.isLoading = false;

            if (data.length === 0) {
              this.showToast(
                "No morphology data available for this ayah",
                "warning",
              );
            }
          },
          (error) => {
            console.error("Error loading morphology:", error);
            this.morphologyData = [];
            this.isLoading = false;
            this.showToast("Error loading morphology data", "danger");
          },
        );
    } catch (error) {
      console.error("Error:", error);
      this.isLoading = false;
    }
  }

  /**
   * Update ayah count when surah changes
   */
  onSurahChange() {
    const selectedSurah = this.surahList.find(
      (s) => s.index === this.selectedSurah,
    );
    if (selectedSurah) {
      this.ayahCount = selectedSurah.ayahs;
      this.selectedAyah = 1; // Reset to first ayah
      this.loadMorphology();
    }
  }

  /**
   * Called when the ayah changes
   */
  onAyahChange() {
    this.loadMorphology();
  }

  /**
   * Search for morphology by entering verse key (e.g., "2:255")
   */
  searchByVerseKey() {
    const parts = this.searchQuery.split(":");
    if (parts.length !== 2) {
      this.showToast("Please use format: surah:ayah (e.g., 2:255)", "warning");
      return;
    }

    const surah = parseInt(parts[0]);
    const ayah = parseInt(parts[1]);

    if (isNaN(surah) || isNaN(ayah) || surah < 1 || surah > 114) {
      this.showToast("Invalid surah number", "warning");
      return;
    }

    this.selectedSurah = surah;
    this.onSurahChange();
    this.selectedAyah = ayah;
    this.loadMorphology();
  }

  /**
   * Get human-readable label for POS (Part of Speech)
   */
  getPosLabel(pos: string | undefined): string {
    if (!pos) return "N/A";

    const labels: Record<string, string> = {
      noun: "Noun",
      verb: "Verb",
      adjective: "Adjective",
      particle: "Particle",
      adverb: "Adverb",
      pronoun: "Pronoun",
      preposition: "Preposition",
      conjunction: "Conjunction",
    };

    return labels[pos.toLowerCase()] || pos;
  }

  /**
   * Get corpus URL for more details
   */
  getCorpusUrl(wordIndex: number): string {
    return this.morphologyService.getCorpusUrl(
      this.selectedSurah,
      this.selectedAyah,
      wordIndex,
    );
  }

  /**
   * Format feature string for display
   */
  formatFeatures(features: string | undefined): string {
    if (!features) return "N/A";
    return features
      .split(",")
      .map((f) => this.morphologyService.getFeatureLabel(f.trim()))
      .join(", ");
  }

  /**
   * Show a toast message
   */
  private showToast(message: string, color: string = "primary") {
    this.toastController
      .create({
        message,
        color,
        duration: 2000,
        position: "bottom",
      })
      .then((toast) => toast.present());
  }
}
