import { Bookmarks } from "./bookmarks";

export interface NoteContext {
  page?: number;
  surah?: number;
  juz?: number;
  sourceId?: string;
}

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  context?: NoteContext;
}

export interface AppSettings {
  sourceId?: string;
  linesPerPage?: number;
  lastOpenedAt?: string;
}

export interface AppData {
  bookmarks: Bookmarks;
  notes: NoteEntry[];
  settings: AppSettings;
}

