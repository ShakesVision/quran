export interface AutoBookmarks {
  unicode?: number;
  scanned?: number;
  juz?: { juz: number; page: number }[];
  surah?: { surah: number; page: number }[];
}

export interface ManualBookmark {
  name: string;
  page: number;
}

export interface Bookmarks {
  auto?: AutoBookmarks;
  manual?: ManualBookmark[];
}

/**
 * Bookmark calculation values to show perentage and page number with UI buttons
 */
export interface BookmarkCalculation {
  perc: string;
  page: number;
}
