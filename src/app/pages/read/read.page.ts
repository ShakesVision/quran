import { Component, OnInit } from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import { ToastController } from "@ionic/angular";
import { AlertController } from "@ionic/angular";
import { alertController } from "@ionic/core";

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
  currentSurahInfo;

  constructor(
    private surahService: SurahService,
    public toastController: ToastController,
    public alert: AlertController
  ) {}

  ngOnInit() {
    this.surah = this.surahService.currentSurah;
    this.pages = this.surah.arabic.split("\n\n");
    this.arabicLines = this.pages[this.currentPage - 1].split("\n");
    this.lines = this.arabicLines;
    console.log(this.surah.urdu);
    if (this.surah.urdu && this.surah.urdu != "") {
      this.translationExists = true;
      this.tPages = this.surah.urdu.split("\n\n");
      this.translationLines = this.tPages[this.currentPage - 1].split("\n");
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
        `Translation for Surah ${
          this.surah.name.split(" ")[0]
        } is not available!`,
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

  async showSurahInfo() {
    console.log(this.surah.number);
    console.log(this.surahService.surahInfo);
    this.currentSurahInfo = this.surahService.surahInfo.find((s) => {
      return parseInt(s.index) == parseInt(this.surah.number);
    });
    console.log(this.currentSurahInfo);
    this.presentSurahInfo(this.currentSurahInfo);
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

  toggleIconOutline(iconName:string) {
    console.log(iconName);
    if(iconName.endsWith('-outline')) return iconName.replace('-outline','');
    else return iconName+='-outline';
  }
}
