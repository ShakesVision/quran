import { Component, OnInit } from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import { ToastController } from "@ionic/angular";
import { AlertController } from "@ionic/angular";
import { alertController } from "@ionic/core";
import { MushafLines } from "src/app/services/mushaf-versions";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: "app-read",
  templateUrl: "./read.page.html",
  styleUrls: ["./read.page.scss"],
})
export class ReadPage implements OnInit {
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

  mushafVersion = MushafLines.Fifteen;

  searchResults;

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
  constructor(
    private surahService: SurahService,
    public toastController: ToastController,
    public alert: AlertController,
    private router: Router,
    private httpClient: HttpClient,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    const juzData = this.router.getCurrentNavigation().extras.state?.juzData;
    const id = this.activatedRoute.snapshot.params.id;
    console.log(id);
    console.log(this.juzNumber, juzData);
    if (juzData) {
      this.surah = juzData.data;
      this.title = juzData.title;
      this.pages = this.surah.split("\n\n");
      this.lines = this.pages[this.currentPage - 1].split("\n");
      this.getLastAyahNumberOnPage();
    } else if (!juzData) {
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
      this.getLastAyahNumberOnPage();
    }

    //highlight helper listener
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

  tabulate(strIn) {
    //this.pages = strIn.split("\n\n");
    /* strIn = strIn.replace(/^\s+|\s+$/g, "").replace(/\r?\n|\r/g, "</td></tr>\n<tr><td>");    
    if (strIn.length != "")
      return "<table align='center' dir='rtl'>\n<tr><td>" + strIn + "</td></tr>\n</table>";
    else
      return "متن موجود نہیں!"; */
  }

  goToPage(n: number) {
    this.currentPage += n;
    this.arabicLines = this.pages[this.currentPage - 1].split("\n");
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
    this.getLastAyahNumberOnPage();
  }

  resetPopup(popup: HTMLElement) {
    popup.style.opacity = "0";
    popup.style.height = "0";
    popup.style.width = "0";
  }

  openTrans(event, n: number) {
    if (this.surah.urdu && !this.tMode) {
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
    } else if (!this.surah.urdu) {
      console.log("Translation not available!");
      this.presentToastWithOptions(
        `Translation for ${this.title} is not available!`,
        "top"
      );
    }
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
  async presentTransAlert(translation, line) {
    const alertmsg = await this.alert.create({
      subHeader: "ترجمہ برائے سطر " + line,
      message: translation,
      cssClass: "trans",
      buttons: [
        {
          text: "سبحان اللہ",
          role: "cancel",
          handler: () => {
            console.log("Cancel clicked.");
          },
        },
      ],
    });
    alertmsg.present();
  }
  fillerLineFix() {
    let div: HTMLElement = document.querySelector(".filler-lines");
    div.style.height = document.getElementById("line_0").clientHeight + "px";
  }
  changeFontSize(val) {
    var txt: HTMLElement = document.querySelector(".ar");
    var style = window
      .getComputedStyle(txt, null)
      .getPropertyValue("font-size");
    var currentSize = parseFloat(style);
    txt.style.fontSize = currentSize + val + "px";
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
    let el: HTMLElement = document.querySelector(".ar");
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
  addIndicators(line: string): string {
    if (line.includes("ۧ")) {
      const ayahNumber = this.surahService.e2a(
        this.surahService
          .a2e(this.surahService.p2e(line))
          ?.replace(/[^0-9]/g, "")
      );
      console.log(ayahNumber);
      return `<span>#</span><span>${ayahNumber}</span><span>#</span>`;
    } else return "";
  }
  toggleMuhammadiFont() {
    document.querySelector(".content-wrapper").classList.toggle("ar2");
  }
  getLastAyahNumberOnPage() {
    let lastAyahOnPageArray = this.lines[this.lines?.length - 1]
      .trim()
      .split(" ");
    let result =
      lastAyahOnPageArray[lastAyahOnPageArray.length - 1]?.split("۝")[1];
    result = this.surahService
      .a2e(this.surahService.p2e(result))
      ?.replace(/[^0-9]/g, "");
    console.log("LAST AYAH ON THIS PAGE: " + result);
    return result;
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

  // returns a [pageIndex,lineIndex] on a search
  onSearchChange(ev) {
    let searchText = ev.detail.value;
    if (!searchText || searchText == "") return;
    searchText = this.getArabicScript(searchText);
    let arr = [];
    let result = this.pages.filter((v, pageIndex) => {
      if (this.ignoreTashkeel)
        v = this.tashkeelRemover(this.getArabicScript(v));
      if (v.includes(searchText)) {
        let lineIndex = v.split("\n").findIndex((l) => l.includes(searchText));
        arr.push({ pageIndex, lineIndex });
        return true;
      }
    });
    console.log(result, arr);
    this.searchResults = arr;
    arr.forEach((indices) => {
      let output = this.getLineTextFromIndices(
        indices.pageIndex,
        indices.lineIndex
      );
      console.log(output);
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
  gotoPageAndHighlightLine(p, l) {
    console.log("going to page:" + p + " & line:" + l);
    this.currentPage = p + 1;
    this.lines = this.pages[this.currentPage - 1].split("\n");
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
}
