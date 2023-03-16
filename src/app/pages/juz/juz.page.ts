import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { PopoverController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { throwIfEmpty } from "rxjs/operators";
import { ListType, SurahOrJuzListItem } from "src/app/models/common";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-juz",
  templateUrl: "./juz.page.html",
  styleUrls: ["./juz.page.scss"],
})
export class JuzPage implements OnInit {
  pages = [];
  juzPages: SurahOrJuzListItem[] = [];
  surahPages: SurahOrJuzListItem[] = [];
  juzPagesCopy: SurahOrJuzListItem[] = [];
  surahPagesCopy: SurahOrJuzListItem[] = [];
  rukuArray = [];
  memorizeItems: [];
  unicodeBookmarkPageNum: number;
  lastSyncedAt: Date;
  syncing = false;
  isPopoverOpen = false;
  segment: ListType = ListType.SURAH;

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
          this.juzPagesCopy = [];
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
  navigate(juzData, i = 0, mode = "juz") {
    if (i != 0)
      juzData = { title: i, data: juzData, rukuArray: this.rukuArray, mode };
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
              juzRukuArray.push({ juzPageIndex, lineIndex, line });
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
  totalMemorizeStyle() {
    if (!this.memorizeItems) return;
    let completedCount = 0;
    this.memorizeItems.forEach((i: any) => (completedCount += i.completed));
    const percent = ((completedCount / 611) * 100).toFixed(1);
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

  ionViewWillEnter() {
    this.setupBookmark();
    this.updateMemorizeArray();
  }
  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverController.dismiss();
  }
}
