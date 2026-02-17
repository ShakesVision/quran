import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage-angular";
import { AppData, NoteEntry, NoteContext } from "../models/app-data";
import { Bookmarks, ManualBookmark, ManualBookmarkFolder } from "../models/bookmarks";

@Injectable({
  providedIn: "root",
})
export class AppDataService {
  private readonly STORAGE_KEY = "appData";
  private readonly LEGACY_BOOKMARKS_KEY = "bookmarks";

  constructor(private storage: Storage) {
    this.initStorage();
  }

  private async initStorage() {
    await this.storage.create();
  }

  private defaultBookmarks(): Bookmarks {
    return {
      auto: {
        unicode: 1,
        scanned: 1,
        juz: [],
        surah: [],
      },
      manual: [],
      manualFolders: [
        {
          id: "default",
          name: "Default",
          bookmarks: [],
        },
      ],
    };
  }

  private defaultData(): AppData {
    return {
      bookmarks: this.defaultBookmarks(),
      notes: [],
      settings: {},
    };
  }

  async getAppData(): Promise<AppData> {
    await this.storage.create();
    let data = await this.storage.get(this.STORAGE_KEY);

    if (!data) {
      const legacyBookmarks = (await this.storage.get(
        this.LEGACY_BOOKMARKS_KEY
      )) as Bookmarks | null;
      data = this.defaultData();

      if (legacyBookmarks) {
        data.bookmarks = this.migrateBookmarks(legacyBookmarks);
      }

      await this.storage.set(this.STORAGE_KEY, data);
    }

    return data as AppData;
  }

  async saveAppData(data: AppData): Promise<void> {
    await this.storage.set(this.STORAGE_KEY, data);
    await this.storage.set(this.LEGACY_BOOKMARKS_KEY, data.bookmarks);
  }

  async exportAppData(): Promise<string> {
    const data = await this.getAppData();
    return JSON.stringify(data);
  }

  async importAppData(json: string, merge = true): Promise<void> {
    const incoming = JSON.parse(json) as AppData;
    const current = await this.getAppData();

    const merged: AppData = merge
      ? {
          bookmarks: {
            ...current.bookmarks,
            ...incoming.bookmarks,
          },
          notes: [...(current.notes || []), ...(incoming.notes || [])],
          settings: { ...current.settings, ...incoming.settings },
        }
      : incoming;

    await this.saveAppData(merged);
  }

  async addManualBookmark(
    name: string,
    page: number,
    folderName = "Default",
    lineNumber?: number,
    verseKey?: string
  ): Promise<ManualBookmark> {
    const data = await this.getAppData();
    const folders = data.bookmarks.manualFolders || [];
    let folder = folders.find((f) => f.name === folderName);

    if (!folder) {
      folder = {
        id: this.createId(),
        name: folderName,
        bookmarks: [],
      };
      folders.push(folder);
    }

    const bookmark: ManualBookmark = {
      id: this.createId(),
      name,
      page,
      lineNumber,
      verseKey,
      folderId: folder.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    folder.bookmarks.push(bookmark);
    data.bookmarks.manualFolders = folders;
    data.bookmarks.manual = [...(data.bookmarks.manual || []), bookmark];
    await this.saveAppData(data);
    return bookmark;
  }

  async getManualBookmarks(): Promise<ManualBookmarkFolder[]> {
    const data = await this.getAppData();
    return data.bookmarks.manualFolders || [];
  }

  async deleteManualBookmark(bookmarkId: string): Promise<void> {
    const data = await this.getAppData();
    // Remove from flat list
    data.bookmarks.manual = (data.bookmarks.manual || []).filter(
      (b) => b.id !== bookmarkId
    );
    // Remove from folders
    (data.bookmarks.manualFolders || []).forEach((folder) => {
      folder.bookmarks = folder.bookmarks.filter((b) => b.id !== bookmarkId);
    });
    await this.saveAppData(data);
  }

  async deleteBookmarkFolder(folderId: string): Promise<void> {
    const data = await this.getAppData();
    const folder = (data.bookmarks.manualFolders || []).find(
      (f) => f.id === folderId
    );
    if (folder) {
      // Remove bookmarks in this folder from flat list too
      const folderBmIds = new Set(folder.bookmarks.map((b) => b.id));
      data.bookmarks.manual = (data.bookmarks.manual || []).filter(
        (b) => !folderBmIds.has(b.id)
      );
      data.bookmarks.manualFolders = (data.bookmarks.manualFolders || []).filter(
        (f) => f.id !== folderId
      );
    }
    await this.saveAppData(data);
  }

  async renameBookmarkFolder(
    folderId: string,
    newName: string
  ): Promise<void> {
    const data = await this.getAppData();
    const folder = (data.bookmarks.manualFolders || []).find(
      (f) => f.id === folderId
    );
    if (folder) {
      folder.name = newName;
    }
    await this.saveAppData(data);
  }

  async addOrAppendNote(
    title: string,
    content: string,
    context?: NoteContext
  ): Promise<NoteEntry> {
    const data = await this.getAppData();
    const now = new Date().toISOString();
    const existing = data.notes.find((n) => n.title === title);

    if (existing) {
      existing.content = `${existing.content}\n\n[${now}] ${content}`;
      existing.updatedAt = now;
      existing.context = context || existing.context;
      await this.saveAppData(data);
      return existing;
    }

    const entry: NoteEntry = {
      id: this.createId(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      context,
    };

    data.notes.push(entry);
    await this.saveAppData(data);
    return entry;
  }

  private migrateBookmarks(bookmarks: Bookmarks): Bookmarks {
    const manual = bookmarks.manual || [];
    if (!bookmarks.manualFolders || !bookmarks.manualFolders.length) {
      bookmarks.manualFolders = [
        {
          id: "default",
          name: "Default",
          bookmarks: manual,
        },
      ];
    }
    return bookmarks;
  }

  private createId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}


