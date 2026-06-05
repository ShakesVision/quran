import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Storage } from "@ionic/storage-angular";
import { take } from "rxjs/operators";

export type AppLanguage = "en" | "ur" | "ar";

export const APP_LANGUAGE_KEY = "appLanguage";

export const SUPPORTED_LANGUAGES: {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
];

@Injectable({ providedIn: "root" })
export class LanguageService {
  private initialized = false;
  private currentLang: AppLanguage = "en";

  constructor(
    private translate: TranslateService,
    private storage: Storage,
  ) {}

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.storage.create();
    this.translate.setDefaultLang("en");
    this.translate.addLangs(["en", "ur", "ar"]);

    const saved = (await this.storage.get(APP_LANGUAGE_KEY)) as AppLanguage | null;
    const lang = this.isValidLang(saved) ? saved : "en";
    await this.applyLanguage(lang, false);
    this.initialized = true;
  }

  getCurrentLanguage(): AppLanguage {
    return this.currentLang;
  }

  async hasSavedLanguage(): Promise<boolean> {
    await this.storage.create();
    const saved = await this.storage.get(APP_LANGUAGE_KEY);
    return this.isValidLang(saved);
  }

  async setLanguage(lang: AppLanguage, persist = true): Promise<void> {
    await this.applyLanguage(lang, persist);
  }

  private async applyLanguage(lang: AppLanguage, persist: boolean): Promise<void> {
    this.currentLang = lang;
    await this.translate.use(lang).pipe(take(1)).toPromise();
    this.applyDocumentDirection(lang);
    if (persist) {
      await this.storage.set(APP_LANGUAGE_KEY, lang);
    }
  }

  applyDocumentDirection(lang?: AppLanguage): void {
    const code = lang || this.currentLang;
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    const dir = meta?.dir || "ltr";
    const html = document.documentElement;
    html.lang = code;
    html.dir = dir;

    document.body.classList.remove("lang-en", "lang-ur", "lang-ar", "rtl-ui");
    document.body.classList.add(`lang-${code}`);
    if (dir === "rtl") {
      document.body.classList.add("rtl-ui");
    }
  }

  private isValidLang(lang: unknown): lang is AppLanguage {
    return lang === "en" || lang === "ur" || lang === "ar";
  }
}
