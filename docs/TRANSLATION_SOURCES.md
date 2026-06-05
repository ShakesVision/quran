# Adding Translation Sources

Translations are loaded from the [Quran.com API v4](https://api.quran.com/api/v4/docs). Each translation has a numeric **resource_id**.

## Quick steps

1. Find the resource ID on Quran.com (or their API docs / resources endpoint).
2. Open `src/app/config/translation-sources.ts`.
3. Add an object to `TRANSLATION_SOURCES`:

```typescript
{
  id: 57,                    // resource_id from Quran.com
  language: "ur",            // en | ur | ar | other
  name: "Ahsan ul Bayan",    // display label
  enabledByDefault: true,    // include in tafsir modal multi-translation fetch
  inlineForLang: "ur",       // optional: use for reader inline lines (one per lang)
},
```

4. Rebuild the app.

## What each flag does

| Field | Effect |
|--------|--------|
| `enabledByDefault: true` | Included in `SurahService.fetchTrans()` when opening the ayah tafsir modal (comma-separated `translations=` query). |
| `inlineForLang: "en"` or `"ur"` | Used when **Inline translation** is enabled on the reader for that language. Only one entry per language should set this. |

## Where IDs are used

- **Tafsir / ayah modal** — `surah.service.ts` → `fetchTrans()` uses `getDefaultTranslationIds()`.
- **Reader inline translation** — `read.page.ts` → `loadInlineTranslations()` uses `getInlineTranslationResourceId()`.
- **Discover** — uses its own translation picker (separate from this file).

## Custom fetch (advanced)

Call `fetchTrans` with an explicit list:

```typescript
this.surahService.fetchTrans("2:255", "en", [20, 131, 57]);
```

## Notes

- Text comes from Quran.com; licensing follows each resource’s terms on Quran.com.
- Very large ID lists can slow the first ayah load; keep `enabledByDefault` to a reasonable set (~15).
- For non–Quran.com translations (local JSON, Tanzil, etc.), a separate adapter would be needed — this config is only for Quran.com `resource_id`s today.
