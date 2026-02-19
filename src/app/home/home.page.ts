import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy } from "@angular/core";
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

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  // Psychology: variable-ratio reinforcement — some achievements are surprise unlocks
  hidden?: boolean;
}

// Psychology-based level system using mastery curve (logarithmic progression)
// Each level requires progressively more effort, but early levels are easy to reach
// (immediate reward → sustained engagement)
const LEVEL_THRESHOLDS = [
  { level: 1,  pages: 0,     title: 'Beginner',          icon: '🌱' },
  { level: 2,  pages: 20,    title: 'Seeker',            icon: '🔍' },
  { level: 3,  pages: 100,   title: 'Reader',            icon: '📖' },
  { level: 4,  pages: 300,   title: 'Devoted',           icon: '💫' },
  { level: 5,  pages: 604,   title: 'Khatm Complete',    icon: '🏆' },
  { level: 6,  pages: 1208,  title: 'Double Khatm',      icon: '⭐' },
  { level: 7,  pages: 1812,  title: 'Triple Khatm',      icon: '🌟' },
  { level: 8,  pages: 3000,  title: 'Hafiz Path',        icon: '👑' },
  { level: 9,  pages: 5000,  title: 'Scholar',           icon: '🎓' },
  { level: 10, pages: 10000, title: 'Master',            icon: '💎' },
];

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked' | 'unlockedDate'>[] = [
  // Streak-based (commitment & consistency psychology)
  { id: 'streak_3',    name: 'Consistent',       description: '3-day reading streak',           icon: '🔥' },
  { id: 'streak_7',    name: 'Weekly Warrior',    description: '7-day reading streak',           icon: '⚡' },
  { id: 'streak_30',   name: 'Monthly Master',    description: '30-day reading streak',          icon: '💪' },
  { id: 'streak_100',  name: 'Centurion',         description: '100-day reading streak',         icon: '🏅', hidden: true },
  // Volume-based (progress & mastery)
  { id: 'pages_100',   name: 'First Hundred',     description: 'Read 100 pages total',           icon: '📚' },
  { id: 'khatm_1',     name: 'First Khatm',       description: 'Complete reading the Quran',     icon: '🏆' },
  { id: 'khatm_3',     name: 'Triple Crown',      description: 'Complete 3 khatm',               icon: '👑', hidden: true },
  // Behavior-based (habit formation)
  { id: 'early_bird',  name: 'Fajr Reader',       description: 'Log reading before 6 AM',        icon: '🌅' },
  { id: 'night_owl',   name: 'Tahajjud Reader',   description: 'Log reading after 11 PM',        icon: '🌙' },
  { id: 'overachiever',name: 'Overachiever',       description: 'Exceed daily target by 2x',      icon: '🚀' },
  { id: 'target_hit',  name: 'On Target',          description: 'Hit daily target 7 days in a row', icon: '🎯' },
  // Social proof / milestone
  { id: 'first_log',   name: 'First Step',         description: 'Log your first reading',         icon: '👣' },
  { id: 'juz_complete',name: 'Juz Champion',       description: 'Read a full juz in one day',     icon: '📗' },
];

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnDestroy {
  loading = false;
  currentMushaf: MushafOption | null = null;

  // ── Daily Targets ──
  targetsEnabled = true;
  dailyPageTarget = 20;  // Default: 20 pages/day = khatm in ~30 days
  dailyAyahTarget = 5;   // Default: 5 ayahs/day memorization
  khatmTarget = 1;       // Configurable: how many khatm in the target period
  targetDays = 30;       // Target period in days (default: 30)
  todayPages = 0;
  todayAyahs = 0;
  streakCount = 0;
  weeklyData: WeekDay[] = [];
  ramadanDaysLeft = 0;
  khatmProjection = '';
  totalPagesRead = 0;    // Total pages read in current target period

  // ── Gamification ──
  achievements: Achievement[] = [];
  currentLevel = LEVEL_THRESHOLDS[0];
  nextLevel = LEVEL_THRESHOLDS[1];
  levelProgress = 0; // 0-100
  allTimePagesRead = 0;
  motivationalQuote = '';
  newAchievement: Achievement | null = null; // For popup notification
  
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
  banners: HomePageBanner[] = [];
  currentBannerIndex = 0;
  private bannerInterval: any;
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
      .subscribe((res: any) => {
        // Support both single banner object and array of banners
        const bannerArray: HomePageBanner[] = Array.isArray(res) ? res : [res];
        this.banners = bannerArray.map(b => ({
          ...b,
          text: this.domSanatizer.bypassSecurityTrustHtml(b.text as string),
        }));
        if (this.banners.length > 0) {
          this.banner = this.banners[0];
          this.currentBannerIndex = 0;
        }
        // Auto-rotate if multiple banners
        if (this.banners.length > 1) {
          this.startBannerRotation();
        }
        this.loading = false;
      });

    // Load daily targets data, then gamification
    this.loadTargets().then(() => this.loadGamification());

    // Pre-cache Quran data in background for Discover and offline use
    this.startPreCache();
  }

  ngOnDestroy() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  private startBannerRotation() {
    if (this.bannerInterval) clearInterval(this.bannerInterval);
    this.bannerInterval = setInterval(() => {
      this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
      this.banner = this.banners[this.currentBannerIndex];
    }, 5000);
  }

  goToBanner(index: number) {
    this.currentBannerIndex = index;
    this.banner = this.banners[index];
    // Reset the timer
    if (this.banners.length > 1) {
      this.startBannerRotation();
    }
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
      this.khatmTarget = settings.khatm || 1;
      this.targetDays = settings.days || 30;
      this.targetsEnabled = settings.enabled !== false;
    }

    // Load today's log
    const todayKey = this.getTodayKey();
    const log: DailyLog = await this.storage.get(`daily_log_${todayKey}`);
    if (log) {
      this.todayPages = log.pages || 0;
      this.todayAyahs = log.ayahs || 0;
    }

    // Calculate total pages read in target period
    await this.calculateTotalPagesRead();

    // Load streak
    await this.calculateStreak();

    // Build weekly heatmap
    await this.buildWeeklyData();

    // Ramadan projection
    this.calculateRamadan();
  }

  private async calculateTotalPagesRead() {
    let total = 0;
    const today = new Date();
    for (let i = 0; i < this.targetDays; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      const log: DailyLog = await this.storage.get(`daily_log_${key}`);
      if (log && log.pages > 0) {
        total += log.pages;
      }
    }
    this.totalPagesRead = total;
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
              this.allTimePagesRead += pages;
              await this.saveTodayLog();
              await this.buildWeeklyData();
              await this.storage.set('all_time_pages', this.allTimePagesRead);
              await this.updateStreak();
              this.updateLevel();
              await this.checkAndUnlockAchievements();
              this.calculateRamadan();
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
              await this.buildWeeklyData();
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
      header: 'Set Targets',
      message: 'Fields: ① Pages/day ② Ayahs/day (hifz) ③ Khatm count ④ Period (days)',
      cssClass: 'target-alert-labeled',
      inputs: [
        {
          name: 'pages',
          type: 'number',
          placeholder: '📖 Pages/day',
          value: this.dailyPageTarget,
          min: 1,
          label: 'Pages/day',
          attributes: { inputmode: 'numeric' },
        },
        {
          name: 'ayahs',
          type: 'number',
          placeholder: '🕌 Ayahs/day (hifz)',
          value: this.dailyAyahTarget,
          min: 1,
          label: 'Ayahs/day',
          attributes: { inputmode: 'numeric' },
        },
        {
          name: 'khatm',
          type: 'number',
          placeholder: '📚 Khatm target',
          value: this.khatmTarget,
          min: 1,
          label: 'Khatm target',
          attributes: { inputmode: 'numeric' },
        },
        {
          name: 'days',
          type: 'number',
          placeholder: '📅 Period (days)',
          value: this.targetDays,
          min: 1,
          label: 'Period (days)',
          attributes: { inputmode: 'numeric' },
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
              khatm: this.khatmTarget,
              days: this.targetDays,
              enabled: false,
            });
          },
        },
        {
          text: 'Save',
          handler: async (data) => {
            this.khatmTarget = parseInt(data.khatm) || 1;
            this.targetDays = parseInt(data.days) || 30;
            this.dailyAyahTarget = parseInt(data.ayahs) || 5;

            // Auto-calculate daily pages from khatm target
            const totalPages = this.currentMushaf?.pages || 604;
            const neededPerDay = Math.ceil((totalPages * this.khatmTarget) / this.targetDays);
            this.dailyPageTarget = parseInt(data.pages) || neededPerDay;

            this.targetsEnabled = true;
            await this.storage.set('daily_targets_settings', {
              pages: this.dailyPageTarget,
              ayahs: this.dailyAyahTarget,
              khatm: this.khatmTarget,
              days: this.targetDays,
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
    // Calculate khatm target projection (not Ramadan-specific)
    this.updateTargetProjection();
  }

  private updateTargetProjection() {
    const totalPages = this.currentMushaf?.pages || 604;
    const totalPagesNeeded = totalPages * this.khatmTarget;
    const pagesPerDay = Math.ceil(totalPagesNeeded / this.targetDays);

    if (this.khatmTarget >= 1) {
      this.dailyPageTarget = pagesPerDay;
      this.khatmProjection = `${this.khatmTarget} khatm in ${this.targetDays} days · ${pagesPerDay} pages/day`;
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

  // ===========================================
  // GAMIFICATION — Psychology-based engagement
  // ===========================================
  // Principles used:
  // 1. Variable-ratio reinforcement: some achievements are hidden (surprise rewards)
  // 2. Progress visualization: level bar shows incremental progress
  // 3. Loss aversion: streak count motivates daily consistency
  // 4. Endowed progress effect: first achievement is easy to get
  // 5. Social identity: titles give sense of belonging/mastery
  // 6. Motivational quotes: spiritual connection reinforces habit

  async loadGamification() {
    // Load all-time pages
    this.allTimePagesRead = (await this.storage.get('all_time_pages')) || 0;

    // Load achievements
    const saved: Achievement[] = await this.storage.get('achievements');
    if (saved) {
      this.achievements = saved;
    } else {
      this.achievements = ACHIEVEMENT_DEFS.map(a => ({ ...a, unlocked: false }));
    }

    // Calculate level
    this.updateLevel();

    // Set motivational quote
    this.setMotivationalQuote();
  }

  private updateLevel() {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.allTimePagesRead >= LEVEL_THRESHOLDS[i].pages) {
        this.currentLevel = LEVEL_THRESHOLDS[i];
        this.nextLevel = LEVEL_THRESHOLDS[i + 1] || LEVEL_THRESHOLDS[i];
        break;
      }
    }

    // Calculate progress to next level (0-100)
    if (this.currentLevel.level < LEVEL_THRESHOLDS.length) {
      const current = this.allTimePagesRead - this.currentLevel.pages;
      const needed = this.nextLevel.pages - this.currentLevel.pages;
      this.levelProgress = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100;
    } else {
      this.levelProgress = 100;
    }
  }

  async checkAndUnlockAchievements() {
    const now = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    let newUnlocks: Achievement[] = [];

    const check = (id: string, condition: boolean) => {
      const a = this.achievements.find(x => x.id === id);
      if (a && !a.unlocked && condition) {
        a.unlocked = true;
        a.unlockedDate = now;
        newUnlocks.push(a);
      }
    };

    // Check each achievement
    check('first_log', this.allTimePagesRead > 0);
    check('pages_100', this.allTimePagesRead >= 100);
    check('khatm_1', this.allTimePagesRead >= 604);
    check('khatm_3', this.allTimePagesRead >= 1812);
    check('streak_3', this.streakCount >= 3);
    check('streak_7', this.streakCount >= 7);
    check('streak_30', this.streakCount >= 30);
    check('streak_100', this.streakCount >= 100);
    check('early_bird', hour < 6 && this.todayPages > 0);
    check('night_owl', hour >= 23 && this.todayPages > 0);
    check('overachiever', this.todayPages >= this.dailyPageTarget * 2);
    check('juz_complete', this.todayPages >= 20); // ~20 pages per juz

    // Check 7-day target hit streak
    let targetStreak = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      const log: DailyLog = await this.storage.get(`daily_log_${key}`);
      if (log && log.pages >= this.dailyPageTarget) {
        targetStreak++;
      } else {
        break;
      }
    }
    check('target_hit', targetStreak >= 7);

    // Save and notify
    if (newUnlocks.length > 0) {
      await this.storage.set('achievements', this.achievements);
      // Show the first new unlock as a popup (variable-ratio reward → dopamine)
      this.newAchievement = newUnlocks[0];
      setTimeout(() => { this.newAchievement = null; }, 4000);
    }
  }

  private setMotivationalQuote() {
    const quotes = [
      { text: 'The best among you are those who learn the Quran and teach it.', source: 'Bukhari' },
      { text: 'Read the Quran, for it will come as an intercessor on the Day of Judgement.', source: 'Muslim' },
      { text: 'The one who recites the Quran fluently will be with the noble angels.', source: 'Bukhari & Muslim' },
      { text: 'Whoever reads a letter from the Book of Allah gets a reward, and each reward is multiplied tenfold.', source: 'Tirmidhi' },
      { text: 'The Quran is a proof for you or against you.', source: 'Muslim' },
      { text: 'Indeed this Quran guides to that which is most right.', source: 'Quran 17:9' },
      { text: 'And We have made the Quran easy for remembrance, so is there anyone who will remember?', source: 'Quran 54:17' },
      { text: 'Verily, in the remembrance of Allah do hearts find rest.', source: 'Quran 13:28' },
    ];
    const dayIdx = new Date().getDate() % quotes.length;
    const q = quotes[dayIdx];
    this.motivationalQuote = `"${q.text}" — ${q.source}`;
  }

  get unlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  get visibleAchievements(): Achievement[] {
    // Show unlocked ones and non-hidden locked ones (hidden ones appear only after unlock)
    return this.achievements.filter(a => a.unlocked || !a.hidden);
  }

}
