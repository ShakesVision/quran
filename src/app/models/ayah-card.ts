/**
 * Model for the "Discover" / "Ayah Flow" reel-style feature
 */

export interface AyahCard {
  /** Verse key like "2:255" */
  verseKey: string;
  /** Surah number */
  surahNumber: number;
  /** Ayah number */
  ayahNumber: number;
  /** Arabic text (indopak script) */
  arabicText: string;
  /** Urdu translation */
  urduTranslation: string;
  /** English translation */
  englishTranslation: string;
  /** Surah name in Arabic */
  surahNameAr: string;
  /** Surah name in English */
  surahNameEn: string;
  /** Visual design for this card */
  design: CardDesign;
}

export interface CardDesign {
  /** CSS gradient string for background */
  gradient: string;
  /** Overlay pattern (optional SVG) */
  pattern?: string;
  /** Text color (light or dark based on bg) */
  textColor: 'light' | 'dark';
  /** Accent color for decorative elements */
  accentColor: string;
  /** Font size class: 'large' for short ayahs, 'medium', 'small' for long ones */
  fontSizeClass: 'large' | 'medium' | 'small';
}

/**
 * Pre-defined beautiful gradient palettes
 * Each has gradient + matching text/accent colors
 */
export const CARD_PALETTES: { gradient: string; textColor: 'light' | 'dark'; accent: string }[] = [
  // Deep oceanic
  { gradient: 'linear-gradient(135deg, #0c2340 0%, #1a4a6e 50%, #2d7d9a 100%)', textColor: 'light', accent: '#7ecbd6' },
  // Royal emerald
  { gradient: 'linear-gradient(160deg, #0d3320 0%, #1a6b3c 50%, #2fa65a 100%)', textColor: 'light', accent: '#a8e6c1' },
  // Midnight purple
  { gradient: 'linear-gradient(145deg, #1a0a2e 0%, #3a1c6e 50%, #5b2d8e 100%)', textColor: 'light', accent: '#c4a8ff' },
  // Warm sunset
  { gradient: 'linear-gradient(135deg, #7b2d26 0%, #c0543a 50%, #e8845a 100%)', textColor: 'light', accent: '#ffd4b8' },
  // Gold & amber
  { gradient: 'linear-gradient(160deg, #4a3000 0%, #8a5d00 50%, #c9a227 100%)', textColor: 'light', accent: '#ffe082' },
  // Deep teal
  { gradient: 'linear-gradient(135deg, #003333 0%, #006666 50%, #009999 100%)', textColor: 'light', accent: '#80ffff' },
  // Burgundy wine
  { gradient: 'linear-gradient(150deg, #2d0a1e 0%, #6b1d4a 50%, #9e2a6e 100%)', textColor: 'light', accent: '#f0a0d0' },
  // Slate blue
  { gradient: 'linear-gradient(135deg, #1a1f3a 0%, #2d3a6a 50%, #4a5a9a 100%)', textColor: 'light', accent: '#b0c4ff' },
  // Forest earth
  { gradient: 'linear-gradient(160deg, #1a2e1a 0%, #3a5c3a 50%, #5a8a5a 100%)', textColor: 'light', accent: '#c8e6c8' },
  // Warm charcoal
  { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 50%, #3a3a5c 100%)', textColor: 'light', accent: '#d0d0ff' },
  // Crimson depths
  { gradient: 'linear-gradient(145deg, #1a0000 0%, #4a0a0a 50%, #8b1a1a 100%)', textColor: 'light', accent: '#ff8080' },
  // Ocean blue
  { gradient: 'linear-gradient(135deg, #001f3f 0%, #003366 50%, #0066cc 100%)', textColor: 'light', accent: '#66b3ff' },
  // Earthy copper
  { gradient: 'linear-gradient(160deg, #2a1810 0%, #5c3a2a 50%, #8b5e3c 100%)', textColor: 'light', accent: '#e0c0a0' },
  // Sage green
  { gradient: 'linear-gradient(135deg, #e8efe4 0%, #d4e2cc 50%, #b8d4a4 100%)', textColor: 'dark', accent: '#4a7a3a' },
  // Soft cream
  { gradient: 'linear-gradient(135deg, #fdf8f0 0%, #f5edd8 50%, #ede2c0 100%)', textColor: 'dark', accent: '#8b7340' },
  // Ice blue
  { gradient: 'linear-gradient(160deg, #e8f4f8 0%, #d0e8f0 50%, #b0d8e8 100%)', textColor: 'dark', accent: '#2a6a8a' },
  // Dusty rose light
  { gradient: 'linear-gradient(135deg, #f8e8ec 0%, #f0d0d8 50%, #e8b8c4 100%)', textColor: 'dark', accent: '#8a3a5a' },
  // Lavender mist
  { gradient: 'linear-gradient(145deg, #f0e8f8 0%, #e0d0f0 50%, #d0b8e8 100%)', textColor: 'dark', accent: '#6a3a9a' },
];

/**
 * SVG patterns for overlay textures
 */
export const CARD_PATTERNS: string[] = [
  // Subtle geometric
  `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  // Diagonal lines
  `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
  // Dots
  `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3Ccircle cx='13' cy='13' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
  // Islamic star hint
  `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='1'%3E%3Ccircle cx='40' cy='40' r='20'/%3E%3Ccircle cx='40' cy='40' r='30'/%3E%3C/g%3E%3C/svg%3E")`,
  // Empty (no pattern)
  '',
  '',
];

/**
 * English surah names
 */
export const SURAH_NAMES_EN = [
  'Al-Fatiha', 'Al-Baqarah', 'Ali Imran', 'An-Nisa', 'Al-Ma\'idah', 'Al-An\'am',
  'Al-A\'raf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf',
  'Ar-Ra\'d', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf',
  'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Mu\'minun', 'An-Nur',
  'Al-Furqan', 'Ash-Shu\'ara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
  'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin',
  'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat', 'Ash-Shura',
  'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath',
  'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar',
  'Ar-Rahman', 'Al-Waqi\'ah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
  'As-Saff', 'Al-Jumu\'ah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim',
  'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Ma\'arij', 'Nuh', 'Al-Jinn',
  'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba',
  'An-Nazi\'at', 'Abasa', 'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq',
  'Al-Buruj', 'At-Tariq', 'Al-A\'la', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
  'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq',
  'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat', 'Al-Qari\'ah', 'At-Takathur',
  'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Ma\'un', 'Al-Kawthar',
  'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
];

