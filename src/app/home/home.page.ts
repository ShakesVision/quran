import { HttpClient } from "@angular/common/http";
import { Component } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { AlertController, ModalController } from "@ionic/angular";
import { HomePageBanner } from "../models/common";
import { ProgressPage } from "../pages/progress/progress.page";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage {
  loading = false;
  banner: HomePageBanner = {
    text: "We are digitizing the 15 Lines Quran & translation in Unicode, which is a work in progress. You can also help us complete this project.",
    button: {
      show: true,
      text: "Contribute",
      color: "primary",
      fill: "outline",
      icon: {
        show: true,
        src: "assets/icon/hand-holding.svg",
        color: "primary",
      },
    },
    clickAction: "about",
    style: {
      boxShadow: "rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px",
      backgroundImage:
        "linear-gradient(288deg, var(--ion-color-secondary) 0%, var(--ion-color-light) 100%)",
      common: "",
    },
  };
  constructor(
    private alertController: AlertController,
    private modalController: ModalController,
    private httpClient: HttpClient,
    private domSanatizer: DomSanitizer
  ) {}
  ngOnInit() {
    this.loading = true;
    const url = `https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/App/HomePageBanner.json`;
    this.httpClient
      .get(url, { responseType: "json" })
      .subscribe((res: HomePageBanner) => {
        this.banner = res;
        this.banner.text = this.domSanatizer.bypassSecurityTrustHtml(
          res.text as string
        );
        this.loading = false;
      });
  }
  async open(name) {
    const modal = await this.modalController.create({
      component: ProgressPage,
      componentProps: { name },
      swipeToClose: true,
      mode: "ios",
    });
    modal.present();
  }
  darkModeToggle() {
    document.body.classList.toggle("dark");
  }
}
