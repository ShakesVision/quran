import { Component, OnInit } from "@angular/core";
import { SurahService } from "./../../services/surah.service";
import { ToastController } from "@ionic/angular";
import { AlertController } from "@ionic/angular";

@Component({
  selector: "app-read",
  templateUrl: "./read.page.html",
  styleUrls: ["./read.page.scss"],
})
export class ReadPage implements OnInit {
  surah;
  pages: string[];
  translations: string[];
  lines: string[];
  translationLines: string[];
  currentPage: number = 1;
  translation: string;

  constructor(
    private surahService: SurahService,
    public toastController: ToastController,
    public alert: AlertController
  ) {}

  ngOnInit() {
    this.surah = this.surahService.currentSurah;
    this.pages = this.surah.arabic.split("\n\n");
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.translations = this.surah.urdu.split("\n\n");
    this.translationLines = this.translations[this.currentPage - 1].split("\n");    
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
    this.lines = this.pages[this.currentPage - 1].split("\n");
    this.translationLines = this.translations[this.currentPage - 1].split("\n");
    //close popup if open
    let popup: HTMLElement = document.querySelector(".popup");
    popup.style.opacity = "0";
    popup.style.height = "0";
    popup.style.width = "0";
  }

  openTrans(event, n: number) {
    if (this.surah.urdu) {
      this.translation = this.translationLines[n];
      console.log((n + 1) + '. ' + this.translation);
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
        popup.style.opacity = "0";
        popup.style.height = "0";
        popup.style.width = "0";
      });
      popup.addEventListener("click", () => {
        popup.style.opacity = "0";
        popup.style.height = "0";
        popup.style.width = "0";
      });
    } else {
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
}
