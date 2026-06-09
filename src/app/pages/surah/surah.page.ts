import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from "@angular/router";
import { SurahService } from "./../../services/surah.service";
import { Surah, Index } from "./../../services/surah";
import { AlertController, ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
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
    private toastController: ToastController,
    private translate: TranslateService,
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
    // Fetch full surah data from Firestore, then navigate to reader in Firestore mode
    const docId = item.remoteId;
    console.log('Fetching Firestore surah:', docId, item);
    this.surahService.getSurahById(docId).subscribe(
      (surahData) => {
        if (!surahData) {
          this.toast(this.translate.instant('surahAuth.surahNotFound'), 'danger');
          return;
        }
        // Store fetched data on the service for the reader to pick up
        this.surahService.currentSurah = { ...surahData, name: item.surahName };
        this.router.navigate(['/quran'], {
          state: { firestoreMode: true }
        });
      },
      (err) => {
        console.error('Failed to fetch surah:', err);
        this.toast(this.translate.instant('surahAuth.loadFailed'), 'danger');
      }
    );
  }

  async loginAlert() {
    console.log(this.loggedInUser);
    const alert = await this.alertController.create({
      header: this.translate.instant("surahAuth.loginSignup"),
      cssClass: "custom-alert",
      inputs: [
        {
          name: "email",
          id: "email",
          type: "email",
          placeholder: this.translate.instant("surahAuth.emailPlaceholder"),
          value: this.loggedInUser ? this.loggedInUser.email : null,
        },
        {
          name: "password",
          id: "password",
          type: "password",
          placeholder: this.translate.instant("surahAuth.passwordPlaceholder"),
        },
      ],
      buttons: [
        {
          ...(this.loggedInUser
            ? {
                text: this.translate.instant("surahAuth.logout"),
                handler: (data) => {
                  console.log("Logout: ");
                  this.surahService
                    .signout()
                    .then((res: any) => {
                      console.log(res);
                      this.toast(this.translate.instant("surahAuth.loggedOut"), "success-light");
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
          text: this.translate.instant("surahAuth.login"),
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
