import { Injectable } from "@angular/core";
import { QuranData } from "src/assets/data/quran-data";

export type JuzQuarter = "begin" | "rub" | "nisf" | "thalatha";

export interface AyahRef {
  surah: number;
  ayah: number;
}

@Injectable({ providedIn: "root" })
export class HizbNavigationService {
  /** Ayah-precise quarter within a juz (begin, 1/4, 1/2, 3/4). */
  getJuzQuarterAyah(juz: number, quarter: JuzQuarter): AyahRef | null {
    if (juz < 1 || juz > 30) return null;

    if (quarter === "begin") {
      const ref = QuranData.Juz[juz];
      if (!ref || ref.length < 2) return null;
      return { surah: ref[0], ayah: ref[1] };
    }

    const quarterIndex = this.quarterToHizbIndex(juz, quarter);
    const hizbRef = QuranData.HizbQaurter[quarterIndex];
    if (!hizbRef || hizbRef.length < 2) return null;
    return { surah: hizbRef[0], ayah: hizbRef[1] };
  }

  formatAyahKey(ref: AyahRef): string {
    return `${ref.surah}:${ref.ayah}`;
  }

  private quarterToHizbIndex(juz: number, quarter: JuzQuarter): number {
    const base = (juz - 1) * 8;
    switch (quarter) {
      case "rub":
        return base + 2;
      case "nisf":
        return base + 4;
      case "thalatha":
        return base + 6;
      default:
        return base + 1;
    }
  }
}
