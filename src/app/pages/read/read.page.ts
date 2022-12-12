import { ChangeDetectorRef, Component, OnInit, ViewChild } from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import { PopoverController, ToastController } from "@ionic/angular";
import { AlertController } from "@ionic/angular";
import { alertController } from "@ionic/core";
import { MushafLines } from "src/app/services/mushaf-versions";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { VirtualScrollerComponent } from "ngx-virtual-scroller";
import { Storage } from "@ionic/storage-angular";
import { FirstLastAyah } from "src/app/services/firstLastModels";

@Component({
  selector: "app-read",
  templateUrl: "./read.page.html",
  styleUrls: ["./read.page.scss"],
})
export class ReadPage implements OnInit {
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
  mushafVersion = MushafLines.Fifteen;

  searchResults: Array<string>;

  juzPages = [];

  surahPages = [];

  isCompleteMushaf: boolean;

  juzCalculated: number;

  surahCalculated: number;

  currentPageCalculated: number;

  surahCalculatedForJuz: number;

  rukuArray = [];

  surahArray = [];

  isResultSelected: boolean = false;

  surahInfo;

  ayah_marks = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    " ",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  ayah_numbers = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,
    79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97,
    98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
    113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
    128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
    143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157,
    158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
    173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187,
    188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202,
    203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217,
    218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232,
    233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247,
    248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262,
    263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277,
    278, 279, 280, 281, 282, 283, 284, 285, 286,
  ];
  title;
  juzNumber;
  ignoreTashkeel: boolean = true;
  juzmode: boolean;
  startIndex: number;
  copyResultsBG = "dark";
  searchTime;

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
      this.surah = juzData.data;
      this.title = juzData.title;
      this.pages = this.surah.split("\n\n");
      this.lines = this.pages[this.currentPage - 1].split("\n");
      // this.calculateRukuArray();
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

  async getBookmark() {
    await this.storage.create();
    this.storage.get("unicodeBookmark").then((pageNum) => {
      console.log("bookmark fetched:", pageNum);
      if (pageNum) this.gotoPageNum(pageNum);
    });
  }

  setBookmark() {
    if (this.juzmode && this.isCompleteMushaf)
      this.storage.set("unicodeBookmark", this.currentPage).then((_) => {});
  }
  goToPage(n: number) {
    this.currentPage += n;
    this.arabicLines = this.pages[this.currentPage - 1].split("\n");
    this.updateCalculatedNumbers();
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
        .classList.add("centered-table-text");
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
        this.presentToastWithOptions(
          `Translation for ${this.title} is not available!`,
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
  async presentToastWithOptions(msg, pos) {
    const toast = await this.toastController.create({
      message: msg,
      position: pos,
      duration: 2000,
      buttons: [
        {
          text: "Ok",
          role: "cancel",
          handler: () => {
            console.log("Cancel clicked.");
          },
        },
      ],
    });
    toast.present();
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
            this.presentToastWithOptions("Copied successfully!", "bottom");
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
      const juzrukuarr = this.isCompleteMushaf
        ? this.rukuArray[this.juzCalculated - 1]
        : this.rukuArray[parseInt(this.title) - 1];
      juzrukuarr?.forEach((el, index) => {
        const mushafPageNumber = this.isCompleteMushaf
          ? this.surahService.juzPageNumbers[this.juzCalculated - 1] +
            el.juzPageIndex
          : el.juzPageIndex + 1;
        if (this.currentPage === mushafPageNumber && el.lineIndex === i)
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
    //firat ayah
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
  getArabicScript(text) {
    return text
      .replace(/آ/g, "آ")
      .replace(/ا/g, "ا")
      .replace(/ب/g, "ب")
      .replace(/پ/g, "پ")
      .replace(/ت/g, "ت")
      .replace(/ٹ/g, "ٹ")
      .replace(/ث/g, "ث")
      .replace(/ج/g, "ج")
      .replace(/چ/g, "چ")
      .replace(/خ/g, "خ")
      .replace(/ح/g, "ح")
      .replace(/د/g, "د")
      .replace(/ڈ/g, "ڈ")
      .replace(/ذ/g, "ذ")
      .replace(/ر/g, "ر")
      .replace(/ڑ/g, "ڑ")
      .replace(/ز/g, "ز")
      .replace(/ژ/g, "ژ")
      .replace(/س/g, "س")
      .replace(/ش/g, "ش")
      .replace(/ص/g, "ص")
      .replace(/ض/g, "ض")
      .replace(/ط/g, "ط")
      .replace(/ظ/g, "ظ")
      .replace(/ع/g, "ع")
      .replace(/غ/g, "غ")
      .replace(/ف/g, "ف")
      .replace(/ک/g, "ك")
      .replace(/ق/g, "ق")
      .replace(/گ/g, "گ")
      .replace(/ل/g, "ل")
      .replace(/م/g, "م")
      .replace(/ن/g, "ن")
      .replace(/و/g, "و")
      .replace(/ہ/g, "ه")
      .replace(/ء/g, "ء")
      .replace(/ی/g, "ي")
      .replace(/ئ/g, "ئ")
      .replace(/ے/g, "ے")
      .replace(/ۃ/g, "ة")
      .replace(/ؤ/g, "ؤ")
      .replace(/إ/g, "إ")
      .replace(/أ/g, "أ")
      .replace(/ھ/g, "ه")
      .replace(/ الذي /g, " الذى ")
      .replace(/ علي /g, " على ")
      .replace(/ معني /g, " معنى ")
      .replace(/ إلي /g, " إلى ")
      .replace(/ تعاليٰ /g, " تعالىٰ ")
      .replace(/ النبي /g, " النبى ")
      .replace(/صلي الله عليه وسلم/g, "صلى الله عليه وسلم")
      .replace(/ في /g, " فى ")
      .replace(/ أبي /g, " أبى ")
      .replace(/ رضي الله عنه /g, " رضى الله عنه ")
      .replace(/ يري /g, " يرى ")
      .replace(/ وهي /g, " وهى ")
      .replace(/ أي /g, " أى ")
      .replace(/ التي /g, " التى ")
      .replace(/ فسيأتي /g, " فسيأتى ")
      .replace(/ الذي /g, " الذى ")
      .replace(/ إلي /g, " إلى ")
      .replace(/ فنفي /g, " فنفى ")
      .replace(/ الّذي /g, " الّذى ")
      .replace(/ النبي /g, " النبى ")
      .replace(/ صلّي /g, " صلّى ")
      .replace(/ إحدي /g, " إحدى ")
      .replace(/ يأتي /g, " يأتى ")
      .replace(/أي /g, " أى ")
      .replace(/ والدواعي /g, " والدواعى ")
      .replace(/ صلي /g, " صلى ");
  }

  toggleIgnoreTashkeel(val) {
    this.ignoreTashkeel = !this.ignoreTashkeel;
    this.onSearchChange(val);
  }

  // returns a [pageIndex,lineIndex] on a search
  onSearchChange(val) {
    console.log(this.ignoreTashkeel);
    let searchText = val;
    if (!searchText || searchText == "") return;
    var start = new Date().getTime();
    searchText = this.getArabicScript(searchText);
    let arr = [];
    let result = [];
    this.pages.forEach((v, pageIndex) => {
      v = this.getArabicScript(v);
      if (this.ignoreTashkeel) {
        v = this.tashkeelRemover(this.getArabicScript(v));
        searchText = this.tashkeelRemover(searchText);
      }
      if (v.includes(searchText)) {
        result = v.split("\n").filter((l, lineIndex) => {
          if (l.includes(searchText)) {
            arr.push({ pageIndex, lineIndex });
          }
          return l.includes(searchText);
        });
        // let lineIndex = v.split("\n").findIndex((l) => l.includes(searchText));
      }
    });
    this.searchTime = (new Date().getTime() - start) / 1000 + " sec";
    console.log(result, arr);
    this.searchResults = arr;
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
  getRukuArray() {
    // this.surah.find(rukumark)
    // this.surah.split("\n\n");
    // see onSearchChange for full search
  }
  gotoPageNum(p) {
    if (!p || p > 611 || p < 1) return;
    this.currentPage = parseInt(p);
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.setBookmark();
    this.updateCalculatedNumbers();
    this.getFirstAndLastAyahNumberOnPage();
  }
  gotoPageAndHighlightLine(p, l) {
    console.log(p, l);
    this.gotoPageNum(+p + 1);
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.changeDetectorRef.detectChanges();
    setTimeout(() => {
      let el = document.getElementById("line_" + l);
      el.style.color = "#2a86ff";
      el.classList.add("highlight-line");
      setTimeout(() => {
        el.classList.remove("highlight-line");
      }, 1000);
    }, 100);
  }
  tashkeelRemover(text) {
    return text
      .replace(/َ/g, "")
      .replace(/ِ/g, "")
      .replace(/ُ/g, "")
      .replace(/ّ/g, "")
      .replace(/ْ/g, "")
      .replace(/ٌ/g, "")
      .replace(/ً/g, "")
      .replace(/ٍ/g, "")
      .replace(/ٌ/g, "")
      .replace(/ۡ/g, "")
      .replace(/ٰ/g, "")
      .replace(/ٓ/g, "")
      .replace(/ٗ/g, "")
      .replace(/ۖ‏/g, "")
      .replace(/ۚ/g, "")
      .replace(/ؕ/g, "")
      .replace(/ۙ/g, "")
      .replace(/ۢ/g, "")
      .replace(/۟/g, "")
      .replace(/ۤ/g, "")
      .replace(/ٖ/g, "");
  }
  updateCalculatedNumbers() {
    this.juzCalculated = this.surahService.juzCalculated(this.currentPage);
    this.surahCalculated = this.surahService.surahCalculated(this.currentPage);
    if (!this.isCompleteMushaf) {
      this.currentPageCalculated =
        this.currentPage +
        this.surahService.juzPageNumbers[parseInt(this.title) - 1] -
        1;
      this.surahCalculatedForJuz = this.surahService.surahCalculated(
        this.currentPageCalculated
      );
    }
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
    let result =
      "Found " +
      this.searchResults.length +
      " Results in " +
      this.searchTime +
      ":\n\n";
    this.searchResults.forEach((r: any) => {
      result += `${this.getLineTextFromIndices(
        r.pageIndex,
        r.lineIndex
      )}\nPage ${r.pageIndex} Line ${
        r.lineIndex
      } | Juz ${this.surahService.juzCalculated(r.pageIndex)}\n\n`;
    });
    this.copyAnything(result);
    this.copyResultsBG = "primary";
    setTimeout(() => {
      this.copyResultsBG = "dark";
    }, 1000);
    // this.presentAlert("Copied"+ this.searchResults.length+ "results successfully!");
  }
  playAudio(reciterId = 7, lang = "en") {
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
      let url = `https://api.quran.com/api/v4/verses/by_key/${verseIdList[0]}?language=${lang}&audio=${reciterId}`;
      this.httpClient.get(url).subscribe((res: any) => {
        console.log(res);
        this.audioSrc = "https://verses.quran.com/" + res.verse.audio.url;
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
    this.audio.onended = (ev) => {
      //firstAndLast.first.firstSurahNum == firstAndLast.last.lastSurahNum
      if (this.audioPlayIndex == verseIdListForAudio.length) {
        this.stopAudio();
      }
      if (this.audioPlayIndex < verseIdListForAudio.length) {
        const re = "mp3/" + verseIdListForAudio[this.audioPlayIndex] + ".mp3";
        this.audio.src = this.audioSrc.replace(/mp3\/(.*?)\.mp3/, re);
        this.setAudioSpeed(this.audioSpeed);
        this.audio.play();
        this.playingVerseNum = verseIdList[this.audioPlayIndex];
        console.log(this.audio.src);
        this.audioPlayIndex++;
      }
    };
  }
  stopAudio() {
    // this.audio.src = "";
    this.audio.pause();
    this.audio = undefined;
    this.audioPlaying = false;
    this.audioPlayIndex = 1;
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
  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverController.dismiss();
    const alert = await this.alertController.getTop();
    if (alert) this.alertController.dismiss();
  }
}
