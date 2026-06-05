import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { SurahService } from "../../services/surah.service";

export interface MemorizeAddResult {
  number: number;
  completed: number;
  delete?: boolean;
}

@Component({
  selector: "app-memorize-add-modal",
  templateUrl: "./memorize-add-modal.component.html",
  styleUrls: ["./memorize-add-modal.component.scss"],
})
export class MemorizeAddModalComponent implements OnInit {
  @Input() mode: "juz" | "surah" = "juz";
  @Input() isEdit = false;
  @Input() initialNumber: number | null = null;
  @Input() initialCompleted: number | null = null;

  number: number | null = null;
  completed: number | null = null;
  nameHint = "";
  totalHint = "";

  constructor(
    private modalCtrl: ModalController,
    public surahService: SurahService,
  ) {}

  ngOnInit(): void {
    this.number = this.initialNumber;
    this.completed = this.initialCompleted;
    this.updateHints();
  }

  onNumberChange(): void {
    this.updateHints();
  }

  private updateHints(): void {
    const n = Number(this.number);
    if (!n || n < 1) {
      this.nameHint = "";
      this.totalHint = "";
      return;
    }

    if (this.mode === "juz") {
      if (n > 30) {
        this.nameHint = "";
        this.totalHint = "";
        return;
      }
      this.nameHint = this.surahService.juzNames[n - 1] || `Juz ${n}`;
      this.totalHint = `${this.getJuzPageCount(n)} pages`;
    } else {
      if (n > 114) {
        this.nameHint = "";
        this.totalHint = "";
        return;
      }
      this.nameHint = this.surahService.surahNames[n - 1] || `Surah ${n}`;
      this.totalHint = `${this.surahService.surahAyahCounts[n - 1] || "?"} ayahs`;
    }
  }

  private getJuzPageCount(juz: number): number {
    const starts = this.surahService.juzPageNumbers;
    const start = starts[juz - 1];
    const end = starts[juz] || 612;
    return end - start;
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  submit(): void {
    if (!this.number || this.completed === null || this.completed === undefined) {
      return;
    }
    this.modalCtrl.dismiss({
      number: Number(this.number),
      completed: Number(this.completed),
    } as MemorizeAddResult);
  }

  deleteEntry(): void {
    this.modalCtrl.dismiss({ delete: true } as MemorizeAddResult);
  }
}
