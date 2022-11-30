import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { ModalController, NavParams } from "@ionic/angular";
import { ComponentProps } from "@ionic/core";

@Component({
  selector: "app-progress",
  templateUrl: "./progress.page.html",
  styleUrls: ["./progress.page.scss"],
})
export class ProgressPage implements OnInit {
  name: string = this.navParams.get("name");
  url: string;
  data: SafeHtml;
  loading = false;
  constructor(
    private httpClient: HttpClient,
    private navParams: NavParams,
    private modalController: ModalController,
    private domSanatizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loading = true;
    this.url = `https://cdn.jsdelivr.net/gh/ShakesVision/Quran_archive@master/App/${this.name}.html`;
    this.httpClient.get(this.url, { responseType: "text" }).subscribe((res) => {
      this.data = this.domSanatizer.bypassSecurityTrustHtml(res);
      this.loading = false;
    });
  }
  dismissModal() {
    this.modalController.dismiss();
  }
}
