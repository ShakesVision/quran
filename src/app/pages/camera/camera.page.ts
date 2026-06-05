import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { ToastController } from "@ionic/angular";
import { SCANNED_SOURCES } from "../scanned/scanned.page";

@Component({
  selector: "app-camera",
  templateUrl: "./camera.page.html",
  styleUrls: ["./camera.page.scss"],
})
export class CameraPage {
  previewUrl: string | null = null;
  linesPerPage = 15;
  detectedPage: number | null = null;
  manualPage: number | null = null;
  processing = false;

  readonly lineOptions = [13, 15, 16, 17, 18, 21];

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.previewUrl = URL.createObjectURL(file);
    this.detectedPage = null;
    this.manualPage = null;
    await this.runOcr(file);
  }

  private async runOcr(file: File): Promise<void> {
    this.processing = true;
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("ara");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = data.text || "";
      const page = this.extractPageNumber(text);
      if (page) {
        this.detectedPage = page;
        this.manualPage = page;
      }
    } catch (e) {
      console.warn("[Camera] OCR failed:", e);
      await this.presentToast(this.translate.instant("camera.noPageFound"));
    } finally {
      this.processing = false;
    }
  }

  private extractPageNumber(text: string): number | null {
    const western = text.match(/\b(\d{1,3})\b/g);
    if (western?.length) {
      const nums = western.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 999);
      if (nums.length) return nums[nums.length - 1];
    }

    const eastern = text.match(/[۰-۹٠-٩]{1,3}/g);
    if (eastern?.length) {
      const last = eastern[eastern.length - 1];
      const normalized = last
        .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
        .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
      const n = parseInt(normalized, 10);
      if (n >= 1 && n <= 999) return n;
    }
    return null;
  }

  get resolvedPage(): number | null {
    return this.manualPage || this.detectedPage;
  }

  openInReader(): void {
    const page = this.resolvedPage;
    if (!page) return;
    const source = this.linesPerPage === 16 ? "archive-16" : "archive-15";
    this.router.navigate(["/quran/page", page], {
      queryParams: { source: "archive", lines: this.linesPerPage },
    });
  }

  openInScanned(): void {
    const page = this.resolvedPage;
    if (!page) return;
    const scannedId = this.linesPerPage === 16 ? "16-darussalam" : "15-saudi";
    this.router.navigate(["/scanned/page", page], {
      queryParams: { source: scannedId },
    });
  }

  private async presentToast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, position: "bottom" });
    await t.present();
  }
}
