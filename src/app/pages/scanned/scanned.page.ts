import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-scanned",
  templateUrl: "./scanned.page.html",
  styleUrls: ["./scanned.page.scss"],
})
export class ScannedPage implements OnInit {
  page: number = 616;
  url: string;
  incompleteUrl: string;
  identifier: string;
  constructor(private httpClient: HttpClient) {}

  ngOnInit() {
    this.setupLinks();
  }
  setupLinks() {
    this.httpClient
      .get("https://archive.org/metadata/QuranMajeed-15Lines-SaudiPrint")
      .subscribe((res: any) => {
        // https://ia600308.us.archive.org/BookReader/BookReaderImages.php?zip=/9/items/QuranMajeed-15Lines-SaudiPrint/QuranMajeed-15Lines-SaudiPrint_jp2.zip&file=QuranMajeed-15Lines-SaudiPrint_jp2/QuranMajeed-15Lines-SaudiPrint_0494.jp2&id=QuranMajeed-15Lines-SaudiPrint&scale=4&rotate=0
        console.log(res);
        this.url = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${res.metadata.identifier}_jp2.zip&file=${res.metadata.identifier}_jp2/${res.metadata.identifier}_${this.page}.jp2&id=${res.metadata.identifier}&scale=4&rotate=0`;
        this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${res.metadata.identifier}_jp2.zip&file=${res.metadata.identifier}_jp2/${res.metadata.identifier}_`;
        this.identifier = res.metadata.identifier;
        this.loadImg(this.page); //use for showing 'last opened page' initially
      });
  }
  loadImg(p) {
    let paddedPageNumber = String(p).padStart(4, "0");
    this.url = `${this.incompleteUrl}${paddedPageNumber}.jp2&id=${this.identifier}&scale=4&rotate=0`;
  }
}
