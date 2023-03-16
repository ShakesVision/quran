export interface SurahOrJuzListItem {
  /**
   * Juz or Surah number e.g. 1 is Juz الم and Surah فاتحہ
   */
  id: number;
  /**
   * Juz or Surah name
   */
  name: string;
  /**
   * Pages with all content, separated by `\n\n`, i.e. two blank lines
   */
  pages: string;
  /**
   * Number of pages a Juz or Surah has
   */
  length: number;
}
export interface SearchResultsList {
  pageIndex: number;
  lineIndex: number;
  charIndices: number[];
  lineText: string;
  searchText: string;
}
export interface SearchResults {
  results: SearchResultsList[];
  total: number;
}
export enum ListType {
  JUZ = "juz",
  SURAH = "surah",
}
