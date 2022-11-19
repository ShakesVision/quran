import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Storage } from "@ionic/storage-angular";

@Component({
  selector: "app-juz",
  templateUrl: "./juz.page.html",
  styleUrls: ["./juz.page.scss"],
})
export class JuzPage implements OnInit {
  constructor(
    private router: Router,
    private storage: Storage,
    private httpClient: HttpClient
  ) {}

  ngOnInit() {
    this.storage.create().then((_) => console.log("storage created"));
  }

  gotoReadJuz(juz) {
    if (typeof juz === "number") juz = "Juz" + juz;
    this.storage
      .get(juz)
      .then((res) => {
        if (res) {
          console.log("found in device storage", res);
          this.navigate(res);
        } else {
          console.log("NOT found in local storage, fetching from server...");
          this.fetchAndSaveInDeviceStorage(juz);
        }
      })
      .catch((err) => {
        console.log("error reading the database.");
      });
  }
  fetchAndSaveInDeviceStorage(juz) {
    this.httpClient
      .get(
        `https://raw.githubusercontent.com/ShakesVision/Quran_archive/master/15Lines/${juz}.txt`,
        { responseType: "text" }
      )
      .subscribe(
        (res) => {
          console.log("Fetch successful...");
          // Add extra line (\n) at the end of each file to avoid truncating last line of the file in split
          const juzData = { title: juz, data: res };
          this.storage.set(juz, juzData).then((_) => {
            console.log("Have been saved in your device successfully.");
          });
          this.navigate(juzData);
        },
        (err) => {
          console.log("fetch failed.");
        }
      );
  }
  navigate(juzData) {
    this.router.navigate(["/read"], { state: { juzData } });
  }
}
