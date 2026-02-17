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

interface DailyLog {
  date: string; // YYYY-MM-DD
  pages: number;
  ayahs: number;
}

interface WeekDay {
  label: string;
  short: string;
  pages: number;
  ayahs: number;
}

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage {
  loading = false;
  currentMushaf: MushafOption | null = null;

  // ── Daily Targets ──
  targetsEnabled = true;
  dailyPageTarget = 20;  // Default: 20 pages/day = khatm in ~30 days
  dailyAyahTarget = 5;   // Default: 5 ayahs/day memorization
  todayPages = 0;
  todayAyahs = 0;
  streakCount = 0;
  weeklyData: WeekDay[] = [];
  ramadanDaysLeft = 0;
  khatmProjection = '';
  
  get tilawatProgress(): number {
    return Math.min(100, Math.round((this.todayPages / this.dailyPageTarget) * 100));
  }
  get hifzProgress(): number {
    return Math.min(100, Math.round((this.todayAyahs / this.dailyAyahTarget) * 100));
  }

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

  /**
   * Open the last-used mushaf directly (no selector)
   */
  openLastMushaf() {
    const mushaf = this.currentMushaf || this.mushafOptions[0];
    this.router.navigate(['/quran'], {
      queryParams: { source: mushaf.id }
    });
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

    // Load daily targets data
    this.loadTargets();

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

  // ═════════════════════════════════════════════
  // DAILY TARGETS
  // ═════════════════════════════════════════════

  private async loadTargets() {
    // Load settings
    const settings = await this.storage.get('daily_targets_settings');
    if (settings) {
      this.dailyPageTarget = settings.pages || 20;
      this.dailyAyahTarget = settings.ayahs || 5;
      this.targetsEnabled = settings.enabled !== false;
    }

    // Load today's log
    const todayKey = this.getTodayKey();
    const log: DailyLog = await this.storage.get(`daily_log_${todayKey}`);
    if (log) {
      this.todayPages = log.pages || 0;
      this.todayAyahs = log.ayahs || 0;
    }

    // Load streak
    await this.calculateStreak();

    // Build weekly heatmap
    await this.buildWeeklyData();

    // Ramadan projection
    this.calculateRamadan();
  }

  private getTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  async logReading() {
    const alert = await this.alertController.create({
      header: 'Log Tilawat',
      message: `How many pages did you read? (Target: ${this.dailyPageTarget})`,
      inputs: [{
        name: 'pages',
        type: 'number',
        placeholder: 'Pages read',
        min: 1,
        max: 100,
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log',
          handler: async (data) => {
            const pages = parseInt(data.pages);
            if (pages > 0) {
              this.todayPages += pages;
              await this.saveTodayLog();
              await this.updateStreak();
              if (this.tilawatProgress >= 100) {
                this.showCompletionToast('Tilawat target complete! MashaAllah!');
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async logMemorization() {
    const alert = await this.alertController.create({
      header: 'Log Hifz',
      message: `How many ayahs did you memorize? (Target: ${this.dailyAyahTarget})`,
      inputs: [{
        name: 'ayahs',
        type: 'number',
        placeholder: 'Ayahs memorized',
        min: 1,
        max: 50,
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log',
          handler: async (data) => {
            const ayahs = parseInt(data.ayahs);
            if (ayahs > 0) {
              this.todayAyahs += ayahs;
              await this.saveTodayLog();
              await this.updateStreak();
              if (this.hifzProgress >= 100) {
                this.showCompletionToast('Hifz target complete! Excellent!');
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async editTargets() {
    const alert = await this.alertController.create({
      header: 'Set Daily Targets',
      message: 'Configure your daily reading and memorization goals.',
      inputs: [
        {
          name: 'pages',
          type: 'number',
          placeholder: 'Daily pages target',
          value: this.dailyPageTarget,
          min: 1,
        },
        {
          name: 'ayahs',
          type: 'number',
          placeholder: 'Daily ayahs target',
          value: this.dailyAyahTarget,
          min: 1,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Disable',
          cssClass: 'alert-button-danger',
          handler: async () => {
            this.targetsEnabled = false;
            await this.storage.set('daily_targets_settings', {
              pages: this.dailyPageTarget,
              ayahs: this.dailyAyahTarget,
              enabled: false,
            });
          },
        },
        {
          text: 'Save',
          handler: async (data) => {
            this.dailyPageTarget = parseInt(data.pages) || 20;
            this.dailyAyahTarget = parseInt(data.ayahs) || 5;
            this.targetsEnabled = true;
            await this.storage.set('daily_targets_settings', {
              pages: this.dailyPageTarget,
              ayahs: this.dailyAyahTarget,
              enabled: true,
            });
            this.calculateRamadan();
          },
        },
      ],
    });
    await alert.present();
  }

  private async saveTodayLog() {
    const todayKey = this.getTodayKey();
    await this.storage.set(`daily_log_${todayKey}`, {
      date: todayKey,
      pages: this.todayPages,
      ayahs: this.todayAyahs,
    } as DailyLog);
  }

  private async calculateStreak() {
    let streak = 0;
    const today = new Date();
    // Check backwards from yesterday
    for (let i = 1; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      const log: DailyLog = await this.storage.get(`daily_log_${key}`);
      if (log && log.pages > 0) {
        streak++;
      } else {
        break;
      }
    }
    // If today has pages, count today too
    if (this.todayPages > 0) streak++;
    this.streakCount = streak;
  }

  private async updateStreak() {
    await this.calculateStreak();
  }

  private async buildWeeklyData() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.weeklyData = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOfWeek + i);
      const key = this.getDateKey(d);
      const log: DailyLog = await this.storage.get(`daily_log_${key}`);
      this.weeklyData.push({
        label: fullDays[i],
        short: days[i],
        pages: log?.pages || 0,
        ayahs: log?.ayahs || 0,
      });
    }
  }

  private calculateRamadan() {
    // Ramadan 2026 approx: Feb 18 - Mar 19 (adjust based on moon sighting)
    const ramadanStart = new Date(2026, 1, 18); // Feb 18, 2026
    const ramadanEnd = new Date(2026, 2, 19);   // Mar 19, 2026
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today >= ramadanStart && today <= ramadanEnd) {
      const msPerDay = 1000 * 60 * 60 * 24;
      this.ramadanDaysLeft = Math.ceil((ramadanEnd.getTime() - today.getTime()) / msPerDay);

      // Calculate khatm projection
      const totalPages = 604; // approx mushaf pages
      const daysElapsed = Math.ceil((today.getTime() - ramadanStart.getTime()) / msPerDay) + 1;
      const avgPerDay = this.todayPages > 0
        ? (this.todayPages / 1) // just today for now, ideally average over days
        : this.dailyPageTarget;
      const projectedTotal = avgPerDay * (daysElapsed + this.ramadanDaysLeft);
      const khatms = (projectedTotal / totalPages).toFixed(1);
      this.khatmProjection = `On pace for ${khatms} khatm${parseFloat(khatms) !== 1 ? 's' : ''}`;
    } else if (today < ramadanStart) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntil = Math.ceil((ramadanStart.getTime() - today.getTime()) / msPerDay);
      this.ramadanDaysLeft = 0; // Not in Ramadan yet
      this.khatmProjection = `Ramadan starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
      // Show the projection banner anyway when close
      if (daysUntil <= 7) {
        this.ramadanDaysLeft = 30; // Show it with full month
      }
    } else {
      this.ramadanDaysLeft = 0;
    }
  }

  private async showCompletionToast(message: string) {
    const alert = await this.alertController.create({
      header: 'MashaAllah!',
      message,
      buttons: ['Alhamdulillah'],
      cssClass: 'completion-alert',
    });
    await alert.present();
  }
}
