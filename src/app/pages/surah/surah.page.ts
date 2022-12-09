import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from "@angular/router";
import { SurahService } from "./../../services/surah.service";
import { Surah, Index } from "./../../services/surah";
import { AlertController } from "@ionic/angular";

@Component({
  selector: "app-surah",
  templateUrl: "surah.page.html",
  styleUrls: ["surah.page.scss"],
})
export class SurahPage implements OnInit {
  items: Observable<Index[]>;

  constructor(
    private surahService: SurahService,
    private router: Router,
    private alertController: AlertController
  ) {}
  ngOnInit() {
    // this.items = this.surahService.getSurahs();
    this.items = this.surahService.getIndexes();
    this.items.subscribe((res) => console.log(res));
  }

  gotoRead(item) {
    this.surahService.getSurahById(item.remoteId).subscribe((res) => {
      console.log("my item: ", res);
      this.surahService.currentSurah = res;
      this.router.navigate(["/read"]);
    });
  }

  async loginAlert(item?) {
    console.log(item);
    const alert = await this.alertController.create({
      header: "Login / Signup",
      cssClass: "custom-alert",
      inputs: [
        {
          name: "email",
          id: "email",
          type: "email",
          placeholder: "Email...",
          value: item ? item.email : null,
        },
        {
          name: "password",
          id: "password",
          type: "password",
          placeholder: "Password...",
          value: item ? item.password : null,
        },
      ],
      buttons: [
        {
          ...(item
            ? {
                text: "Logout",
                handler: (data) => {
                  console.log("Logout");
                },
                cssClass: "delete-btn",
              }
            : null),
        },
        {
          text: "Signup",
          cssClass: "signup-btn",
          handler: (data) => {
            console.log(data);
          },
        },
        {
          text: "Login",
          cssClass: "add-btn",
          handler: (data) => {
            console.log(data);
          },
        },
      ],
    });
    alert.present();
  }
}
