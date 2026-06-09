import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, shareReplay, tap } from "rxjs/operators";

export interface TafsirEdition {
  id: number;
  slug: string;
  name: string;
  author_name: string;
  language_name: string;
  source?: string;
}

export interface TafsirAyahResponse {
  text?: string;
}

/** Default tafsirs shown on first use (matches prior hard-coded set). */
export const DEFAULT_TAFSIR_SLUGS: string[] = [
  "ar-tafsir-ibn-kathir",
  "ar-tafseer-al-saddi",
  "ur-tafseer-ibn-e-kaseer",
  "en-tafsir-maarif-ul-quran",
];

const TAFSIR_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";

@Injectable({ providedIn: "root" })
export class TafsirApiService {
  private editions$: Observable<TafsirEdition[]> | null = null;

  constructor(private http: HttpClient) {}

  getEditions(): Observable<TafsirEdition[]> {
    if (!this.editions$) {
      this.editions$ = this.http
        .get<TafsirEdition[]>(`${TAFSIR_CDN_BASE}/editions.json`)
        .pipe(
          map((list) =>
            [...list].sort((a, b) =>
              a.language_name.localeCompare(b.language_name) ||
              a.name.localeCompare(b.name),
            ),
          ),
          catchError(() => of([] as TafsirEdition[])),
          shareReplay(1),
        );
    }
    return this.editions$;
  }

  getAyahText(slug: string, verseKey: string): Observable<string | null> {
    const [surah, ayah] = verseKey.split(":");
    const url = `${TAFSIR_CDN_BASE}/${slug}/${surah}/${ayah}.json`;
    return this.http.get<TafsirAyahResponse>(url).pipe(
      map((res) => (res?.text || "").trim() || null),
      catchError(() => of(null)),
    );
  }

  /** Warm the editions cache early (optional). */
  prefetchEditions(): void {
    this.getEditions().pipe(tap()).subscribe();
  }
}
