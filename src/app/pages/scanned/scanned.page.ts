import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Storage } from "@ionic/storage-angular";

@Component({
  selector: "app-scanned",
  templateUrl: "./scanned.page.html",
  styleUrls: ["./scanned.page.scss"],
})
export class ScannedPage implements OnInit {
  page: number = 616;
  url: string;
  url2: string;
  url3: string;
  incompleteUrl: string;
  identifier: string;
  imgQuality: ImageQuality = ImageQuality.High;
  ImageQuality = ImageQuality;
  loading: boolean = false;
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
    2, 23, 43, 63, 83, 103, 123, 143, 163, 183, 203, 223, 243, 263, 283, 303,
    323, 343, 363, 383, 403, 423, 443, 463, 483, 503, 523, 543, 563, 587,
  ];
  sectionPageNumbers = [
    [8, 13, 18],
    [27, 32, 38],
    [47, 53, 58],
    [67, 72, 77],
    [88, 92, 97],
    [107, 113, 118],
    [127, 133, 137],
    [147, 151, 156],
    [167, 172, 177],
    [187, 193, 198],
    [208, 213, 217],
    [227, 232, 238],
    [247, 253, 257],
    [268, 273, 277],
    [287, 292, 297],
    [307, 313, 317],
    [327, 332, 338],
    [347, 353, 357],
    [367, 373, 378],
    [387, 393, 397],
    [408, 413, 418],
    [427, 432, 437],
    [447, 452, 457],
    [468, 473, 478],
    [487, 492, 497],
    [507, 514, 517],
    [528, 533, 537],
    [548, 552, 558],
    [568, 574, 581],
    [593, 599, 605],
  ];
  zoomProperties = {
    "double-tap": true, // double tap to zoom in and out.
    overflow: "hidden", // Am not sure. But Documentation says, it will not render elements outside the container.
    wheel: false, // Disables mouse - To enable scrolling. Else mouse scrolling will be used to zoom in and out on web.
    disableZoomControl: "disable", // stops showing zoom + and zoom - images.
    backgroundColor: "rgba(0,0,0,0)", // Makes the pinch zoom container color to transparent. So that ionic themes can be applied without issues.
  };
  constructor(private httpClient: HttpClient, private storage: Storage) {}

  ngOnInit() {
    this.getBookmark();
    this.setupLinks();
  }
  async getBookmark() {
    await this.storage.create();
    this.storage.get("scannedBookmark").then((res) => {
      console.log(res);
      if (res) this.page = res;
    });
  }
  setupLinks() {
    this.loading = true;
    this.httpClient
      .get("https://archive.org/metadata/15-lined-saudi")
      .subscribe((res: any) => {
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
        this.loading = false;
      });
  }
  getPaddedNumber(n: number) {
    return String(n).padStart(4, "0");
  }
  loadImg(p: number, quality: ImageQuality) {
    this.loading = true;
    this.page = p;
    console.log(p, quality);
    this.url = `${this.incompleteUrl}${this.getPaddedNumber(p)}.jp2&id=${
      this.identifier
    }&scale=${quality}&rotate=0`;
    // setTimeout(() => {
    //   this.url2 = `${this.incompleteUrl}${this.getPaddedNumber(p + 1)}.jp2&id=${
    //     this.identifier
    //   }&scale=${quality}&rotate=0`;
    //   this.url3 = `${this.incompleteUrl}${this.getPaddedNumber(p + 2)}.jp2&id=${
    //     this.identifier
    //   }&scale=${quality}&rotate=0`;
    // }, 500);
    this.storage.set("scannedBookmark", this.page).then((_) => {
      //saved successfully
    });
    let juzCalculated = this.juzPageNumbers.findIndex((e) => e > p);
    let surahCalculated = this.surahPageNumbers.findIndex((e) => e > p);
    if (juzCalculated == -1) juzCalculated = 30;
    if (surahCalculated == -1) surahCalculated = 144;
    this.juzNumberField = juzCalculated;
    this.surahNumberField = surahCalculated;
    setTimeout(() => {
      this.loading = false;
    }, 750);
  }
  jumpToSurah(n: number) {
    this.loadImg(this.surahPageNumbers[n - 1], this.imgQuality);
  }
  jumpToJuz(n: number, section?) {
    console.log(n, section, this.juzPageNumbers[n - 1 + section * 20]);
    if (section)
      this.loadImg(this.juzPageNumbers[n - 1] + section * 20, this.imgQuality);
    // this.loadImg(this.juzPageNumbers[n - 1] + section * 20, this.imgQuality);
    else this.loadImg(this.juzPageNumbers[n - 1], this.imgQuality);
  }
  jumpToSection(section) {
    console.log(this.juzPageNumbers[this.juzNumberField - 1]);
    let index: number;
    switch (section) {
      case 0:
        if (this.page != this.juzPageNumbers[this.juzNumberField - 1])
          this.jumpToJuz(this.juzNumberField);
        return;
      case 0.25:
        index = 0;
        break;
      case 0.5:
        index = 1;
        break;
      case 0.75:
        index = 2;
        break;
      case 1:
        if (this.juzNumberField == 30) this.loadImg(611, this.imgQuality);
        else if (this.page != this.juzPageNumbers[this.juzNumberField] - 1)
          this.loadImg(
            this.juzPageNumbers[this.juzNumberField] - 1,
            this.imgQuality
          );
        return;
      default:
        index = 0;
        break;
    }
    this.loadImg(
      this.sectionPageNumbers[this.juzNumberField - 1][index],
      this.imgQuality
    );
  }
  addClass(el, el2) {
    el.classList.remove("img-element");
    el2.classList.add("img-element");
  }
}
export enum ImageQuality {
  Low = 8,
  High = 4,
  HD = 2,
}
