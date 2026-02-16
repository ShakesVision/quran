import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { ActionSheetButton, ActionSheetController, AlertController, ModalController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { HomePageBanner } from "../models/common";
import { ProgressPage } from "../pages/progress/progress.page";
import { QuranDataService } from "../services/quran-data.service";

interface MushafOption {
  id: string;
  name: string;
  description: string;
  pages: number;
  source: string;
  linesPerPage: number;
}

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage {
  loading = false;
  currentMushaf: MushafOption | null = null;
  
  mushafOptions: MushafOption[] = [
    { id: 'archive-15', name: '15-Line Indopak', description: 'Saudi Mushaf Style', pages: 611, source: 'archive', linesPerPage: 15 },
    { id: 'archive-16', name: '16-Line Indopak', description: 'Pakistan/India Style', pages: 548, source: 'archive', linesPerPage: 16 },
    { id: 'qurancom-indopak-15', name: 'Quran.com 15-Line', description: 'Madani Mushaf', pages: 604, source: 'qurancom', linesPerPage: 15 },
    { id: 'qurancom-indopak-16', name: 'Quran.com 16-Line', description: 'Indopak Mushaf', pages: 548, source: 'qurancom', linesPerPage: 16 },
  ];
  
  banner: HomePageBanner = {
    text: "We are digitizing the 15 Lines Quran & translation in Unicode, which is a work in progress. You can also help us complete this project.",
    button: {
      show: true,
      text: "Contribute",
      color: "primary",
      fill: "outline",
      icon: {
        show: true,
        src: "assets/icon/hand-holding.svg",
        color: "primary",
      },
    },
    clickAction: "about",
    style: {
      boxShadow: "rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px",
      backgroundImage:
        "linear-gradient(288deg, var(--ion-color-secondary) 0%, var(--ion-color-light) 100%)",
      common: "",
    },
  };
  discoverReady = false;
  preCacheProgress = '';

  constructor(
    private alertController: AlertController,
    private modalController: ModalController,
    private actionSheetController: ActionSheetController,
    private httpClient: HttpClient,
    private domSanatizer: DomSanitizer,
    private router: Router,
    private storage: Storage,
    private quranDataService: QuranDataService
  ) {
    this.initStorage();
  }

  async initStorage() {
    await this.storage.create();
    // Load saved mushaf preference
    const savedMushaf = await this.storage.get('preferredMushaf');
    if (savedMushaf) {
      this.currentMushaf = this.mushafOptions.find(m => m.id === savedMushaf) || this.mushafOptions[0];
    } else {
      this.currentMushaf = this.mushafOptions[0]; // Default to 15-line
    }
  }

  async selectMushaf(mushaf: MushafOption) {
    this.currentMushaf = mushaf;
    await this.storage.set('preferredMushaf', mushaf.id);
    // Navigate to quran reader with the exact source ID
    this.router.navigate(['/quran'], { 
      queryParams: { 
        source: mushaf.id
      } 
    });
  }

  async openMushafSelector() {
    const buttons: ActionSheetButton[] = this.mushafOptions.map((mushaf): ActionSheetButton => ({
      text: `${mushaf.name} (${mushaf.pages} pages)`,
      cssClass: this.currentMushaf?.id === mushaf.id ? 'selected-mushaf' : '',
      handler: () => {
        this.selectMushaf(mushaf);
      }
    }));
    buttons.push({
      text: 'Cancel',
      role: 'cancel',
      cssClass: ''
    });

    const actionSheet = await this.actionSheetController.create({
      header: 'Choose Mushaf',
      buttons: buttons
    });
    await actionSheet.present();
  }

  ngOnInit() {
    this.loading = true;
    const url = `https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/App/HomePageBanner.json`;
    this.httpClient
      .get(url, { responseType: "json" })
      .subscribe((res: HomePageBanner) => {
        this.banner = res;
        this.banner.text = this.domSanatizer.bypassSecurityTrustHtml(
          res.text as string
        );
        this.loading = false;
      });

    // Pre-cache Quran data in background for Discover and offline use
    this.startPreCache();
  }

  private async startPreCache() {
    const ready = await this.quranDataService.isAyahDataReady();
    if (ready) {
      this.discoverReady = true;
      return;
    }

    this.preCacheProgress = 'Preparing Quran data...';
    try {
      await this.quranDataService.preCacheQuranData();
      this.discoverReady = true;
      this.preCacheProgress = '';
    } catch (err) {
      console.error('Pre-cache error:', err);
      this.preCacheProgress = '';
    }
  }
  async open(name) {
    const modal = await this.modalController.create({
      component: ProgressPage,
      componentProps: { name },
      swipeToClose: true,
      mode: "ios",
    });
    modal.present();
  }
  darkModeToggle() {
    document.body.classList.toggle("dark");
  }
}
