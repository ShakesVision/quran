import { Injectable } from "@angular/core";

export interface MushafOcrResult {
  pageNumber: number;
  linesPerPage: number;
  endsWithAyah: boolean | null;
  scannedSourceId: string;
}

const KNOWN_LINE_COUNTS = [13, 15, 16, 17, 18, 21] as const;

/** Map detected line count to scanned mushaf id (and reader archive when available). */
const LINE_TO_SCANNED: Record<number, string> = {
  13: "13-taj",
  15: "15-saudi",
  16: "16-darussalam",
  17: "17-taj",
  18: "18-taj",
  21: "21-taj",
};

const MUSHAF_MAX_PAGES: Record<number, number> = {
  13: 850,
  15: 611,
  16: 548,
  17: 520,
  18: 490,
  21: 410,
};

@Injectable({ providedIn: "root" })
export class MushafOcrService {
  async analyzePage(file: File): Promise<MushafOcrResult | null> {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ara");

    try {
      const [fullData, headerData, footerData] = await Promise.all([
        worker.recognize(file),
        worker.recognize(
          await this.cropBitmap(bitmap, {
            x: Math.floor(width * 0.2),
            y: 0,
            w: Math.floor(width * 0.6),
            h: Math.floor(height * 0.14),
          }),
        ),
        worker.recognize(
          await this.cropBitmap(bitmap, {
            x: Math.floor(width * 0.05),
            y: Math.floor(height * 0.88),
            w: Math.floor(width * 0.9),
            h: Math.floor(height * 0.1),
          }),
        ),
      ]);

      const lineCount = this.countTextLines(fullData.data, height);
      const linesPerPage = this.snapLineCount(lineCount);
      if (!linesPerPage) return null;

      const pageFromHeader = this.extractPageNumber(headerData.data.text || "");
      const pageFromFull = this.extractPageNumber(fullData.data.text || "");
      const pageNumber = this.pickPageNumber(
        pageFromHeader ?? pageFromFull,
        linesPerPage,
      );
      if (!pageNumber) return null;

      const endsWithAyah =
        linesPerPage === 15
          ? this.footerEndsWithAyah(footerData.data.text || "")
          : null;

      const scannedSourceId = LINE_TO_SCANNED[linesPerPage] || "15-saudi";

      return {
        pageNumber,
        linesPerPage,
        endsWithAyah,
        scannedSourceId,
      };
    } finally {
      await worker.terminate();
      bitmap.close();
    }
  }

  hasReaderArchive(linesPerPage: number): boolean {
    return linesPerPage === 15 || linesPerPage === 16;
  }

  private async cropBitmap(
    bitmap: ImageBitmap,
    region: { x: number; y: number; w: number; h: number },
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = region.w;
    canvas.height = region.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(
      bitmap,
      region.x,
      region.y,
      region.w,
      region.h,
      0,
      0,
      region.w,
      region.h,
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))));
    });
  }

  /** Cluster OCR word boxes into horizontal text lines. */
  private countTextLines(data: TesseractData, imgHeight: number): number {
    const words = (data.words || []).filter(
      (w) => w.text?.trim() && (w.confidence ?? 0) > 20,
    );
    if (!words.length) {
      return (data.lines || []).filter((l) => {
        const y = l.bbox.y0;
        return y > imgHeight * 0.12 && y < imgHeight * 0.9 && l.text?.trim();
      }).length;
    }

    const centers = words
      .filter((w) => {
        const y = (w.bbox.y0 + w.bbox.y1) / 2;
        return y > imgHeight * 0.12 && y < imgHeight * 0.9;
      })
      .map((w) => (w.bbox.y0 + w.bbox.y1) / 2)
      .sort((a, b) => a - b);

    if (!centers.length) return 0;

    const threshold = imgHeight * 0.028;
    const clusters: number[] = [];
    for (const y of centers) {
      const match = clusters.find((c) => Math.abs(c - y) < threshold);
      if (match === undefined) clusters.push(y);
    }
    return clusters.length;
  }

  private snapLineCount(count: number): number | null {
    if (count < 10) return null;
    let best: (typeof KNOWN_LINE_COUNTS)[number] = KNOWN_LINE_COUNTS[0];
    let bestDiff = Math.abs(count - best);
    for (const k of KNOWN_LINE_COUNTS) {
      const d = Math.abs(count - k);
      if (d < bestDiff) {
        best = k;
        bestDiff = d;
      }
    }
    return bestDiff <= 2 ? best : null;
  }

  private extractPageNumber(text: string): number | null {
    const candidates: number[] = [];

    const western = text.match(/\b(\d{1,3})\b/g);
    western?.forEach((n) => {
      const v = parseInt(n, 10);
      if (v >= 1 && v <= 999) candidates.push(v);
    });

    const eastern = text.match(/[۰-۹٠-٩]{1,3}/g);
    eastern?.forEach((raw) => {
      const normalized = raw
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      const v = parseInt(normalized, 10);
      if (v >= 1 && v <= 999) candidates.push(v);
    });

    if (!candidates.length) return null;

    // Page number is usually the largest plausible value in the header crop.
    const plausible = candidates.filter((n) => n >= 2 && n <= 850);
    if (!plausible.length) return candidates[candidates.length - 1];
    return plausible.sort((a, b) => b - a)[0];
  }

  private pickPageNumber(
    page: number | null,
    linesPerPage: number,
  ): number | null {
    if (!page) return null;
    const maxPages = MUSHAF_MAX_PAGES[linesPerPage] || 999;
    if (page < 1 || page > maxPages) return null;
    return page;
  }

  private footerEndsWithAyah(text: string): boolean {
    return /۝|۩|٠|۰|\d/.test(text);
  }
}

interface TesseractBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractWord {
  text?: string;
  confidence?: number;
  bbox: TesseractBBox;
}

interface TesseractLine {
  text?: string;
  bbox: TesseractBBox;
}

interface TesseractData {
  text?: string;
  words?: TesseractWord[];
  lines?: TesseractLine[];
}
