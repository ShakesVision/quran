export interface First {
  firstSurahNum: number;
  firstVerseNum: number;
  verseId: string;
}

export interface Last {
  lastSurahNum: number;
  lastVerseNum: number;
  verseId: string;
}

export interface FirstLastAyah {
  first: First;
  last: Last;
}
