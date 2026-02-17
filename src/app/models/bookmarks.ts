export interface AutoBookmarks {
  unicode?: number;
  scanned?: number;
  juz?: { juz: number; page: number }[];
  surah?: { surah: number; page: number }[];
}

export interface ManualBookmark {
  id?: string;
  name: string;
  page: number;
  lineNumber?: number;
  verseKey?: string; // e.g. "2:255"
  folderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManualBookmarkFolder {
  id: string;
  name: string;
  color?: string;
  bookmarks: ManualBookmark[];
}

export interface Bookmarks {
  auto?: AutoBookmarks;
  manual?: ManualBookmark[];
  manualFolders?: ManualBookmarkFolder[];
}

/**
 * Bookmark calculation values to show perentage and page number with UI buttons
 */
export interface BookmarkCalculation {
  perc: string;
  page: number;
}

