import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { ToastController } from "@ionic/angular";
import { MushafOcrService } from "../../services/mushaf-ocr.service";

@Component({
  selector: "app-camera",
  templateUrl: "./camera.page.html",
  styleUrls: ["./camera.page.scss"],
})
export class CameraPage {
  previewUrl: string | null = null;
  processing = false;
  detectedSummary: string | null = null;

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private translate: TranslateService,
    private mushafOcr: MushafOcrService,
  ) {}

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = URL.createObjectURL(file);
    this.detectedSummary = null;
    input.value = "";

    await this.analyzeAndNavigate(file);
  }

  private async analyzeAndNavigate(file: File): Promise<void> {
    this.processing = true;
    try {
      const result = await this.mushafOcr.analyzePage(file);
      if (!result) {
        await this.presentToast(
          this.translate.instant("camera.detectionFailed"),
        );
        return;
      }

      this.detectedSummary = this.translate.instant("camera.result", {
        page: result.pageNumber,
        lines: result.linesPerPage,
      });

      await this.presentToast(
        this.translate.instant("camera.opening", {
          page: result.pageNumber,
        }),
      );

      if (this.mushafOcr.hasReaderArchive(result.linesPerPage)) {
        this.router.navigate(["/quran/page", result.pageNumber], {
          queryParams: {
            source: "archive",
            lines: result.linesPerPage,
          },
        });
      } else {
        this.router.navigate(["/scanned/page", result.pageNumber], {
          queryParams: { source: result.scannedSourceId },
        });
      }
    } catch (e) {
      console.warn("[Camera] OCR failed:", e);
      await this.presentToast(this.translate.instant("camera.detectionFailed"));
    } finally {
      this.processing = false;
    }
  }

  private async presentToast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2800,
      position: "bottom",
    });
    await t.present();
  }
}
