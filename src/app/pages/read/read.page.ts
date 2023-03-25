import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
} from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import { PopoverController, ToastController } from "@ionic/angular";
import { AlertController } from "@ionic/angular";
import { alertController } from "@ionic/core";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { VirtualScrollerComponent } from "ngx-virtual-scroller";
import { Storage } from "@ionic/storage-angular";
import { FirstLastAyah } from "src/app/models/firstLastModels";
import {
  RukuLocationItem,
  SearchResults,
  SearchResultsList,
} from "src/app/models/common";
import { MushafLines } from "src/app/models/mushaf-versions";
import { ImageQuality } from "../scanned/scanned.page";

@Component({
  selector: "app-read",
  templateUrl: "./read.page.html",
  styleUrls: ["./read.page.scss"],
})
export class ReadPage implements OnInit, AfterViewInit {
  @ViewChild(VirtualScrollerComponent, { static: false })
  surah;
  lines: string[];
  pages: string[];
  tPages: string[];
  arabicLines: string[];
  translationLines: string[];
  currentPage: number = 1;
  translation: string;
  tMode: boolean = false;
  hMode: boolean = false;
  translationExists: boolean = false;
  isPopoverOpen: boolean = false;
  currentSurahInfo;
  audioSrc: string;
  audio: HTMLAudioElement;
  audioPlaying = false;
  audioPlayIndex = 1;
  audioSpeed = "1";
  playingVerseNum: string;
  reciters = [];
  qariId: number;
  selectedQari;
  mushafVersion = MushafLines.Fifteen;
  isFullscreen: boolean = false;

  searchResults: SearchResults;

  juzPages = [];

  surahPages = [];

  isCompleteMushaf: boolean;

  juzCalculated: number;

  surahCalculated: number;

  currentPageCalculated: number;

  surahCalculatedForJuz: number;

  rukuArray: RukuLocationItem[][] = [];

  surahArray = [];

  isResultSelected: boolean = false;

  surahInfo;

  title;
  juzNumber;
  ignoreTashkeel: boolean = true;
  juzmode: boolean;
  juzsurahmode: boolean;
  startIndex: number;
  copyResultsBG = "dark";
  scanView: boolean = false;
  fullImageUrl: string;
  identifier;
  incompleteUrl;
  zoomProperties = {
    "double-tap": true, // double tap to zoom in and out.
    overflow: "hidden", // Am not sure. But Documentation says, it will not render elements outside the container.
    wheel: false, // Disables mouse - To enable scrolling. Else mouse scrolling will be used to zoom in and out on web.
    disableZoomControl: "disable", // stops showing zoom + and zoom - images.
    backgroundColor: "rgba(0,0,0,0)", // Makes the pinch zoom container color to transparent. So that ionic themes can be applied without issues.
  };
  constructor(
    public surahService: SurahService,
    public toastController: ToastController,
    public alertController: AlertController,
    private router: Router,
    private httpClient: HttpClient,
    private activatedRoute: ActivatedRoute,
    public changeDetectorRef: ChangeDetectorRef,
    private storage: Storage,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    const juzData = this.router.getCurrentNavigation().extras.state?.juzData;
    const id = this.activatedRoute.snapshot.params.id;
    if (juzData) {
      this.juzmode = true;
      this.juzsurahmode = juzData.mode === "surah";
      this.surah = juzData.data;
      this.title = juzData.title;
      this.pages = this.surah.split("\n\n");
      this.lines = this.pages[this.currentPage - 1].split("\n");
      console.log(this.lines);
      this.rukuArray = [...juzData.rukuArray];
    } else if (!juzData) {
      console.log("not jz mode", this.surah);
      this.juzmode = false;
      this.surah = this.surahService.currentSurah;
      this.title = this.surah.name;
      this.pages = this.surah.arabic.split("\n\n");
      this.arabicLines = this.pages[this.currentPage - 1].split("\n");
      this.lines = this.arabicLines;
      if (this.surah.urdu && this.surah.urdu != "") {
        this.translationExists = true;
        this.tPages = this.surah.urdu.split("\n\n");
        this.translationLines = this.tPages[this.currentPage - 1].split("\n");
      }
    }
    this.isCompleteMushaf = this.pages.length === 611;
    this.updateCalculatedNumbers();
    // get bookmark
    if (this.juzmode && this.isCompleteMushaf) this.getBookmark();
    // get surah info file
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = res;
      this.surahService.surahInfo = res;
    });
    // Get scan info
    this.setupLinks();
    // highlight helper listener
    document.querySelector(".ar").addEventListener("mouseup", function (e) {
      var txt = this.innerText;
      var selection = window.getSelection();
      var start = selection.anchorOffset;
      var end = selection.focusOffset;
      if (start >= 0 && end >= 0) {
        console.log("start: " + start);
        console.log("end: " + end);
      }
    });
  }

  ngAfterViewInit(): void {
    this.fetchQariList();
    this.qariId = 7;
  }

  async getBookmark() {
    await this.storage.create();
    this.storage.get("unicodeBookmark").then((pageNum) => {
      console.log("bookmark fetched:", pageNum);
      if (pageNum) this.gotoPageNum(pageNum);
    });
  }

  setBookmark() {
    if (
      this.juzmode &&
      this.isCompleteMushaf &&
      this.currentPage !== 1 &&
      this.currentPage !== this.pages.length
    )
      this.storage.set("unicodeBookmark", this.currentPage).then((_) => {});
  }
  goToPage(n: number) {
    this.currentPage += n;
    this.arabicLines = this.pages[this.currentPage - 1].split("\n");
    this.updateCalculatedNumbers();
    this.scanView = false;
    if (this.translationExists)
      this.translationLines = this.tPages[this.currentPage - 1].split("\n");
    this.lines = this.tMode ? this.translationLines : this.arabicLines;

    //close popup if open
    let popup: HTMLElement = document.querySelector(".popup");
    this.resetPopup(popup);

    //show translation only if toggled prop is on
    // this.translationMode(false);

    //if last line of last page, center the text
    console.log(
      this.currentPage,
      this.pages.length,
      `div#line_${this.arabicLines.length - 1}`
    );
    if (this.currentPage === this.pages.length) {
      console.log("running");
      document
        .querySelector(`div#line_${this.arabicLines.length - 1}`)
        ?.classList.add("centered-table-text");
    }
    this.setBookmark();
    this.getFirstAndLastAyahNumberOnPage();
  }

  resetPopup(popup: HTMLElement) {
    popup.style.opacity = "0";
    popup.style.height = "0";
    popup.style.width = "0";
  }

  openTrans(event, n: number) {
    if (this.translationExists && !this.tMode && !this.juzmode) {
      this.translation = this.translationLines[n];
      console.log(n + 1 + ". " + this.translation);
      let popup: HTMLElement = document.querySelector(".popup");
      let e1: HTMLElement = document.querySelector(".popup .popup-header");
      let e2: HTMLElement = document.querySelector(".popup .popup-text");
      let cross: HTMLElement = document.querySelector(".cross");
      popup.style.width = "100%";
      popup.style.height = "auto";
      popup.style.opacity = "1";
      if (n < 10) popup.style.top = event.clientY - 40 + "px";
      else popup.style.top = event.clientY - 200 + "px";
      e1.textContent = "ترجمہ برائے سطر " + (n + 1);
      e2.textContent = this.translation;
      cross.addEventListener("click", () => {
        this.resetPopup(popup);
      });
      popup.addEventListener("click", () => {
        this.resetPopup(popup);
      });
    } else if (!this.surah?.urdu || this.juzmode) {
      console.log("Translation not available!");
      if (!this.juzmode)
        this.surahService.presentToastWithOptions(
          `Translation for ${this.title} is not available!`,
          "dark",
          "top"
        );
      else {
        const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
        let lineCounter = n;
        let txt = "";
        do {
          txt = this.lines[lineCounter];
          lineCounter++;
        } while (!re.test(txt));
        console.log(txt);
        let verseNum = txt
          .split(" ")
          .find((word) => re.test(word))
          .split(this.surahService.diacritics.AYAH_MARK)[1];
        verseNum = this.getEnNumber(verseNum);
        console.log(txt);
        this.readTrans(
          `${this.getCorrectedSurahNumberWithRespectTo(n)}:${verseNum}`
        );
      }
    }
  }
  getCorrectedSurahNumberWithRespectTo(lineNo) {
    let lineNumbers = this.lines
      .map((l, i) => {
        if (l.includes(this.surahService.diacritics.BISM) && lineNo != i - 1)
          return i;
      })
      .filter(Boolean);
    const correctedSurahNum =
      (this.isCompleteMushaf
        ? this.surahCalculated
        : this.surahCalculatedForJuz) -
      lineNumbers.filter((l) => l > lineNo).length;
    return correctedSurahNum;
  }

  async presentAlert(msg, header?, subheader?) {
    const alertmsg = await this.alertController.create({
      header: header,
      subHeader: subheader,
      message: msg,
      cssClass: "trans",
      buttons: [
        {
          text: "⧉ Copy",
          handler: () => {
            this.copyAnything(
              this.convertToPlain(`<div>${msg.replaceAll("<br>", "\n")}</div>`)
            );
            this.surahService.presentToastWithOptions(
              "Copied successfully!",
              "success-light",
              "bottom"
            );
          },
        },
        {
          text: "Next",
          handler: () => {
            const [surah, ayah] = header?.split(":");
            this.readTrans(`${surah}:${parseInt(ayah) + 1}`);
          },
        },
        {
          text: "Previous",
          handler: () => {
            const [surah, ayah] = header?.split(":");
            this.readTrans(`${surah}:${parseInt(ayah) - 1}`);
          },
        },
        {
          text: "OK",
          role: "cancel",
        },
      ],
    });
    alertmsg.present();
  }
  fillerLineFix() {
    let div: HTMLElement = document.querySelector(".filler-lines");
    div.style.height = document.getElementById("line_0").clientHeight + "px";
  }
  changeFontSize(val, inputValue: boolean = false) {
    var el: HTMLElement = document.querySelector(".content-wrapper");
    let fontSizeField: HTMLElement = document.querySelector(".font-size-field");
    var style = window.getComputedStyle(el, null).getPropertyValue("font-size");
    var currentSize = parseFloat(style);
    if (inputValue) el.style.fontSize = val + "px";
    else {
      el.style.fontSize = currentSize + val + "px";
      fontSizeField.innerText = el.style.fontSize;
    }
  }
  changeColors(val, field = "bg") {
    var el: HTMLElement = document.querySelector(".content-wrapper");
    if (field === "bg") el.style.background = val;
    if (field === "color") el.style.color = val;
  }
  gotoJuzSurah(val, field = "juz") {
    if (!val || val == "" || val < 1 || typeof parseInt(val) != "number")
      return;
    switch (field) {
      case "juz":
        if (parseFloat(val) !== parseInt(val) && val.toString().includes(".")) {
          let [v1, v2] = val.toString().split(".");
          v1 = parseInt(v1);
          v2 = parseInt(v2);
          if (v1 > 30) this.gotoPageNum(this.pages.length);
          if (v2 > this.rukuArray[v1 - 1].length)
            this.gotoPageNum(this.surahService.juzPageNumbers[v1] - 1);
          else
            this.gotoPageNum(
              this.surahService.juzPageNumbers[v1 - 1] +
                this.rukuArray[v1 - 1][v2 - 1].juzPageIndex
            );
        } else {
          this.gotoPageNum(this.surahService.juzPageNumbers[parseInt(val) - 1]);
          if (val > 30) this.gotoPageNum(this.pages.length);
        }
        break;
      case "surah":
        this.gotoPageNum(this.surahService.surahPageNumbers[parseInt(val) - 1]);
        if (val > 114) this.gotoPageNum(this.pages.length);
        break;

      default:
        this.gotoPageNum(this.surahService.juzPageNumbers[parseInt(val) - 1]);
        break;
    }
  }
  translationMode(doToggle: boolean) {
    if (doToggle) this.tMode = !this.tMode;
    if (this.tMode === true) {
      this.lines = this.translationLines;
      document.querySelector(".content-wrapper").classList.add("ur");
    } else {
      this.lines = this.arabicLines;
      document.querySelector(".content-wrapper").classList.remove("ur");
    }
  }

  showSurahInfo() {
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = res;
      this.surahService.surahInfo = [...res];
      this.currentSurahInfo = this.surahService.surahInfo.find((s) => {
        return parseInt(s.index) == parseInt(this.surah.number);
      });
      console.log(this.currentSurahInfo);
      this.presentSurahInfo(this.currentSurahInfo);
    });
  }
  async showPageInfo() {
    const page = this.pages[this.currentPage - 1];
    const words = [...this.lines]
      .filter(
        (a, i, r) =>
          !(
            a.includes(this.surahService.diacritics.BISM) ||
            r[i + 1]?.includes(this.surahService.diacritics.BISM)
          )
      )
      .join("\n")
      .split(" ");
    const alert = await alertController.create({
      header: `On this page (#${this.currentPage})`,
      subHeader: `Detailed analysis...`,
      message: `Words: ${words.length} <br />
      Unique Words: ${new Set(words).size} <br />
      Unique Words w/o Diacritics: ${
        new Set(this.surahService.tashkeelRemover(words.join(" ")).split(" "))
          .size
      } <br />
      Ayahs: ${
        // Need to add number in the equation too, const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
        page.split(this.surahService.diacritics.AYAH_MARK).length - 1
      } <br />
      Surah Beginnings: ${
        page.split(this.surahService.diacritics.BISM).length - 1
      } <br />
      Ruku Ends: ${
        page.split(this.surahService.diacritics.RUKU_MARK).length - 1
      } <br />
      Lines: ${this.lines.length} <br />
      Mushaf Page No.: ${this.currentPageCalculated}`,
    });
    alert.present();
  }

  async presentSurahInfo(s) {
    const alert = await alertController.create({
      header: `${s.index}. ${s.title}`,
      subHeader: `${s.type}`,
      message: `Surah ${s.title} (${s.titleAr}) has ${
        s.count
      } Ayahs, was revealed in ${s.place} and is spanned over ${
        s.juz?.length
      } juz, i.e. ${s.juz[0].index}${
        s.juz.length > 1
          ? "-" +
            s.juz[s.juz.length - 1].index +
            ".<br><br>" +
            this.getJuzDistribution(s.juz)
          : ""
      }.`,
      buttons: [
        {
          role: "cancel",
          text: "Ok",
        },
      ],
    });
    alert.present();
  }

  getJuzDistribution(juz): string {
    let d = "";
    for (let j of juz) {
      d += `Verses ${j.verse.start}-${j.verse.end} in juz ${j.index}.<br>`;
    }
    return d;
  }

  toggleHifzMode() {
    this.hMode = !this.hMode;
    let el: HTMLElement = document.querySelector(".content-wrapper");
    el.style.color = this.hMode ? "white" : "black";
  }

  toggleIconOutline(iconName: string) {
    if (iconName.endsWith("-outline")) return iconName.replace("-outline", "");
    else return (iconName += "-outline");
  }
  addSpan(line: string): string {
    // if (this.ayah_marks.some((mark) => line.includes(mark))) {
    //   this.ayah_marks.forEach((mark, i) => {
    //     if (line.includes(mark)) {
    //       const re = new RegExp(mark, "g");
    //       line = line.replace(
    //         re,
    //         `<span class='ayah_mark ayah_mark${i + 1}'>${mark}</span>`
    //       );
    //     }
    //   });
    // }
    line = line.replace("بْ", "<span style='color:#ff2d5b'>بْ</span>");

    return line;
  }
  addIndicators(line: string, i: number): string {
    if (line.includes(this.surahService.diacritics.RUKU_MARK)) {
      // const ayahNumber = this.surahService.e2a(
      //   this.surahService
      //     .a2e(this.surahService.p2e(line))
      //     ?.replace(/[^0-9]/g, "")
      // );
      let rukuNumber = 0;
      const juzrukuarr = this.rukuArray[this.juzCalculated - 1];
      console.log(this.juzCalculated, this.currentPageCalculated, juzrukuarr);
      juzrukuarr?.forEach((el, index) => {
        const mushafPageNumber =
          el.pageNumber ||
          this.surahService.juzPageNumbers[this.juzCalculated - 1] +
            el.juzPageIndex;
        if (
          this.currentPageCalculated === mushafPageNumber &&
          el.lineIndex === i
        )
          rukuNumber = index;
      });
      return `<div>۰</div><div> ع </div><div style="font-size: 16px; margin-top: 3px;">${this.surahService.e2a(
        (rukuNumber + 1).toString()
      )}</div>`;
    } else return "";
  }
  toggleMuhammadiFont() {
    document.querySelector(".page-wrapper").classList.toggle("ar2");
  }
  getFirstAndLastAyahNumberOnPage(): FirstLastAyah {
    if (
      (this.juzmode && this.isCompleteMushaf && this.currentPage === 1) ||
      !this.juzmode
    )
      return;
    //first ayah
    const re = new RegExp(`${this.surahService.diacritics.AYAH_MARK}[۱-۹]`);
    let lineCounter = 0;
    let txt = "";
    do {
      txt = this.lines[lineCounter];
      lineCounter++;
    } while (!re.test(txt));
    let firstVerseNum = parseInt(
      this.getEnNumber(
        txt
          .split(" ")
          .find((word) => re.test(word))
          .split(this.surahService.diacritics.AYAH_MARK)[1]
      )
    );
    //last ayah
    let lastLineWordsArr = this.lines[this.lines?.length - 1].trim().split(" ");
    let lastVerseNum = parseInt(
      this.getEnNumber(
        lastLineWordsArr[lastLineWordsArr.length - 1]?.split(
          this.surahService.diacritics.AYAH_MARK
        )[1]
      )
    );
    console.log(
      `FIRST AND LAST AYAH ON PAGE: ${firstVerseNum} ${lastVerseNum}`
    );
    let firstSurahNum = this.getCorrectedSurahNumberWithRespectTo(0);
    let lastSurahNum = this.getCorrectedSurahNumberWithRespectTo(
      this.lines?.length - 1
    );
    const firstLastAyah = {
      first: {
        firstSurahNum,
        firstVerseNum,
        verseId: `${firstSurahNum}:${firstVerseNum}`,
      },
      last: {
        lastSurahNum,
        lastVerseNum,
        verseId: `${lastSurahNum}:${lastVerseNum}`,
      },
    };
    console.log(firstLastAyah);
    return firstLastAyah;
  }
  getEnNumber(num: string) {
    return this.surahService
      .a2e(this.surahService.p2e(num))
      ?.replace(/[^0-9]/g, "");
  }

  toggleIgnoreTashkeel(val) {
    this.ignoreTashkeel = !this.ignoreTashkeel;
    this.onSearchChange(val);
  }

  // returns a [pageIndex,lineIndex] on a search
  onSearchChange(val) {
    let searchText = val;
    if (!searchText || searchText == "") return;
    var start = new Date().getTime();
    searchText = this.surahService.getArabicScript(searchText);
    let arr: SearchResultsList[] = [];
    let cumulativeTotal = 0;
    let result = [];
    this.pages.forEach((v, pageIndex) => {
      v = this.surahService.getArabicScript(v);
      if (this.ignoreTashkeel) {
        v = this.surahService.tashkeelRemover(
          this.surahService.getArabicScript(v)
        );
        searchText = this.surahService.tashkeelRemover(searchText);
      }
      if (v.includes(searchText)) {
        result = v.split("\n").filter((l, lineIndex) => {
          if (l.includes(searchText)) {
            const charIndices = l
              .split(searchText)
              .map(
                function (culm) {
                  return (this.pos += culm.length + searchText.length);
                },
                { pos: -searchText.length }
              )
              .slice(0, -1);
            cumulativeTotal += charIndices.length;
            arr.push({
              lineText: l,
              searchText,
              pageIndex,
              lineIndex,
              charIndices,
            });
          }
          return l.includes(searchText);
        });
        // let lineIndex = v.split("\n").findIndex((l) => l.includes(searchText));
      }
    });
    const searchTimeSecs = (new Date().getTime() - start) / 1000;
    console.log(result, arr);
    this.searchResults = {
      results: arr,
      total: cumulativeTotal,
      searchTimeSecs,
    };
    arr.forEach((indices) => {
      let output = this.getLineTextFromIndices(
        indices.pageIndex,
        indices.lineIndex
      );
    });
  }
  getLineTextFromIndices(pageIndex, lineIndex) {
    return this.pages[pageIndex].split("\n")[lineIndex];
  }
  gotoPageNum(p) {
    if (!p || p > 611 || p < 1) return;
    this.currentPage = parseInt(p);
    this.lines = this.pages[this.currentPage - 1].split("\n");

    this.setBookmark();
    this.updateCalculatedNumbers();
    this.getFirstAndLastAyahNumberOnPage();
  }
  gotoPageAndHighlightLine(r: SearchResultsList) {
    console.log(r.pageIndex, r.lineIndex);
    this.gotoPageNum(+r.pageIndex + 1);
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.changeDetectorRef.detectChanges();
    setTimeout(() => {
      let el = document.querySelector(
        `#line_${r.lineIndex} span`
      ) as HTMLElement;
      el.style.color = "#2a86ff";

      /*
       * Logic - Hightlight multiple matches in same line
       * Working, but match is on text without tashkeel, hence can't "show it properly
       */

      /* const lineText = r.lineText; //el.innerText;
      let highlightedText = "";
      let currentIndex = 0;

      for (let i = 0; i < r.charIndices.length; i++) {
        const charIndex = r.charIndices[i];
        const match = lineText.substring(
          charIndex,
          charIndex + r.searchText.length
        );

        highlightedText += lineText.substring(currentIndex, charIndex);
        highlightedText += `<span style="background-color: yellow">${match}</span>`;
        currentIndex = charIndex + r.searchText.length;
      }

      highlightedText += lineText.substring(currentIndex);
      el.innerHTML = highlightedText; */

      el.classList.add("highlight-line");
      setTimeout(() => {
        el.classList.remove("highlight-line");
      }, 1000);
    }, 100);
  }
  updateCalculatedNumbers() {
    this.juzCalculated = this.surahService.juzCalculated(this.currentPage);
    this.surahCalculated = this.surahService.surahCalculated(this.currentPage);
    if (!this.isCompleteMushaf) {
      if (this.juzsurahmode)
        this.currentPageCalculated =
          this.currentPage +
          this.surahService.surahPageNumbers[parseInt(this.title) - 1] -
          1;
      else
        this.currentPageCalculated =
          this.currentPage +
          this.surahService.juzPageNumbers[parseInt(this.title) - 1] -
          1;
      this.surahCalculatedForJuz = this.surahService.surahCalculated(
        this.currentPageCalculated
      );
      this.juzCalculated = this.surahService.juzCalculated(
        this.currentPageCalculated
      );
      this.surahCalculated = this.surahService.surahCalculated(
        this.currentPageCalculated
      );
    } else if (this.isCompleteMushaf)
      this.currentPageCalculated = this.currentPage;
    console.log(
      "JUZ-SURAH CALCULATED",
      this.juzCalculated,
      this.surahCalculated
    );
  }
  vsChange(ev) {
    this.startIndex = ev.startIndex;
  }
  readTafseerOf(ev) {
    // const [s, a] = ev.target.value.split(":");
    // console.log(s, a);
    // this.readTafseer(s, a);
    this.readTrans(ev.target.value);
  }
  readTafseer(s, a, m = "/en.itani") {
    var url = `http://api.alquran.cloud/v1/ayah/${s}:${a}`;
    //`https://api.quran.com/api/v4/quran/tafsirs/169?page_number=${s}`;
    //`https://api.quran.com/api/v4/quran/tafsirs/159?chapter_number=${s}&verse_key=${a}`;
    //`https://tafsir.app/get.php?src=${m}&s=${s}&a=${a}`
    this.httpClient.get(url).subscribe((resAr: any) => {
      this.httpClient.get(url + m).subscribe((resTrans: any) => {
        this.presentAlert(
          `${s}:${a}`,
          resTrans.data.edition.name,
          `${resAr.data.text} \n\n${resTrans.data.text}`
        );
      });
    });
  }
  readTrans(verseKey, lang = "en") {
    let url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?language=${lang}&fields=text_indopak&words=true&word_fields=text_indopak&translations=131,151,158,84&translation_fields=resource_name&audio=2`;
    // const u = "https://api.qurancdn.com/api/qdc/verses/by_chapter/52?words=true&translation_fields=resource_name,language_id&per_page=15&fields=text_uthmani,chapter_id,hizb_number,text_imlaei_simple&translations=131,151,234,158&reciter=7&word_translation_language=en&page=1&from=52:35&to=52:49&word_fields=verse_key,verse_id,page_number,location,text_uthmani,code_v1,qpc_uthmani_hafs&mushaf=2"
    this.httpClient.get(url).subscribe((res: any) => {
      console.log(res);
      let verse = res.verse;
      let msg = "";
      msg += `${verse.text_indopak.replace(/ۡ/g, "ْ")}<br>`;
      verse.translations.forEach((trans) => {
        msg += `${trans.text} <br> <small>— <i>${trans.resource_name}</i> </small> <br><br>`;
      });
      verse.words.forEach((w) => {
        msg += `${w.text_indopak} — ${w.translation.text} <br>`;
      });
      this.presentAlert(msg, verse.verse_key);
    });
  }
  copyAnything = (text: string) => window.navigator.clipboard.writeText(text);
  convertToPlain(html) {
    let divEl = document.createElement("div");
    divEl.innerHTML = html;
    return divEl.textContent || divEl.innerText || "";
  }
  copyResults(copyResultEl) {
    let result = `Found ${this.searchResults.results.length} (${this.searchResults.total}) Results in ${this.searchResults.searchTimeSecs} sec:\n\n`;
    this.searchResults.results.forEach((r) => {
      let juzNum: number;
      if (this.isCompleteMushaf)
        juzNum = this.surahService.juzCalculated(r.pageIndex);
      else if (this.juzmode)
        juzNum = this.surahService.juzCalculated(
          r.pageIndex +
            this.surahService.juzPageNumbers[parseInt(this.title) - 1]
        );
      else if (this.juzsurahmode)
        juzNum = this.surahService.juzCalculated(
          r.pageIndex +
            this.surahService.surahPageNumbers[parseInt(this.title) - 1]
        );
      result += `${this.getLineTextFromIndices(
        r.pageIndex,
        r.lineIndex
      )}\nPage ${r.pageIndex + 1} Line ${r.lineIndex + 1} | Juz ${juzNum}\n\n`;
    });
    this.copyAnything(result);
    this.copyResultsBG = "primary";
    setTimeout(() => {
      this.copyResultsBG = "dark";
    }, 1000);
    // this.presentAlert("Copied"+ this.searchResults.length+ "results successfully!");
  }
  playAudio(lang = "en") {
    const ayahList = this.getAyahsListOnPage();
    const [verseIdList, verseIdListForAudio] = [
      ayahList.verseIdList,
      ayahList.verseIdListForAudio,
    ];

    // Audio already playing
    if (this.audioPlaying) {
      console.log("Audio already playing");
      this.audio.pause();
      this.audioPlaying = false;
      return;
    }
    console.log(this.audio?.src);
    // Audio not playing and not paused
    if (!this.audio) {
      console.log("// Audio not playing and not paused");
      let url = `https://api.quran.com/api/v4/verses/by_key/${verseIdList[0]}?language=${lang}&audio=${this.qariId}`;
      this.httpClient.get(url).subscribe((res: any) => {
        console.log(res);
        this.audioSrc = "https://verses.quran.com/" + res.verse.audio?.url;
        if (!res.verse.audio) {
          this.surahService.presentToastWithOptions(
            `The selected Qari might not have the audio for the verse ${verseIdList[0]}. Try another Qaris from the list.`,
            "warning",
            "middle"
          );
          return;
        }
        // https://verses.quran.com/Shatri/mp3/059010.mp3 or https://audio.qurancdn.com/AbdulBaset/Murattal/mp3/001005.mp3
        this.audio = new Audio(this.audioSrc);
        this.audioPlayRoutine(verseIdListForAudio, verseIdList);
      });
    }

    // Audio not playing but paused
    else if (this.audio.paused) {
      console.log("Audio not playing but paused");

      this.audioPlayRoutine(verseIdListForAudio, verseIdList);
    }
  }
  audioPlayRoutine(verseIdListForAudio, verseIdList) {
    console.log(verseIdListForAudio);
    this.setAudioSpeed(this.audioSpeed);
    this.audioPlaying = true;
    this.audio.play();
    this.playingVerseNum = verseIdList[this.audioPlayIndex - 1];

    let pageFlipping = true;
    this.audio.onended = (ev) => {
      console.log("PLAY ENDED event");
      //firstAndLast.first.firstSurahNum == firstAndLast.last.lastSurahNum
      // Finished playing last ayah on page
      if (this.audioPlayIndex == verseIdListForAudio.length) {
        if (pageFlipping) {
          console.log("IF part pageflip");
          this.audio.src = "assets/page-flip.mp3";
          this.audio.play();
          pageFlipping = false;
        } else {
          console.log("ELSE part pageflip");
          this.stopAudio();
          this.gotoPageNum(this.currentPage + 1);
          this.playAudio();
        }
      }
      if (this.audioPlayIndex < verseIdListForAudio.length) {
        const re = "mp3/" + verseIdListForAudio[this.audioPlayIndex] + ".mp3";
        this.audio.src = this.audioSrc.replace(/mp3\/(.*?)\.mp3/, re);
        this.setAudioSpeed(this.audioSpeed);
        this.audio.play();
        this.playingVerseNum = verseIdList[this.audioPlayIndex];
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `Quran ${this.playingVerseNum} | Page ${
              this.isCompleteMushaf
                ? this.currentPage
                : this.currentPageCalculated
            }`,
            artist: `Surah ${
              this.surahService.surahNames[
                parseInt(this.playingVerseNum.split(":")[0]) - 1
              ]
            }`,
            album: `Juz ${this.juzCalculated} ${
              this.surahService.juzNames[this.juzCalculated - 1]
            }`,
          });
        }
        console.log(this.audio.src);
        this.audioPlayIndex++;
      }
    };
  }
  stopAudio(persistIndex?: boolean) {
    // this.audio.src = "";
    this.audio.pause();
    this.audio = undefined;
    this.audioPlaying = false;
    if (!persistIndex) this.audioPlayIndex = 1;
  }
  setAudioSpeed(s) {
    if (this.audio) this.audio.playbackRate = s;
  }
  getAyahsListOnPage(): {
    verseIdList: Array<string>;
    verseIdListForAudio: Array<string>;
  } {
    const firstAndLast = this.getFirstAndLastAyahNumberOnPage();
    let verseIdList = [];
    let verseIdListForAudio = [];
    const firstSurahInfo = this.surahInfo.find((s) => {
      return parseInt(s.index) == firstAndLast.first.firstSurahNum;
    });
    const lastSurahInfo = this.surahInfo.find((s) => {
      return parseInt(s.index) == firstAndLast.last.lastSurahNum;
    });
    console.log(firstSurahInfo, lastSurahInfo);

    let counter = 0;
    for (
      let i = firstAndLast.first.firstSurahNum;
      i <= firstAndLast.last.lastSurahNum;
      i++
    ) {
      let countTill = firstSurahInfo.count + counter;
      console.log({ countTill, fCounter: firstSurahInfo.count, counter });
      if (firstAndLast.first.firstSurahNum == firstAndLast.last.lastSurahNum) {
        countTill = firstAndLast.last.lastVerseNum;
      }
      if (i > firstAndLast.first.firstSurahNum) {
        if (i == firstAndLast.last.lastSurahNum)
          countTill = firstAndLast.last.lastVerseNum;
        else
          countTill = this.surahInfo.find((s) => {
            return (
              parseInt(s.index) == firstAndLast.first.firstSurahNum + counter
            );
          }).count;

        // Add Bism line before each 'next surah'
        verseIdList.push(`${1}:${1}`);
        verseIdListForAudio.push(`${this.padStart(1) + this.padStart(1)}`);
      }
      for (
        let j =
          i > firstAndLast.first.firstSurahNum
            ? 1
            : firstAndLast.first.firstVerseNum;
        j <= countTill;
        j++
      ) {
        verseIdList.push(`${i}:${j}`);
        verseIdListForAudio.push(`${this.padStart(i) + this.padStart(j)}`);
      }
      counter++;
    }
    console.log(verseIdList);
    return { verseIdList, verseIdListForAudio };
  }
  padStart(val, num = 3) {
    return val.toString().padStart(3, "0");
  }
  fetchQariList() {
    this.surahService.fetchQariList().subscribe((res: any) => {
      console.log(res);
      this.reciters = res.reciters?.sort((a, b) => a.id - b.id);
      this.qariId = 7;
      this.selectedQari = this.reciters.find((r) => r.id == this.qariId);
      console.log(this.selectedQari);
    });
  }
  qariChanged(r) {
    console.log(r);
    this.selectedQari = r;
    this.qariId = parseInt(r);
  }
  getJuzNumber() {
    let result = "";
    // Complete Mushaf mode
    if (this.isCompleteMushaf) {
      if (this.surahCalculated === 1) result = "سورۃ";
      else
        result =
          this.surahService.juzNames[this.juzCalculated - 1] +
          " " +
          this.surahService.e2a(this.juzCalculated.toString());
    } else if (this.surahCalculatedForJuz === 1) result = "سورۃ";
    // Surah mode
    else if (this.juzsurahmode)
      result =
        this.surahService.juzNames[this.juzCalculated - 1] +
        " " +
        this.surahService.e2a(this.juzCalculated.toString());
    // Juz mode
    else
      result =
        this.surahService.juzNames[+this.title - 1] +
        " " +
        this.surahService.e2a(this.title.toString());
    return result;
  }
  setupLinks() {
    this.httpClient
      .get("https://archive.org/metadata/15-lined-saudi")
      .subscribe((res: any) => {
        if (res.files.filter((f) => f.size == "43240062")[0]) {
          const fileNameIdentifier = res.files
            .filter((f) => f.size == "43240062")[0]
            ?.name?.replace(".pdf", "")
            .trim();
          this.identifier = res.metadata.identifier;
          this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${fileNameIdentifier}_jp2.zip&file=${fileNameIdentifier}_jp2/${fileNameIdentifier}_`;
        } else {
          this.httpClient
            .get("https://archive.org/metadata/QuranMajeed-15Lines-SaudiPrint")
            .subscribe((res: any) => {
              this.identifier = res.metadata.identifier;
              this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${this.identifier}_jp2.zip&file=${res.metadata.identifier}_jp2/${this.identifier}_`;
              const fullUrl = `${
                this.incompleteUrl
              }${this.surahService.getPaddedNumber(
                this.currentPageCalculated
              )}.jp2&id=${this.identifier}&scale=${ImageQuality.High}&rotate=0`;
              this.fullImageUrl = fullUrl;
            });
        }
      });
  }
  async loadImg(p: number, quality: ImageQuality = ImageQuality.High) {
    const fullUrl = `${this.incompleteUrl}${this.surahService.getPaddedNumber(
      p
    )}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    this.fullImageUrl = fullUrl;
    // const alertmsg = await this.alertController.create({
    //   message: `<img src='${fullUrl}' />`,
    //   header: `Page #${this.currentPageCalculated}`,
    //   cssClass: "scanImgAlertBox",
    //   buttons: [
    //     {
    //       text: "Ok",
    //       role: "cancel",
    //     },
    //   ],
    // });
    // alertmsg.present();
  }
  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverController.dismiss();
    const alert = await this.alertController.getTop();
    if (alert) this.alertController.dismiss();
    if (this.audio) this.stopAudio();
  }
}
