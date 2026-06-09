import { Injectable } from "@angular/core";
import { Drivers, Storage as IonicStorageClass } from "@ionic/storage";

/**
 * Durable key-value storage backed by IndexedDB (not service-worker cache).
 *
 * Known application keys (audit list — keep in sync when adding storage):
 * - appData, bookmarks (user bookmarks/notes bundle)
 * - memorize, memorize_surah, memorize_streak, per-surah/juz keys
 * - preferredMushaf, daily_targets_settings, daily_log_*, all_time_pages, achievements
 * - appLanguage, ReaderTranslationOrder, TafseerModalSectionOrder, TafseerEnabledTafsirs, TafseerTafsirFontSize
 * - reader* settings, unicodeBookmark, scannedSource, scannedBookmark
 * - quran-data cache keys (quran_*, ayah_data_v2, etc.)
 * - custom_source_*, playground keys
 */
const DB_NAME = "QuranAppPersistentDB";
const DB_VERSION = 1;
const STORE_NAME = "kv";
const MIGRATION_FLAG = "__persist_migration_v1";

/** Legacy Ionic Storage DB names to import on first run. */
const LEGACY_IDB_CANDIDATES: { db: string; store: string }[] = [
  { db: "_ionicstorage", store: "_ionickv" },
  { db: "localforage", store: "keyvaluepairs" },
  { db: "__ionickv", store: "keyvaluepairs" },
];

@Injectable({ providedIn: "root" })
export class PersistentStorageService {
  private db: IDBDatabase | null = null;
  private ready: Promise<void> | null = null;
  private _driver: string | null = null;

  /** Drop-in replacement for Ionic Storage API. */
  get driver(): string | null {
    return this._driver;
  }

  async create(): Promise<this> {
    if (!this.ready) {
      this.ready = this.openDatabase()
        .then(() => this.migrateLegacyStores())
        .then(() => {
          this._driver = "indexeddb";
        });
    }
    await this.ready;
    return this;
  }

  async defineDriver(_driver: unknown): Promise<void> {
    /* no-op — native IndexedDB only */
  }

  async get(key: string): Promise<any> {
    await this.create();
    return this.idbRequest(
      this.db!.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
    );
  }

  async set(key: string, value: any): Promise<any> {
    await this.create();
    await this.idbRequest(
      this.db!.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value, key),
    );
    return value;
  }

  async remove(key: string): Promise<any> {
    await this.create();
    await this.idbRequest(
      this.db!.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key),
    );
  }

  async clear(): Promise<void> {
    await this.create();
    await this.idbRequest(
      this.db!.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear(),
    );
  }

  async length(): Promise<number> {
    await this.create();
    return this.idbRequest(
      this.db!.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count(),
    );
  }

  async keys(): Promise<string[]> {
    await this.create();
    return this.idbRequest(
      this.db!.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAllKeys(),
    ) as Promise<string[]>;
  }

  async forEach(
    iterator: (value: any, key: string, iterationNumber: number) => any,
  ): Promise<void> {
    const allKeys = await this.keys();
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      const value = await this.get(key);
      await iterator(value, key, i);
    }
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async migrateLegacyStores(): Promise<void> {
    const migrated = await this.get(MIGRATION_FLAG);
    if (migrated) {
      return;
    }

    const existingKeys = new Set(await this.keys());
    let imported = 0;

    // 1) Ionic Storage instance (same config as historical app default)
    try {
      const legacy = new IonicStorageClass({
        name: "_ionicstorage",
        storeName: "_ionickv",
        driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
      });
      await legacy.create();
      const legacyKeys = await legacy.keys();
      for (const key of legacyKeys) {
        if (key === MIGRATION_FLAG || existingKeys.has(key)) {
          continue;
        }
        const value = await legacy.get(key);
        if (value !== null && value !== undefined) {
          await this.set(key, value);
          existingKeys.add(key);
          imported++;
        }
      }
    } catch (e) {
      console.warn("[PersistentStorage] Ionic legacy migration skipped:", e);
    }

    // 2) Raw IndexedDB stores used by localforage / older builds
    for (const candidate of LEGACY_IDB_CANDIDATES) {
      try {
        const pairs = await this.readLegacyIdbStore(candidate.db, candidate.store);
        for (const [key, value] of pairs) {
          if (!key || key === MIGRATION_FLAG || existingKeys.has(key)) {
            continue;
          }
          await this.set(key, value);
          existingKeys.add(key);
          imported++;
        }
      } catch {
        /* store may not exist */
      }
    }

    // 3) localStorage fallback (only keys that look like app data)
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || existingKeys.has(key)) {
          continue;
        }
        if (!this.isLikelyAppKey(key)) {
          continue;
        }
        try {
          const raw = localStorage.getItem(key);
          if (raw == null) {
            continue;
          }
          const value = this.parseLocalStorageValue(raw);
          await this.set(key, value);
          existingKeys.add(key);
          imported++;
        } catch {
          /* skip invalid entries */
        }
      }
    }

    await this.set(MIGRATION_FLAG, {
      at: new Date().toISOString(),
      imported,
    });
    if (imported > 0) {
      console.info(`[PersistentStorage] Migrated ${imported} keys into durable IndexedDB`);
    }
  }

  private isLikelyAppKey(key: string): boolean {
    if (key.startsWith("_ionic") || key.startsWith("ionic")) {
      return false;
    }
    const prefixes = [
      "appData",
      "bookmarks",
      "memorize",
      "reader",
      "daily_",
      "quran_",
      "ayah_",
      "preferred",
      "achievements",
      "all_time",
      "appLanguage",
      "Tafseer",
      "Reader",
      "scanned",
      "unicode",
      "custom_",
    ];
    return prefixes.some((p) => key.startsWith(p) || key.includes(p));
  }

  private parseLocalStorageValue(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private readLegacyIdbStore(
    dbName: string,
    storeName: string,
  ): Promise<[string, unknown][]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          resolve([]);
          return;
        }
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const out: [string, unknown][] = [];

        if (store.keyPath) {
          const getAll = store.getAll();
          const getAllKeys = store.getAllKeys();
          getAll.onsuccess = () => {
            const values = getAll.result;
            const keys = getAllKeys.result as string[];
            keys.forEach((k, i) => out.push([String(k), values[i]]));
          };
          getAllKeys.onerror = () => reject(getAllKeys.error);
          getAll.onerror = () => reject(getAll.error);
        } else {
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              out.push([String(cursor.key), cursor.value]);
              cursor.continue();
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        }

        tx.oncomplete = () => {
          db.close();
          resolve(out);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }

  private idbRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
