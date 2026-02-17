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
    return info?.name || this.surahService.surahNamesEnglish?.[num - 1] || `Surah ${num}`;
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
}
