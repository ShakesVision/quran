/**
 * Quran.com translation resource IDs.
 * Add entries here to expose more translations in the reader / tafsir modal.
 * @see docs/TRANSLATION_SOURCES.md
 */
export interface TranslationSourceConfig {
  /** Quran.com API resource_id */
  id: number;
  language: "en" | "ur" | "ar" | "other";
  name: string;
  /** Included in default verse fetch (tafsir modal, multi-translation ayah view) */
  enabledByDefault?: boolean;
  /** Used for inline translation under mushaf lines */
  inlineForLang?: "en" | "ur";
}

export const TRANSLATION_SOURCES: TranslationSourceConfig[] = [
  { id: 20, language: "en", name: "Saheeh International", enabledByDefault: true, inlineForLang: "en" },
  { id: 85, language: "en", name: "Abdel Haleem", enabledByDefault: true },
  { id: 84, language: "en", name: "Mufti Taqi Usmani (EN)", enabledByDefault: true },
  { id: 95, language: "en", name: "Maududi (EN)", enabledByDefault: true },
  { id: 22, language: "en", name: "Yusuf Ali", enabledByDefault: true },
  { id: 203, language: "en", name: "Al-Hilali & Khan", enabledByDefault: true },
  { id: 819, language: "en", name: "Wahiduddin Khan", enabledByDefault: true },
  { id: 97, language: "ur", name: "Maududi (Urdu)", enabledByDefault: true },
  { id: 54, language: "ur", name: "Junagarhi", enabledByDefault: true },
  { id: 234, language: "ur", name: "Jalandhari", enabledByDefault: true },
  { id: 151, language: "ur", name: "Tafsir E Usmani", enabledByDefault: true, inlineForLang: "ur" },
  { id: 158, language: "ur", name: "Bayan-ul-Quran", enabledByDefault: true },
  { id: 156, language: "ur", name: "Fe Zilal al-Quran", enabledByDefault: true },
  { id: 131, language: "en", name: "Clear Quran (Dr. Mustafa Khattab)" },
  { id: 57, language: "ur", name: "Ahsan ul Bayan" },
];

export function getDefaultTranslationIds(): number[] {
  return TRANSLATION_SOURCES.filter((s) => s.enabledByDefault).map((s) => s.id);
}

export function getInlineTranslationResourceId(lang: "en" | "ur"): string {
  const match = TRANSLATION_SOURCES.find((s) => s.inlineForLang === lang);
  if (match) return String(match.id);
  return lang === "ur" ? "151" : "131";
}
