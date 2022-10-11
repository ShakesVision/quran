import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-juz",
  templateUrl: "./juz.page.html",
  styleUrls: ["./juz.page.scss"],
})
export class JuzPage implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}

  gotoReadJuz(juz) {
    this.router.navigate(["/read"], { state: { juz } });
  }
}
