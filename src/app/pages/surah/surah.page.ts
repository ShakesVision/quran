import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { Router, ActivatedRoute } from "@angular/router";
import { SurahService } from "./../../services/surah.service";
import { Surah, Index } from "./../../services/surah";

@Component({
  selector: "app-surah",
  templateUrl: "surah.page.html",
  styleUrls: ["surah.page.scss"],
})
export class SurahPage implements OnInit {
  items: Observable<Index[]>;

  constructor(private surahService: SurahService, private router: Router) {}
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

  gotoReadJuz() {
    this.router.navigate(["/read"], { state: { juz: 1 } });
  }
}
