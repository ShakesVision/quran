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
  imgQuality: ImageQuality = ImageQuality.High;
  ImageQuality = ImageQuality;
  surahNumberField;
  juzNumberField;
  surahPageNumbers = [
    2, 3, 51, 78, 107, 129, 152, 178, 188, 209, 222, 236, 250, 256, 262, 268,
    283, 294, 306, 313, 323, 332, 343, 351, 360, 367, 377, 386, 397, 405, 412,
    416, 419, 429, 435, 441, 446, 453, 459, 468, 478, 484, 490, 496, 499, 503,
    507, 512, 516, 519, 521, 524, 527, 529, 532, 535, 538, 543, 546, 550, 552,
    554, 555, 557, 559, 561, 563, 565, 568, 570, 572, 574, 577, 579, 581, 583,
    585, 587, 588, 590, 591, 592, 593, 595, 596, 597, 598, 598, 599, 601, 601,
    602, 603, 603, 604, 604, 605, 605, 606, 606, 607, 607, 608, 608, 608, 609,
    609, 609, 609, 610, 610, 610, 611, 611,
  ];
  juzPageNumbers = [
    2, 23, 43, 63, 83, 103, 123, 143, 153, 183, 203, 223, 243, 263, 283, 303,
    323, 343, 363, 383, 403, 423, 443, 463, 483, 503, 523, 543, 563, 587,
  ];

  constructor(private httpClient: HttpClient) {}

  ngOnInit() {
    this.setupLinks();
  }
  setupLinks() {
    this.httpClient
      .get("https://archive.org/metadata/15-lined-saudi")
      .subscribe((res: any) => {
        // https://ia600308.us.archive.org/BookReader/BookReaderImages.php?zip=/9/items/QuranMajeed-15Lines-SaudiPrint/QuranMajeed-15Lines-SaudiPrint_jp2.zip&file=QuranMajeed-15Lines-SaudiPrint_jp2/QuranMajeed-15Lines-SaudiPrint_0494.jp2&id=QuranMajeed-15Lines-SaudiPrint&scale=4&rotate=0
        console.log(res);
        console.log(
          res.files
            .filter((f) => f.size == "43240062")[0]
            .name.replace(".pdf", "")
        );
        if (res.files.filter((f) => f.size == "43240062")[0]) {
          const fileNameIdentifier = res.files
            .filter((f) => f.size == "43240062")[0]
            ?.name?.replace(".pdf", "")
            .trim();
          this.identifier = res.metadata.identifier;
          this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${fileNameIdentifier}_jp2.zip&file=${fileNameIdentifier}_jp2/${fileNameIdentifier}_`;
          this.loadImg(this.page, ImageQuality.High); //use for showing 'last opened page' initially
        } else {
          this.httpClient
            .get("https://archive.org/metadata/QuranMajeed-15Lines-SaudiPrint")
            .subscribe((res: any) => {
              this.identifier = res.metadata.identifier;
              this.incompleteUrl = `https://${res.server}/BookReader/BookReaderImages.php?zip=${res.dir}/${this.identifier}_jp2.zip&file=${res.metadata.identifier}_jp2/${this.identifier}_`;
              this.loadImg(this.page, ImageQuality.High); //use for showing 'last opened page' initially
            });
        }
      });
  }
  loadImg(p: number, quality: ImageQuality) {
    this.page = p;
    console.log(p, quality);
    let paddedPageNumber = String(p).padStart(4, "0");
    this.url = `${this.incompleteUrl}${paddedPageNumber}.jp2&id=${this.identifier}&scale=${quality}&rotate=0`;
    let juzCalculated = this.juzPageNumbers.findIndex((e) => e > p);
    let surahCalculated = this.surahPageNumbers.findIndex((e) => e > p);
    if (juzCalculated == -1) juzCalculated = 30;
    if (surahCalculated == -1) surahCalculated = 144;
    this.juzNumberField = juzCalculated;
    this.surahNumberField = surahCalculated;
  }
  jumpToSurah(n: number) {
    this.loadImg(this.surahPageNumbers[n - 1], this.imgQuality);
  }
  jumpToJuz(n: number, section?) {
    console.log(n, section, this.juzPageNumbers[n - 1 + section * 20]);
    if (section)
      this.loadImg(this.juzPageNumbers[n - 1] + section * 20, this.imgQuality);
    else this.loadImg(this.juzPageNumbers[n - 1], this.imgQuality);
  }
}
export enum ImageQuality {
  Low = 8,
  High = 4,
  HD = 2,
}
