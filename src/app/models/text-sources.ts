/**
 * Text source configuration for different Quran text versions
 */

export type TextSourceType = 'archive' | 'qurancom' | 'custom';
export type MushafLines = 13 | 15 | 16;

export interface TextSource {
  id: string;
  name: string;
  nameAr: string;
  type: TextSourceType;
  linesPerPage: MushafLines;
  fontFamily: string;
  fontUrl?: string; // For custom sources
  baseUrl: string;
  description?: string;
  isDefault?: boolean;
  supportsWordTracking?: boolean; // quran.com sources support word-level tracking
}

export interface QuranComWord {
  id: number;
  position: number;
  text_indopak: string;
  text_uthmani: string;
  text_imlaei?: string;
  verse_key: string;
  page_number: number;
  line_number: number;
  location: string; // "surah:ayah:word"
  char_type_name: string;
  translation?: {
    text: string;
    language_name: string;
  };
}

export interface QuranComVerse {
  id: number;
  verse_key: string;
  verse_number: number;
  chapter_id: number;
  text_uthmani: string;
  text_indopak: string;
  hizb_number: number;
  words: QuranComWord[];
}

export interface QuranComChapterResponse {
  verses: QuranComVerse[];
  pagination?: {
    per_page: number;
    current_page: number;
    total_pages: number;
    total_records: number;
  };
}

/**
 * Pre-defined text sources
 */
export const TEXT_SOURCES: TextSource[] = [
  {
    id: 'qurancom-indopak-15',
    name: 'Quran.com IndoPak (15 Lines)',
    nameAr: 'قرآن.كوم إندوباك ١٥ سطر',
    type: 'qurancom',
    linesPerPage: 15,
    fontFamily: 'IndoPak Waqf Lazim',
    baseUrl: 'https://api.qurancdn.com/api/qdc/verses/by_page',
    description: 'Official Quran.com IndoPak text with word-level tracking',
    isDefault: true,
    supportsWordTracking: true,
  },
  {
    id: 'qurancom-indopak-16',
    name: 'Quran.com IndoPak (16 Lines)',
    nameAr: 'قرآن.كوم إندوباك ١٦ سطر',
    type: 'qurancom',
    linesPerPage: 16,
    fontFamily: 'IndoPak Waqf Lazim',
    baseUrl: 'https://api.qurancdn.com/api/qdc/verses/by_page',
    description: 'Official Quran.com IndoPak text - 16 line version',
    supportsWordTracking: true,
  },
  {
    id: 'qurancom-uthmani-15',
    name: 'Quran.com Uthmani (15 Lines)',
    nameAr: 'قرآن.كوم عثماني ١٥ سطر',
    type: 'qurancom',
    linesPerPage: 15,
    fontFamily: 'Uthmanic Hafs',
    baseUrl: 'https://api.qurancdn.com/api/qdc/verses/by_page',
    description: 'Official Quran.com Uthmani script',
    supportsWordTracking: true,
  },
  {
    id: 'archive-15',
    name: 'Archive (15 Lines)',
    nameAr: 'أرشيف ١٥ سطر',
    type: 'archive',
    linesPerPage: 15,
    fontFamily: 'Muhammadi',
    baseUrl: 'https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/15Lines',
    description: 'Original archive text with Muhammadi font',
  },
  {
    id: 'archive-16',
    name: 'Archive (16 Lines)',
    nameAr: 'أرشيف ١٦ سطر',
    type: 'archive',
    linesPerPage: 16,
    fontFamily: 'Muhammadi',
    baseUrl: 'https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/16Lines',
    description: 'Archive text - 16 line version',
  },
];

/**
 * Mushaf codes for Quran.com API
 */
export const MUSHAF_CODES = {
  INDOPAK_15: 6,
  INDOPAK_16: 7,
  UTHMANI_HAFS: 1,
  UTHMANI_SIMPLE: 2,
};

/**
 * Translation resource IDs for Quran.com API
 */
export const TRANSLATION_IDS = {
  // English
  ENGLISH_HALEEM: 85,          // M.A.S. Abdel Haleem
  ENGLISH_SAHIH: 20,           // Saheeh International
  ENGLISH_USMANI: 84,          // Mufti Taqi Usmani
  ENGLISH_PICKTHALL: 19,       // M. Pickthall
  ENGLISH_YUSUFALI: 22,        // A. Yusuf Ali
  ENGLISH_MAUDUDI: 95,         // A. Maududi (Tafhim commentary)
  ENGLISH_BRIDGES: 149,        // Fadel Soliman, Bridges' translation
  
  // Urdu
  URDU_MAUDUDI: 97,            // Tafheem e Qur'an - Syed Abu Ali Maududi
  URDU_JUNAGARHI: 54,          // Maulana Muhammad Junagarhi
  URDU_JALANDHARI: 234,        // Fatah Muhammad Jalandhari
  URDU_MAHMUD_HASAN: 151,      // Shaykh al-Hind Mahmud al-Hasan (with Tafsir E Usmani)
  URDU_ISRAR_AHMAD: 158,       // Bayan-ul-Quran (Dr. Israr Ahmad)
  URDU_QUTB: 156,              // Fe Zilal al-Qur'an (Sayyid Ibrahim Qutb)
  URDU_WAHIDUDDIN: 819,        // Maulana Wahiduddin Khan
  URDU_MAUDUDI_ROMAN: 831,     // Abul Ala Maududi (Roman Urdu)
};

/**
 * Default translations to include when downloading data
 */
export const DEFAULT_TRANSLATIONS = [
  TRANSLATION_IDS.URDU_MAUDUDI,
  TRANSLATION_IDS.URDU_JUNAGARHI,
  TRANSLATION_IDS.ENGLISH_HALEEM,
  TRANSLATION_IDS.ENGLISH_SAHIH,
  TRANSLATION_IDS.ENGLISH_USMANI,
];

/**
 * User's text source preference
 */
export interface UserSourcePreference {
  selectedSourceId: string;
  customSources: TextSource[];
  lastUsed: Date;
}

/**
 * Custom source input from user
 */
export interface CustomSourceInput {
  name: string;
  nameAr?: string;
  linesPerPage: MushafLines;
  fontFamily: string;
  fontUrl?: string; // woff/ttf URL for custom font
  baseUrl: string;  // URL to fetch data from (github raw, etc.)
  description?: string;
}

/**
 * Create a custom text source from user input
 */
export function createCustomSource(input: CustomSourceInput): TextSource {
  return {
    id: `custom-${Date.now()}`,
    name: input.name,
    nameAr: input.nameAr || input.name,
    type: 'custom',
    linesPerPage: input.linesPerPage,
    fontFamily: input.fontFamily,
    fontUrl: input.fontUrl,
    baseUrl: input.baseUrl,
    description: input.description,
    supportsWordTracking: false,
  };
}

/**
 * Get default text source
 */
export function getDefaultSource(): TextSource {
  return TEXT_SOURCES.find(s => s.isDefault) || TEXT_SOURCES[0];
}

/**
 * Find text source by ID
 */
export function findSourceById(id: string, customSources: TextSource[] = []): TextSource | undefined {
  return TEXT_SOURCES.find(s => s.id === id) || customSources.find(s => s.id === id);
}

