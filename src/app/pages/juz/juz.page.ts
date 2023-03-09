import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Storage } from "@ionic/storage-angular";
import { throwIfEmpty } from "rxjs/operators";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-juz",
  templateUrl: "./juz.page.html",
  styleUrls: ["./juz.page.scss"],
})
export class JuzPage implements OnInit {
  pages = [];
  juzPages = [];
  surahPages = [];
  rukuArray = [];
  memorizeItems: [];
  unicodeBookmarkPageNum: number;
  lastSyncedAt: Date;
  syncing = false;
  segment: "juz" | "surah" = "surah";

  constructor(
    private router: Router,
    private storage: Storage,
    private httpClient: HttpClient,
    private surahService: SurahService
  ) {
    this.storage.create().then((_) => console.log("storage created"));
  }

  ngOnInit() {
    this.gotoReadJuz("Quran", true);
    this.lastSynced();
  }

  lastSynced() {
    this.storage.get("synced").then((time) => {
      if (time) {
        console.log(time);
        this.lastSyncedAt = time;
      }
    });
  }
  updateMemorizeArray() {
    this.storage.get("memorize").then((items) => {
      if (items) {
        console.log(items);
        this.memorizeItems = items.sort((a: any, b: any) => a.juz - b.juz);
      }
    });
  }

  gotoReadJuz(juz, stopNav = false) {
    if (typeof juz === "number") juz = "Juz" + juz;
    this.storage
      .get(juz)
      .then((res) => {
        if (res) {
          console.log("found in device storage", res);
          if (stopNav) this.calculateJuzData(res.data);
          if (!stopNav) this.navigate(res);
        } else {
          console.log("NOT found in local storage, fetching from server...");
          this.fetchAndSaveInDeviceStorage(juz, true);
        }
      })
      .catch((err) => {
        console.log("error reading the database.");
      });
  }
  fetchAndSaveInDeviceStorage(juz, stopNav = false) {
    this.syncing = true;
    this.httpClient
      .get(
        `https://cdn.jsdelivr.net/gh/ShakesVision/Quran_archive@master/15Lines/${juz}.txt`,
        { responseType: "text" }
      )
      .subscribe(
        (res) => {
          console.log("Fetch successful...");
          this.syncing = false;
          this.juzPages = [];
          if (stopNav) this.calculateJuzData(res);
          // Add extra line (\n) at the end of each file to avoid truncating last line of the file in split
          const juzData = { title: juz, data: res, rukuArray: this.rukuArray };
          this.storage.set(juz, juzData).then((_) => {
            console.log("Have been saved in your device successfully.");
            this.lastSyncedAt = new Date();
            this.storage.set("synced", this.lastSyncedAt).then((_) => {});
          });
          if (!stopNav) this.navigate(juzData);
        },
        (err) => {
          console.log("fetch failed.");
        }
      );
  }
  navigate(juzData, i = 0) {
    if (i != 0)
      juzData = { title: i, data: juzData, rukuArray: this.rukuArray };
    this.router.navigate(["/read"], { state: { juzData } });
  }
  calculateJuzData(juzData) {
    this.pages = juzData.split("\n\n");
    const juzPageNumbers = this.surahService.juzPageNumbers;
    juzPageNumbers.forEach((pageNumber, juzIndex) => {
      let juzRukuArray = [];
      const singleJuzPages = this.pages.filter((p, i) => {
        const isJuzPage: boolean =
          i >= pageNumber - 1 &&
          (!!juzPageNumbers[juzIndex + 1]
            ? i < juzPageNumbers[juzIndex + 1] - 1
            : i < this.pages.length);
        return isJuzPage;
      });
      this.juzPages.push(singleJuzPages.join("\n\n"));
      singleJuzPages.forEach((page, juzPageIndex) => {
        if (page.includes(this.surahService.diacritics.RUKU_MARK))
          page.split("\n").forEach((line, lineIndex) => {
            if (line.includes(this.surahService.diacritics.RUKU_MARK))
              juzRukuArray.push({ juzPageIndex, lineIndex, line });
          });
      });
      this.rukuArray.push(juzRukuArray);
    });
    console.log(this.juzPages);

    // try for surahs similarly
    const surahPageNumbers = this.surahService.surahPageNumbers;
    const repeatedItems = this.findRepeatedItems(surahPageNumbers);
    console.log(surahPageNumbers);
    surahPageNumbers.forEach((pageNumber, surahIndex) => {
      const singleSurahPages = this.pages.filter((p, i) => {
        let isSurahPage: boolean;
        const a = i >= pageNumber - 1; // start pages index should be >= surah's starting page number
        let b: boolean; // and this for the end page number
        // the next index doesn't exist in surahPageNumbers (meaning surah 114)
        if (!!surahPageNumbers[surahIndex + 1]) {
          if (surahIndex === 35 && i === 445)
            console.log(
              surahPageNumbers[surahIndex + 1],
              pageNumber,
              this.pages[surahPageNumbers[surahIndex + 1]]
            );
          if (pageNumber === surahPageNumbers[surahIndex + 1]) {
            b = i <= surahPageNumbers[surahIndex + 1] - 1;
          } else if (
            !this.pages[surahPageNumbers[surahIndex + 1] - 1]
              .split("\n")[1]
              .includes(this.surahService.diacritics.BISM)
          ) {
            b = i < surahPageNumbers[surahIndex + 1];
            // console.log(surahPageNumbers[surahIndex + 1]);
          } else b = i < surahPageNumbers[surahIndex + 1] - 1; // agli jo bhi surah hai, uske page number se 1 kam (coz i is index)
        } else b = i < this.pages.length; // For surah 114 only
        isSurahPage = a && b;
        return isSurahPage;
      });
      this.surahPages.push(singleSurahPages.join("\n\n"));
    });
    console.log(this.surahPages);
    // console.log(this.surahPages.filter((_, i) => i > 77));
  }
  findMemorizeItem(index: number) {
    let selectedItem: any;
    selectedItem = this.memorizeItems?.find((item: any) => item.juz === index);
    return ((selectedItem?.completed / selectedItem?.total) * 100).toFixed(1);
  }
  returnStyle(i: number) {
    if (this.findMemorizeItem(i + 1) === "NaN") return "";
    const s = `linear-gradient(to right, var(--green-highlight) ${parseFloat(
      this.findMemorizeItem(i + 1)
    )}%, var(--ion-color-light) 0)`;
    return s;
  }
  totalMemorizeStyle() {
    if (!this.memorizeItems) return;
    let completedCount = 0;
    this.memorizeItems.forEach((i: any) => (completedCount += i.completed));
    const percent = ((completedCount / 611) * 100).toFixed(1);
    // setTimeout(() => {

    // }, 1000);
    return `linear-gradient(to right, var(--green-highlight) ${percent}%, var(--ion-color-light) 0)`;
  }
  setupBookmark() {
    this.storage.get("unicodeBookmark").then((pageNum) => {
      this.unicodeBookmarkPageNum = pageNum;
      console.log("BOOKMARK: " + this.unicodeBookmarkPageNum);
    });
  }

  getSurahName(num: number) {
    return this.surahService.surahNames[num];
  }

  findRepeatedItems = (arr) => [
    ...new Set(arr.filter((item, index) => arr.indexOf(item) !== index)),
  ];

  ionViewWillEnter() {
    this.setupBookmark();
    this.updateMemorizeArray();
  }
}
