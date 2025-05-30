import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { PopoverController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { BookmarkCalculation, Bookmarks } from "src/app/models/bookmarks";
import {
  ListType,
  RukuLocationItem,
  SurahOrJuzListItem,
} from "src/app/models/common";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-juz",
  templateUrl: "./juz.page.html",
  styleUrls: ["./juz.page.scss"],
})
export class JuzPage implements OnInit {
  /**
   * The Quran data with ruku information
   */
  quranData: {
    title: string;
    data: string;
    rukuArray: RukuLocationItem[][];
    mode: string;
  };

  /**
   * Quran pages
   */
  pages = [];

  /**
   * Juz pages
   */
  juzPages: SurahOrJuzListItem[] = [];

  /**
   * Surah pages
   */
  surahPages: SurahOrJuzListItem[] = [];

  /**
   * Juz pages copy
   */
  juzPagesCopy: SurahOrJuzListItem[] = [];

  /**
   * Surah pages copy
   */
  surahPagesCopy: SurahOrJuzListItem[] = [];

  /**
   * Ruku array
   */
  rukuArray: RukuLocationItem[][] = [];

  /**
   * Memorization items
   */
  memorizeItems: [];

  /**
   * Bookmark page number in unicode
   */
  unicodeBookmarkPageNum: number;

  /**
   * Bookmarks
   */
  bookmarks: Bookmarks;

  /**
   * Last synced at
   */
  lastSyncedAt: Date;

  /**
   * Syncing in progress
   */
  syncing = false;

  /**
   * Has been saved
   */
  hasSaved = false;

  /**
   * Is popover open
   */
  isPopoverOpen = false;

  /**
   * Segment
   */
  segment: `${ListType}` = "juz";

  /**
   * Is online
   */
  isOnline: boolean = false;

  constructor(
    private router: Router,
    private storage: Storage,
    private httpClient: HttpClient,
    private surahService: SurahService,
    private popoverController: PopoverController
  ) {
    this.storage.create().then((_) => console.log("storage created"));
  }

  ngOnInit() {
    this.loadQuran("Quran");
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
  loadQuran(juz) {
    console.log("called loadQuran:", juz, "offline? ", !navigator.onLine);
    this.storage
      .get(juz)
      .then((res) => {
        console.log(res);
        if (res && !navigator.onLine) {
          console.log("found in device storage", res);
          this.quranData = res;
          this.calculateJuzData(res.data);
        } else {
          console.log("Found internet, fetching from server...");
          this.fetchAndSaveInDeviceStorage(juz);
        }
      })
      .catch((err) => {
        console.log("error reading the database.");
      });
  }
  fetchAndSaveInDeviceStorage(juz) {
    this.syncing = true;
    this.httpClient
      .get(
        `https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/15Lines/${juz}.txt`,
        { responseType: "text" }
      )
      .subscribe(
        (res) => {
          console.log("Fetch successful...");
          this.syncing = false;
          this.juzPages = [];
          this.juzPagesCopy = [];
          this.surahPages = [];
          this.surahPagesCopy = [];
          this.calculateJuzData(res);
          // Add extra line (\n) at the end of each file to avoid truncating last line of the file in split
          const juzData = {
            title: "Quran",
            data: res,
            rukuArray: this.rukuArray,
            mode: "juz",
          };
          this.quranData = juzData;
          this.storage.set(juz, juzData).then((_) => {
            console.log("Have been saved in your device successfully.");
            // instead of toast that gets in the way - use save icon on title bar to depict Saved status.
            this.hasSaved = true;
            setTimeout(() => (this.hasSaved = false), 1000);
            this.lastSyncedAt = new Date();
            this.storage.set("synced", this.lastSyncedAt).then((_) => {});
          });
        },
        (err) => {
          console.log("fetch failed.");
          this.syncing = false;
          // Let's see if we find it in storage
          this.storage.get(juz).then((res) => {
            console.log(res);
            if (res) {
              console.log("fetch failed, but found in device storage", res);
              this.quranData = res;
              this.calculateJuzData(res.data);
              this.surahService.presentToastWithOptions(
                `Fetch failed, but found in device storage.`,
                "warning",
                "bottom"
              );
            }
          });
        }
      );
  }
  navigate(data?, id = 0, mode = "juz") {
    if (id != 0)
      data = { title: id, data: data, rukuArray: this.rukuArray, mode };
    if (!data) data = this.quranData;
    this.router.navigate(["/read"], { state: { juzData: data } });
  }
  calculateJuzData(juzData) {
    this.pages = juzData.split("\n\n");
    const juzPageNumbers = this.surahService.juzPageNumbers;
    juzPageNumbers.forEach((pageNumber, juzIndex) => {
      let juzRukuArray: RukuLocationItem[] = [];
      const singleJuzPages = this.pages.filter((p, i) => {
        const isJuzPage: boolean =
          i >= pageNumber - 1 &&
          (!!juzPageNumbers[juzIndex + 1]
            ? i < juzPageNumbers[juzIndex + 1] - 1
            : i < this.pages.length);
        return isJuzPage;
      });
      const juzPagesData: SurahOrJuzListItem = {
        id: juzIndex + 1,
        name: this.getJuzName(juzIndex),
        pages: singleJuzPages.join("\n\n"),
        length: singleJuzPages.length,
      };
      this.juzPages.push(juzPagesData);
      this.juzPagesCopy.push(juzPagesData);

      singleJuzPages.forEach((page, juzPageIndex) => {
        if (page.includes(this.surahService.diacritics.RUKU_MARK))
          page.split("\n").forEach((line, lineIndex) => {
            if (line.includes(this.surahService.diacritics.RUKU_MARK))
              juzRukuArray.push({
                juzPageIndex,
                lineIndex,
                line,
                pageNumber:
                  juzPageIndex + this.surahService.juzPageNumbers[juzIndex],
              });
          });
      });
      this.rukuArray.push(juzRukuArray);
    });
    // try for surahs similarly
    const surahPageNumbers = this.surahService.surahPageNumbers;
    surahPageNumbers.forEach((pageNumber, surahIndex) => {
      const singleSurahPages = this.pages.filter((p, i) => {
        let isSurahPage: boolean;
        const a = i >= pageNumber - 1; // start pages index should be >= surah's starting page number
        let b: boolean; // and this for the end page number
        // the next index doesn't exist in surahPageNumbers (meaning surah 114)
        if (!!surahPageNumbers[surahIndex + 1]) {
          if (pageNumber === surahPageNumbers[surahIndex + 1]) {
            b = i <= surahPageNumbers[surahIndex + 1] - 1;
          } else if (
            !this.pages[surahPageNumbers[surahIndex + 1] - 1]
              .split("\n")[1]
              .includes(this.surahService.diacritics.BISM)
          ) {
            b = i < surahPageNumbers[surahIndex + 1];
          } else b = i < surahPageNumbers[surahIndex + 1] - 1; // agli jo bhi surah hai, uske page number se 1 kam (coz i is index)
        } else b = i < this.pages.length; // For surah 114 only
        isSurahPage = a && b;
        return isSurahPage;
      });
      const surahPagesData: SurahOrJuzListItem = {
        id: surahIndex + 1,
        name: this.getSurahName(surahIndex),
        pages: singleSurahPages.join("\n\n"),
        length: singleSurahPages.length,
      };
      this.surahPages.push(surahPagesData);
      this.surahPagesCopy.push(surahPagesData);
    });
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
  returnBookmarkCalc(p: SurahOrJuzListItem): BookmarkCalculation {
    let result: BookmarkCalculation;
    let pageValue: number;
    if (this.segment === "juz") {
      // Juz calculations
      pageValue = this.bookmarks?.auto?.juz?.find((j) => j.juz === p.id)?.page;
    } else {
      // Surah calculations
      pageValue = this.bookmarks?.auto?.surah?.find(
        (j) => j.surah === p.id
      )?.page;
    }
    //If data is not found, i.e. No pages read and bookmark doesn't exist
    if (!pageValue) return null;
    else {
      result = {
        perc: `${((pageValue / p.length) * 100).toFixed(1)}%`,
        page: pageValue,
      };
      console.log(result);
      return result;
    }
  }
  totalMemorizeStyle() {
    if (!this.memorizeItems) return;
    let completedCount = 0;
    this.memorizeItems.forEach((i: any) => (completedCount += i.completed));
    const percent = ((completedCount / 611) * 100).toFixed(1);
    return `linear-gradient(to right, var(--green-highlight) ${percent}%, var(--ion-color-light) 0)`;
  }
  setupBookmark() {
    // this.storage.get("unicodeBookmark").then((pageNum) => {
    //   this.unicodeBookmarkPageNum = pageNum;
    //   console.log("BOOKMARK: " + this.unicodeBookmarkPageNum);
    // });
    this.storage.get("bookmarks").then((res: Bookmarks) => {
      this.bookmarks = res;
      this.unicodeBookmarkPageNum = res?.auto?.unicode;
    });
  }

  getSurahName(num: number) {
    return this.surahService.surahNames[num];
  }
  getJuzName(num: number) {
    return this.surahService.juzNames[num];
  }

  queryChanged(ip: string) {
    let temp: string = ip.toLowerCase();
    temp = this.surahService.a2e(
      this.surahService.p2e(this.surahService.getArabicScript(temp))
    );

    const filterOn =
      (this.segment === "juz" ? ListType.JUZ : ListType.SURAH) + "Pages";
    const filterOnCopy = filterOn + "Copy";

    if (!temp) this[filterOn] = this[filterOnCopy];
    this.surahService.getSurahInfo().subscribe((surahInfo: any) => {
      this[filterOn] = this[filterOnCopy].filter((d: SurahOrJuzListItem) => {
        return (
          d.id.toString().indexOf(temp) > -1 ||
          this.surahService.getArabicScript(d.name).includes(temp) ||
          (this.segment === ListType.SURAH &&
            surahInfo
              .find((s) => parseInt(s.index) === d.id)
              .title.toLowerCase()
              .includes(temp))
        );
      });
    });
  }

  sortBy(field: string) {
    const filterOn =
      (this.segment === "juz" ? ListType.JUZ : ListType.SURAH) + "Pages";
    const filterOnCopy = filterOn + "Copy";

    switch (field) {
      case "pageCount":
        this[filterOn] = [...this[filterOnCopy]].sort(
          (a, b) => b.length - a.length
        );
        break;
      case "name":
        this[filterOn] = [...this[filterOnCopy]].sort(
          (a, b) => -1 * b.name.localeCompare(a.name)
        );
        break;
      case "direction":
        this[filterOn] = [...this[filterOn]].reverse();
        break;

      default:
        this[filterOn] = [...this[filterOnCopy]].sort(
          (a, b) => b.length - a.length
        );
        break;
    }
    this.closePopover();
  }

  resetLists() {
    this.juzPages = [...this.juzPagesCopy];
    this.surahPages = [...this.surahPagesCopy];
    this.closePopover();
  }
  closePopover() {
    this.isPopoverOpen = false;
  }
  presentToast() {}

  ionViewWillEnter() {
    this.setupBookmark();
    this.updateMemorizeArray();
  }
  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverController.dismiss();
  }
}
