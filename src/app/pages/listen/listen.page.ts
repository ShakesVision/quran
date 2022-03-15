import { HttpClient } from "@angular/common/http";
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-listen",
  templateUrl: "./listen.page.html",
  styleUrls: ["./listen.page.scss"],
})
export class ListenPage implements OnInit {
  ayahNumber: number;
  audioSrc: string;
  media: HTMLAudioElement;
  spin: boolean = false;
  surahInfo = [];
  surahInfoCopy = [];

  @ViewChild("audioEl") audioEl: ElementRef<HTMLAudioElement>;
  constructor(private http: HttpClient, private surahService: SurahService) {}

  ngOnInit() {
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = [...res];
      this.surahInfoCopy = [...res];
      this.surahService.surahInfo = [...res];
      //assign media element too
      this.media = <HTMLAudioElement>document.getElementById("audio");
    });
  }

  get $player(): HTMLAudioElement {
    return this.audioEl.nativeElement;
  }

  listen(num, targetEl: HTMLElement) {
    this.media.pause();
    this.spin = true;
    // replace http with https in prod
    // this.audioSrc = `http://cdn.islamic.network/quran/audio/64/ar.abdurrahmaansudais/${ayahNumber}.mp3`;
    let apiEndpoint = `https://api.quran.com/api/v4/chapter_recitations/3/${num}`;
    this.http.get(apiEndpoint).subscribe((res: any) => {
      this.spin = false;
      console.log(res);
      this.audioSrc = res.audio_file.audio_url;
      this.media.src = this.audioSrc;
      setTimeout(() => {
        this.media.play();
        console.log(targetEl);
        targetEl.classList.toggle("active");
      }, 150);
    });
  }

  // API ENDPOINTS
  // https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=100
  // https://api.quran.com/api/v4/chapter_recitations/{id}/{chapter_number}

  p2e = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  a2e = (s) => s.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  queryChanged(ip: string) {
    let temp: string = ip.toLowerCase();
    temp = this.a2e(this.p2e(temp));

    if (temp === "") this.surahInfo = this.surahInfoCopy;
    this.surahInfo = this.surahInfoCopy.filter((d) => {
      return (
        parseInt(d.index).toString().indexOf(temp) > -1 ||
        d.title.toLowerCase().indexOf(temp) > -1 ||
        d.titleAr.indexOf(temp) > -1
      );
    });
  }
}
