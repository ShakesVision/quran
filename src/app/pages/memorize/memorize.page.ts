import { Component, OnInit, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import {
  AlertController,
  IonModal,
  ModalController,
  PopoverController,
  ToastController,
} from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { Observable, Subject } from "rxjs";
import { SurahService } from "src/app/services/surah.service";
import { ProgressPage } from "../progress/progress.page";

interface JuzItem {
  juz: number;
  completed: number;
  total: number;
  started: Date;
  updated: Date;
}

interface SurahItem {
  surahNumber: number;
  surahName: string;
  completed: number;
  total: number;
  started: Date;
  updated: Date;
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  earned: boolean;
  condition: () => boolean;
}

interface ReviewItem {
  type: 'juz' | 'surah';
  id: number;
  label: string;
  lastReviewed: Date;
  intervalDays: number; // spaced repetition interval
  intervalLabel: string;
  nextReview: Date;
}

interface ReviewHeatmapDay {
  short: string;
  label: string;
  count: number;
}

@Component({
  selector: "app-memorize",
  templateUrl: "./memorize.page.html",
  styleUrls: ["./memorize.page.scss"],
})
export class MemorizePage implements OnInit {
  @ViewChild(IonModal) modal: IonModal;
  items: JuzItem[] = [];
  surahItems: SurahItem[] = [];
  trackingMode: 'juz' | 'surah' = 'juz';
  recommendedChapters = ["الفاتحہ", "یس", "رحمن", "واقعہ", "ملک", "کہف"];
  recommendedExpanded = false;
  isOpen: boolean = true;
  memorizeEntryForm: FormGroup;
  surahInfo: any[] = [];
  isPopoverOpen: boolean = false;
  isModalOpen: boolean = false;

  // Gamification
  justCompleted: number | null = null;
  justCompletedSurah: number | null = null;
  showConfetti = false;
  confettiPieces: { x: number; delay: number; color: string }[] = [];
  streakCount = 0;

  // Spaced Repetition & Review
  dueForReview: ReviewItem[] = [];
  reviewHeatmap: ReviewHeatmapDay[] = [];
  Math = Math; // Expose for template

  // Progress ring
  ringCircumference = 2 * Math.PI * 52; // 52 is the radius
  get ringOffset(): number {
    const progress = this.getTotalProgress() / 100;
    return this.ringCircumference * (1 - progress);
  }

  // Motivational quotes
  private quotes = [
    "Whoever reads a letter from the Book of Allah, he will have a reward.",
    "The best among you are those who learn the Quran and teach it.",
    "Indeed, this Quran guides to that which is most suitable.",
    "Verily, with hardship, there is relief.",
    "Read! And your Lord is the Most Generous.",
    "So remember Me; I will remember you.",
    "Allah does not burden a soul beyond that it can bear.",
    "Consistency is key – even a few ayahs a day add up!",
    "Every page you memorize is a step closer to Jannah.",
    "Keep going, you're doing amazing!",
  ];
  motivationalQuote = '';

  // Badges
  earnedBadges: Badge[] = [];

  constructor(
    private storage: Storage,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    public formBuilder: FormBuilder,
    private surahService: SurahService,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    this.motivationalQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
    this.setupStorage();
    // Load juz memorization data
    this.storage.get("memorize").then((items) => {
      if (items) this.items = items.sort((a: any, b: any) => a.juz - b.juz);
      this.updateBadges();
    });
    // Load surah memorization data
    this.storage.get("memorize_surah").then((items) => {
      if (items) this.surahItems = items.sort((a: any, b: any) => a.surahNumber - b.surahNumber);
      this.updateBadges();
    });
    // Load surah info for names and ayah counts
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = res;
    });
    // Load spaced repetition review data and heatmap
    setTimeout(() => {
      this.loadDueForReview();
      this.buildReviewHeatmap();
    }, 500);

    // Load streak
    this.storage.get("memorize_streak").then((streak) => {
      if (streak) {
        const lastDate = new Date(streak.lastDate);
        const today = new Date();
        const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 1) {
          this.streakCount = 0;
          this.storage.set("memorize_streak", { count: 0, lastDate: today.toISOString() });
        } else {
          this.streakCount = streak.count || 0;
        }
      }
    });
  }

  async setupStorage() {
    await this.storage.create();
  }

  onModeChange(event: any) {
    this.trackingMode = event.detail.value;
  }

  // ═══════════════════════════════════════════
  // Gamification helpers
  // ═══════════════════════════════════════════

  getLevel(): number {
    const progress = this.getTotalProgress();
    if (progress >= 100) return 10;
    if (progress >= 80) return 9;
    if (progress >= 60) return 8;
    if (progress >= 45) return 7;
    if (progress >= 30) return 6;
    if (progress >= 20) return 5;
    if (progress >= 12) return 4;
    if (progress >= 6) return 3;
    if (progress >= 2) return 2;
    return 1;
  }

  getLevelTitle(): string {
    const titles = [
      'Beginner', 'Learner', 'Seeker', 'Reciter',
      'Memorizer', 'Scholar', 'Hafiz-in-training',
      'Advanced', 'Master', 'Hafiz'
    ];
    return titles[this.getLevel() - 1] || 'Beginner';
  }

  getStreak(): number {
    return this.streakCount;
  }

  async updateStreak() {
    let streak = await this.storage.get("memorize_streak") || { count: 0, lastDate: null };
    const today = new Date().toDateString();
    const lastDate = streak.lastDate ? new Date(streak.lastDate).toDateString() : null;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate === yesterday.toDateString()) {
        streak.count++;
      } else {
        streak.count = 1;
      }
      streak.lastDate = new Date().toISOString();
      await this.storage.set("memorize_streak", streak);
    }
    this.streakCount = streak.count;
  }

  async resetStreak() {
    await this.storage.set("memorize_streak", { count: 0, lastDate: new Date().toISOString() });
    this.toast("Streak reset", "medium");
    this.popoverDismiss();
  }

  getCompletedCount(): number {
    if (this.trackingMode === 'juz') {
      return this.items.filter(i => i.completed === i.total).length;
    }
    return this.surahItems.filter(i => i.completed === i.total).length;
  }

  getInProgressCount(): number {
    if (this.trackingMode === 'juz') {
      return this.items.filter(i => i.completed > 0 && i.completed < i.total).length;
    }
    return this.surahItems.filter(i => i.completed > 0 && i.completed < i.total).length;
  }

  updateBadges() {
    this.earnedBadges = [
      {
        id: 'first_juz', name: 'First Juz', emoji: '📖',
        earned: this.items.some(i => i.completed === i.total),
        condition: () => this.items.some(i => i.completed === i.total)
      },
      {
        id: 'five_juz', name: '5 Juz', emoji: '🌟',
        earned: this.items.filter(i => i.completed === i.total).length >= 5,
        condition: () => this.items.filter(i => i.completed === i.total).length >= 5
      },
      {
        id: 'ten_juz', name: '10 Juz', emoji: '🏆',
        earned: this.items.filter(i => i.completed === i.total).length >= 10,
        condition: () => this.items.filter(i => i.completed === i.total).length >= 10
      },
      {
        id: 'half_quran', name: 'Half Quran', emoji: '🎯',
        earned: this.getTotalProgress() >= 50,
        condition: () => this.getTotalProgress() >= 50
      },
      {
        id: 'hafiz', name: 'Hafiz!', emoji: '👑',
        earned: this.getTotalProgress() >= 100,
        condition: () => this.getTotalProgress() >= 100
      },
      {
        id: 'first_surah', name: 'First Surah', emoji: '📝',
        earned: this.surahItems.some(i => i.completed === i.total),
        condition: () => this.surahItems.some(i => i.completed === i.total)
      },
    ].filter(b => b.earned);
  }

  triggerConfetti() {
    const colors = ['#FFD700', '#43A047', '#2196F3', '#E91E63', '#FF9800', '#9C27B0'];
    this.confettiPieces = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 600,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    this.showConfetti = true;
    setTimeout(() => this.showConfetti = false, 2500);
  }

  trackByJuz(_: number, item: JuzItem): number { return item.juz; }
  trackBySurah(_: number, item: SurahItem): number { return item.surahNumber; }

  // ═══════════════════════════════════════════
  // Progress calculations
  // ═══════════════════════════════════════════

  getTotalProgress(): number {
    if (this.trackingMode === 'juz') {
      const totalPages = 611;
      const memorizedPages = this.items.reduce((sum, item) => sum + item.completed, 0);
      return Math.round((memorizedPages / totalPages) * 100);
    } else {
      const totalAyahs = 6236;
      const memorizedAyahs = this.surahItems.reduce((sum, item) => sum + item.completed, 0);
      return Math.round((memorizedAyahs / totalAyahs) * 100);
    }
  }

  getTotalMemorized(): number {
    if (this.trackingMode === 'juz') {
      return this.items.reduce((sum, item) => sum + item.completed, 0);
    } else {
      return this.surahItems.reduce((sum, item) => sum + item.completed, 0);
    }
  }

  // ═══════════════════════════════════════════
  // Juz CRUD
  // ═══════════════════════════════════════════

  async add(item?) {
    const juzNameHint = item ? `${this.getJuzNameByNumber(item.juz)}` : '';
    const alert = await this.alertController.create({
      subHeader: item ? "Update" : "Add",
      message: juzNameHint || 'Enter juz number to see its name',
      cssClass: "custom-alert",
      inputs: [
        {
          name: "juz",
          id: "juz",
          type: "number",
          placeholder: "Juz number...",
          value: item ? item.juz : null,
        },
        {
          name: "completed",
          id: "completed",
          type: "number",
          placeholder: "Pages memorized...",
          value: item ? item.completed : null,
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          ...(item
            ? {
                text: "Delete",
                handler: (data) => {
                  this.items.splice(
                    this.items.findIndex((i: any) => i.juz === item.juz), 1
                  );
                  this.saveItems();
                  this.updateBadges();
                },
                cssClass: "delete-btn",
              }
            : null),
        },
        {
          text: item ? "Update" : "Add",
          cssClass: "add-btn",
          handler: (data) => {
            if (data.juz < 0 || data.juz > 30) {
              this.toast("Invalid juz number: " + data.juz, "danger");
              return;
            }
            if (!data.juz || !data.completed) {
              this.toast("Invalid entries! Both fields are required.", "danger");
              return;
            }

            data.juz = parseInt(data.juz);
            data.completed = parseFloat(data.completed);
            data.started = item ? item.started : new Date();
            data.updated = new Date();

            if (!item && this.items.some((i: any) => i.juz === data.juz)) {
              this.toast("Entry for Juz " + data.juz + " already exists.", "danger");
              return;
            }

            const totalPages = this.getJuzInfo(data.juz, "count");
            data.total = totalPages;
            if (data.completed > totalPages) {
              this.toast(`Juz ${data.juz} only has ${totalPages} pages.`, "danger");
              return;
            }

            const wasComplete = item && item.completed === item.total;

            item
              ? (this.items[this.items.findIndex((n: any) => n.juz === item.juz)] = data)
              : this.items.push(data);

            this.items = this.items.sort((a: any, b: any) => a.juz - b.juz);
            this.saveItems();
            this.updateStreak();
            this.updateBadges();

            // Check if just completed
            if (data.completed === data.total && !wasComplete) {
              this.justCompleted = data.juz;
              this.triggerConfetti();
              this.toast("🎉 MashaAllah! Juz " + data.juz + " completed!", "success");
              setTimeout(() => this.justCompleted = null, 3000);
            }
          },
        },
      ],
    });
    await alert.present();

    // Dynamically update the alert message to show juz name as user types
    const juzInput = document.querySelector('ion-alert input[name="juz"]') as HTMLInputElement;
    if (juzInput) {
      juzInput.addEventListener('input', () => {
        const num = parseInt(juzInput.value);
        const msgEl = document.querySelector('ion-alert .alert-message') as HTMLElement;
        if (msgEl && num >= 1 && num <= 30) {
          const name = this.getJuzNameByNumber(num);
          const pages = this.getJuzInfo(num, 'count');
          msgEl.textContent = `${name} — ${pages} pages`;
        } else if (msgEl) {
          msgEl.textContent = 'Enter juz number to see its name';
        }
      });
    }
  }

  saveItems() {
    this.storage.set("memorize", this.items);
  }

  saveSurahItems() {
    this.storage.set("memorize_surah", this.surahItems);
  }

  // ═══════════════════════════════════════════
  // Surah CRUD
  // ═══════════════════════════════════════════

  getSurahNameByNumber(num: number): string {
    if (num < 1 || num > 114) return '';
    const info = this.surahInfo[num - 1];
    return info?.name || this.surahService.surahNames?.[num - 1] || `Surah ${num}`;
  }

  getJuzNameByNumber(num: number): string {
    if (num < 1 || num > 30) return '';
    return this.surahService.juzNames?.[num - 1] || `Juz ${num}`;
  }

  async addSurah(item?: SurahItem) {
    const surahNameHint = item ? `${this.getSurahNameByNumber(item.surahNumber)}` : '';
    const alert = await this.alertController.create({
      header: item ? "Update Surah" : "Add Surah",
      message: surahNameHint || 'Enter surah number to see its name',
      cssClass: "custom-alert",
      inputs: [
        {
          name: "surahNumber",
          type: "number",
          placeholder: "Surah number (1-114)",
          value: item ? item.surahNumber : null,
          min: 1,
          max: 114
        },
        {
          name: "completed",
          type: "number",
          placeholder: "Ayahs memorized...",
          value: item ? item.completed : null,
          min: 0
        }
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        ...(item ? [{
          text: "Delete",
          handler: () => {
            this.surahItems = this.surahItems.filter(
              (i) => i.surahNumber !== item.surahNumber
            );
            this.saveSurahItems();
            this.updateBadges();
          },
          cssClass: "delete-btn"
        }] : []),
        {
          text: item ? "Update" : "Add",
          cssClass: "add-btn",
          handler: (data) => {
            const surahNum = parseInt(data.surahNumber);
            const completed = parseInt(data.completed);

            if (surahNum < 1 || surahNum > 114) {
              this.toast("Invalid surah number (1-114)", "danger");
              return false;
            }
            if (!data.surahNumber || completed === undefined || completed < 0) {
              this.toast("Both fields are required!", "danger");
              return false;
            }

            const surahData = this.surahInfo[surahNum - 1];
            const totalAyahs = surahData?.totalAyah || this.surahService.surahAyahCounts?.[surahNum - 1] || 0;
            const surahName = surahData?.name || `Surah ${surahNum}`;

            if (completed > totalAyahs) {
              this.toast(`Surah ${surahNum} only has ${totalAyahs} ayahs.`, "danger");
              return false;
            }
            if (!item && this.surahItems.some((i) => i.surahNumber === surahNum)) {
              this.toast(`Surah ${surahNum} already exists.`, "danger");
              return false;
            }

            const wasComplete = item && item.completed === item.total;
            const newItem: SurahItem = {
              surahNumber: surahNum,
              surahName: surahName,
              completed: completed,
              total: totalAyahs,
              started: item?.started || new Date(),
              updated: new Date()
            };

            if (item) {
              const index = this.surahItems.findIndex((i) => i.surahNumber === item.surahNumber);
              this.surahItems[index] = newItem;
            } else {
              this.surahItems.push(newItem);
            }

            this.surahItems.sort((a, b) => a.surahNumber - b.surahNumber);
            this.saveSurahItems();
            this.updateStreak();
            this.updateBadges();

            if (completed === totalAyahs && !wasComplete) {
              this.justCompletedSurah = surahNum;
              this.triggerConfetti();
              this.toast("🎉 MashaAllah! Surah " + surahName + " completed!", "success");
              setTimeout(() => this.justCompletedSurah = null, 3000);
            }
            return true;
          }
        }
      ]
    });
    await alert.present();

    // Dynamically update the alert message to show surah name as user types
    const surahInput = document.querySelector('ion-alert input[name="surahNumber"]') as HTMLInputElement;
    if (surahInput) {
      surahInput.addEventListener('input', () => {
        const num = parseInt(surahInput.value);
        const msgEl = document.querySelector('ion-alert .alert-message') as HTMLElement;
        if (msgEl && num >= 1 && num <= 114) {
          const name = this.getSurahNameByNumber(num);
          const totalAyahs = this.surahInfo[num - 1]?.totalAyah || this.surahService.surahAyahCounts?.[num - 1] || '?';
          msgEl.textContent = `${name} — ${totalAyahs} ayahs`;
        } else if (msgEl) {
          msgEl.textContent = 'Enter surah number to see its name';
        }
      });
    }
  }

  // ═══════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════

  getFormattedDate = (date) => new Date(date).toLocaleDateString();

  openModelWithItem(item) {
    this.modal.present().then();
  }
  closeModal() {
    this.isOpen = false;
    this.modalController.dismiss();
  }
  getValueFromModal(e) {
    if (e.detail.data) {
      this.storage.set(e.detail.data.number, e.detail.data);
      this.items.push(e.detail.data);
    }
  }
  toggle(e) {}
  onSubmit() {
    this.modalController.dismiss(this.memorizeEntryForm.value);
  }
  dateChanged(ev) {}

  async toast(msg, clr = "primary") {
    const t = await this.toastController.create({
      message: msg,
      color: clr,
      duration: 3000,
    });
    t.present();
  }

  getJuzInfo(num, method) {
    if (typeof num !== "number") num = parseInt(num);
    switch (method) {
      case "name":
        return this.surahService.juzNames[num - 1];
      case "count":
        return num === this.surahService.juzPageNumbers.length
          ? 611 - this.surahService.juzPageNumbers[num - 1] + 1
          : this.surahService.juzPageNumbers[num] -
              this.surahService.juzPageNumbers[num - 1];
      default:
        return this.surahService.juzNames[num - 1];
    }
  }

  export() {
    const exportData = {
      juz: this.items,
      surah: this.surahItems
    };
    window.navigator.clipboard.writeText(JSON.stringify(exportData));
    this.toast("Copied all memorization data!", "success");
    this.popoverDismiss();
  }

  async import() {
    const importAlert = await this.alertController.create({
      header: "Import",
      message: "Paste the exported JSON data. This will replace existing data.",
      inputs: [
        {
          type: "textarea",
          name: "textarea",
          placeholder: "Paste the exported JSON data here...",
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Import",
          cssClass: "import-btn-alert",
          handler: (data) => {
            try {
              const parsed = JSON.parse(data.textarea);
              if (Array.isArray(parsed)) {
                this.items = parsed;
                this.saveItems();
              } else {
                if (parsed.juz) {
                  this.items = parsed.juz;
                  this.saveItems();
                }
                if (parsed.surah) {
                  this.surahItems = parsed.surah;
                  this.saveSurahItems();
                }
              }
              this.updateBadges();
              this.toast("Data imported successfully!", "success");
            } catch (e) {
              this.toast("Invalid JSON data", "danger");
            }
          },
        },
      ],
    });
    importAlert.present();
    this.popoverDismiss();
  }

  async popoverDismiss() {
    await this.popoverController.dismiss();
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

  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverDismiss();
  }

  // ═══════════════════════════════════════════
  // SPACED REPETITION / REVIEW SYSTEM
  // ═══════════════════════════════════════════

  /**
   * Spaced repetition intervals based on Ebbinghaus forgetting curve:
   * 1 day → 3 days → 7 days → 14 days → 30 days → 60 days (mastered)
   */
  private REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

  /**
   * Get mastery level based on how many review cycles completed.
   * Stored as reviewCount in the item's updated metadata.
   */
  getMasteryLevel(item: JuzItem | SurahItem): string {
    const progress = 'total' in item ? item.completed / item.total : 0;
    if (progress === 0) return 'new';
    if (progress < 1) return 'learning';

    // For completed items, check review history
    const daysSinceUpdate = this.daysSince(new Date(item.updated));
    if (daysSinceUpdate > 30) return 'reviewing'; // needs review
    return 'mastered';
  }

  getMasteryLabel(item: JuzItem | SurahItem): string {
    const level = this.getMasteryLevel(item);
    switch (level) {
      case 'new': return 'New';
      case 'learning': return 'Learning';
      case 'reviewing': return 'Review needed';
      case 'mastered': return 'Strong';
      default: return '';
    }
  }

  private daysSince(date: Date): number {
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate which items are due for review using spaced repetition intervals.
   */
  async loadDueForReview() {
    this.dueForReview = [];
    const now = new Date();

    // Check completed juz items
    for (const item of this.items) {
      if (item.completed < item.total) continue; // not yet completed
      const review = await this.getReviewData('juz', item.juz);
      const interval = this.REVIEW_INTERVALS[Math.min(review.cycle, this.REVIEW_INTERVALS.length - 1)];
      const nextReview = new Date(review.lastReviewed);
      nextReview.setDate(nextReview.getDate() + interval);

      if (now >= nextReview) {
        this.dueForReview.push({
          type: 'juz',
          id: item.juz,
          label: `Juz ${item.juz}`,
          lastReviewed: review.lastReviewed,
          intervalDays: interval,
          intervalLabel: this.formatInterval(interval),
          nextReview,
        });
      }
    }

    // Check completed surah items
    for (const item of this.surahItems) {
      if (item.completed < item.total) continue;
      const review = await this.getReviewData('surah', item.surahNumber);
      const interval = this.REVIEW_INTERVALS[Math.min(review.cycle, this.REVIEW_INTERVALS.length - 1)];
      const nextReview = new Date(review.lastReviewed);
      nextReview.setDate(nextReview.getDate() + interval);

      if (now >= nextReview) {
        this.dueForReview.push({
          type: 'surah',
          id: item.surahNumber,
          label: item.surahName || `Surah ${item.surahNumber}`,
          lastReviewed: review.lastReviewed,
          intervalDays: interval,
          intervalLabel: this.formatInterval(interval),
          nextReview,
        });
      }
    }

    // Sort by most overdue first
    this.dueForReview.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
  }

  private async getReviewData(type: string, id: number): Promise<{ lastReviewed: Date; cycle: number }> {
    const key = `review_${type}_${id}`;
    const data = await this.storage.get(key);
    if (data) {
      return { lastReviewed: new Date(data.lastReviewed), cycle: data.cycle || 0 };
    }
    // Default: treat completion date as last review, cycle 0
    return { lastReviewed: new Date(), cycle: 0 };
  }

  async markReviewed(item: ReviewItem) {
    const key = `review_${item.type}_${item.id}`;
    const data = await this.storage.get(key) || { cycle: 0 };
    data.cycle = (data.cycle || 0) + 1;
    data.lastReviewed = new Date().toISOString();
    await this.storage.set(key, data);

    // Remove from due list
    this.dueForReview = this.dueForReview.filter(
      (r) => !(r.type === item.type && r.id === item.id)
    );

    // Update streak
    this.updateStreak();

    // Log to heatmap
    await this.logReviewActivity();

    this.toast(`${item.label} reviewed! Next in ${this.formatInterval(
      this.REVIEW_INTERVALS[Math.min(data.cycle, this.REVIEW_INTERVALS.length - 1)]
    )}`, 'success');
  }

  private formatInterval(days: number): string {
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days === 7) return '1 week';
    if (days === 14) return '2 weeks';
    if (days === 30) return '1 month';
    if (days === 60) return '2 months';
    return `${days} days`;
  }

  // ═══════════════════════════════════════════
  // WEEKLY REVIEW HEATMAP
  // ═══════════════════════════════════════════

  async buildReviewHeatmap() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.reviewHeatmap = [];
    const today = new Date();
    const dayOfWeek = today.getDay();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOfWeek + i);
      const key = `review_activity_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = (await this.storage.get(key)) || 0;
      this.reviewHeatmap.push({
        short: days[i],
        label: fullDays[i],
        count,
      });
    }
  }

  private async logReviewActivity() {
    const d = new Date();
    const key = `review_activity_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const current = (await this.storage.get(key)) || 0;
    await this.storage.set(key, current + 1);
    await this.buildReviewHeatmap();
  }
}
