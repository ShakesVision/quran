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
  isOpen: boolean = true;
  memorizeEntryForm: FormGroup;
  surahInfo: any[] = [];
  isPopoverOpen: boolean = false;
  isModalOpen: boolean = false;

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
    this.setupStorage();
    // Load juz memorization data
    this.storage.get("memorize").then((items) => {
      if (items) this.items = items.sort((a: any, b: any) => a.juz - b.juz);
    });
    // Load surah memorization data
    this.storage.get("memorize_surah").then((items) => {
      if (items) this.surahItems = items.sort((a: any, b: any) => a.surahNumber - b.surahNumber);
    });
    // Load surah info for names and ayah counts
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = res;
    });
  }

  async setupStorage() {
    await this.storage.create();
  }

  onModeChange(event: any) {
    this.trackingMode = event.detail.value;
  }

  getTotalProgress(): number {
    if (this.trackingMode === 'juz') {
      const totalPages = 611;
      const memorizedPages = this.items.reduce((sum, item) => sum + item.completed, 0);
      return Math.round((memorizedPages / totalPages) * 100);
    } else {
      const totalAyahs = 6236; // Total ayahs in Quran
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

  async add(item?) {
    const alert = await this.alertController.create({
      subHeader: item ? "Update" : "Add",
      cssClass: "custom-alert",
      inputs: [
        {
          name: "juz",
          id: "juz",
          type: "number",
          placeholder: "Juz number...",
          value: item ? item.juz : null,
          handler: (input) => {
            console.log("Inside handler:", input);
          },
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
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          ...(item
            ? {
                text: "Delete",
                handler: (data) => {
                  console.log("deleting ", data.juz);
                  this.items.splice(
                    this.items.findIndex((i: any) => i.juz === item.juz),
                    1
                  );
                  this.saveItems();
                },
                cssClass: "delete-btn",
              }
            : null),
        },
        {
          text: item ? "Update" : "Add",
          cssClass: "add-btn",
          handler: (data) => {
            console.log(data);
            if (data.juz < 0 || data.juz > 30) {
              this.toast("Invalid juz number: " + data.juz, "danger");
              return;
            }
            if (!data.juz || !data.completed) {
              this.toast(
                "Invalid entries! Both fields are required.",
                "danger"
              );
              return;
            }

            data.juz = parseInt(data.juz);
            data.completed = parseFloat(data.completed);
            data.started = item ? item.started : new Date();
            data.updated = new Date();
            console.log(
              item,
              this.items.some((i: any) => i.juz === data.juz)
            );
            if (!item && this.items.some((i: any) => i.juz === data.juz)) {
              this.toast(
                "Entry for Juz " +
                  data.juz +
                  " already exists. Please edit the existing one.",
                "danger"
              );
              return;
            }
            const totalPages = this.getJuzInfo(data.juz, "count");
            data.total = totalPages;
            console.log(data, totalPages);
            if (data.completed > totalPages) {
              this.toast(
                `Juz ${data.juz} doesn't have that many pages. (${data.completed}) It only has ${totalPages}.`,
                "danger"
              );
              return;
            }

            item
              ? (this.items[
                  this.items.findIndex((n: any) => n.juz === item.juz)
                ] = data)
              : this.items.push(data);
            console.log(data);
            //Sort
            this.items = this.items.sort((a: any, b: any) => a.juz - b.juz);
            //Save
            this.saveItems();
          },
        },
      ],
    });
    alert.present();
  }
  saveItems() {
    this.storage.set("memorize", this.items);
  }

  saveSurahItems() {
    this.storage.set("memorize_surah", this.surahItems);
  }

  async addSurah(item?: SurahItem) {
    // Get surah list for picker
    const surahOptions = this.surahInfo.map((s: any, i: number) => ({
      text: `${i + 1}. ${s.name}`,
      value: i + 1
    }));

    const alert = await this.alertController.create({
      header: item ? "Update Surah" : "Add Surah",
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
        {
          text: "Cancel",
          role: "cancel"
        },
        ...(item ? [{
          text: "Delete",
          handler: () => {
            this.surahItems = this.surahItems.filter(
              (i) => i.surahNumber !== item.surahNumber
            );
            this.saveSurahItems();
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

            // Get total ayahs for this surah
            const surahData = this.surahInfo[surahNum - 1];
            const totalAyahs = surahData?.totalAyah || this.surahService.surahAyahCounts?.[surahNum - 1] || 0;
            const surahName = surahData?.name || `Surah ${surahNum}`;

            if (completed > totalAyahs) {
              this.toast(`Surah ${surahNum} only has ${totalAyahs} ayahs.`, "danger");
              return false;
            }

            if (!item && this.surahItems.some((i) => i.surahNumber === surahNum)) {
              this.toast(`Surah ${surahNum} already exists. Edit the existing one.`, "danger");
              return false;
            }

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
            return true;
          }
        }
      ]
    });
    await alert.present();
  }
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
      console.log(e);
      this.storage.set(e.detail.data.number, e.detail.data);
      this.items.push(e.detail.data);
    }
  }
  toggle(e) {
    // console.log(e.detail.checked);
  }
  onSubmit() {
    this.modalController.dismiss(this.memorizeEntryForm.value);
  }
  dateChanged(ev) {
    console.log(ev.detail.value);
  }
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
        break;
      case "count":
        return num === this.surahService.juzPageNumbers.length
          ? 611 - this.surahService.juzPageNumbers[num - 1] + 1
          : this.surahService.juzPageNumbers[num] -
              this.surahService.juzPageNumbers[num - 1];
        break;

      default:
        return this.surahService.juzNames[num - 1];
        break;
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
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Import",
          cssClass: "import-btn-alert",
          handler: (data) => {
            try {
              const parsed = JSON.parse(data.textarea);
              // Support both old format (array) and new format (object with juz/surah)
              if (Array.isArray(parsed)) {
                // Old format - just juz data
                this.items = parsed;
                this.saveItems();
              } else {
                // New format
                if (parsed.juz) {
                  this.items = parsed.juz;
                  this.saveItems();
                }
                if (parsed.surah) {
                  this.surahItems = parsed.surah;
                  this.saveSurahItems();
                }
              }
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
