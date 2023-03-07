import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from "@angular/router";
import { SurahService } from "./../../services/surah.service";
import { Surah, Index } from "./../../services/surah";
import { AlertController, ToastController } from "@ionic/angular";
import { User } from "firebase/auth";

@Component({
  selector: "app-surah",
  templateUrl: "surah.page.html",
  styleUrls: ["surah.page.scss"],
})
export class SurahPage implements OnInit {
  items: Observable<Index[]>;
  user;
  loggedInUser: User;
  isLoggedIn: boolean = false;
  isAdmin: boolean = false;
  constructor(
    private surahService: SurahService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}
  ngOnInit() {
    // this.items = this.surahService.getSurahs();
    this.items = this.surahService.getIndexes();
    this.items.subscribe((res) => console.log(res));
  }

  ionViewWillEnter() {
    this.surahService.isLoggedIn((user: User) => {
      console.log("subscription authstate", user);
      this.loggedInUser = user;
      this.isLoggedIn = !!user;
      this.isAdmin = user?.email == "sarbakafgroup@gmail.com";
    });
  }

  gotoRead(item) {
    this.surahService.getSurahById(item.remoteId).subscribe((res) => {
      console.log("my item: ", res);
      this.surahService.currentSurah = res;
      this.router.navigate(["/read"]);
    });
  }

  async loginAlert() {
    console.log(this.loggedInUser);
    const alert = await this.alertController.create({
      header: "Login / Signup",
      cssClass: "custom-alert",
      inputs: [
        {
          name: "email",
          id: "email",
          type: "email",
          placeholder: "Email...",
          value: this.loggedInUser ? this.loggedInUser.email : null,
        },
        {
          name: "password",
          id: "password",
          type: "password",
          placeholder: "Password...",
        },
      ],
      buttons: [
        {
          ...(this.loggedInUser
            ? {
                text: "Logout",
                handler: (data) => {
                  console.log("Logout: ");
                  this.surahService
                    .signout()
                    .then((res: any) => {
                      console.log(res);
                      this.toast("Logged out successfully!", "success-light");
                    })
                    .catch((err) => {
                      console.log(err);
                      this.toast(err.message, "danger");
                    });
                },
                cssClass: "delete-btn",
              }
            : null),
        },
        /* {
          text: "Signup",
          cssClass: "signup-btn",
          handler: (data) => {
            console.log("In Signup:", data);
            this.surahService
              .signup(data.email, data.password)
              .then((res: any) => {
                console.log(res);
                this.toast(
                  `Account created! Logged in as ${res.user.email}`,
                  "success-light"
                );
              })
              .catch((err) => {
                console.log(err);
                this.toast(err.message, "danger");
              });
          },
        }, */
        {
          text: "Login",
          cssClass: "add-btn",
          handler: (data) => {
            console.log("In Login:");
            this.surahService
              .signin(data.email, data.password)
              .then((res: any) => {
                console.log(res);
                this.toast(
                  `Login successful as ${res.user.email}`,
                  "success-light"
                );
                this.loggedInUser = res.user;
              })
              .catch((err) => {
                console.log(err);
                this.toast(err.message, "danger");
              });
          },
        },
      ],
    });
    alert.present();
  }
  async toast(msg, clr = "primary") {
    const t = await this.toastController.create({
      message: msg,
      color: clr,
      duration: 5000,
    });
    t.present();
  }
}
