export interface Surah {
    arabic: string;
    urdu: string;
    number: string;
    name: string;
    startLineNo: number;
    revelationType: string;
    //name<space>arabic_name,startLineNo,makkiMadni
  }
  export interface Index {
    surahNo: string;
    surahName: string;
    remoteId: string;
  }
  