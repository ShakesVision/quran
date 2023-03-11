import { HttpClient } from "@angular/common/http";
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { IonSelect } from "@ionic/angular";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-listen",
  templateUrl: "./listen.page.html",
  styleUrls: ["./listen.page.scss"],
})
export class ListenPage implements OnInit {
  ayahNumber: number;
  audioSrc: string;
  nowPlaying;
  media: HTMLAudioElement;
  spin: boolean = false;
  qariId: number = 3;
  surahInfo = [];
  surahInfoCopy = [];
  reciters = [];

  @ViewChild("audioEl") audioEl: ElementRef<HTMLAudioElement>;
  @ViewChild("mySelect", { static: false }) selectRef: IonSelect;

  constructor(private http: HttpClient, private surahService: SurahService) {}

  ngOnInit() {
    this.surahService.getSurahInfo().subscribe((res: any) => {
      this.surahInfo = [...res];
      this.surahInfoCopy = [...res];
      this.surahService.surahInfo = [...res];
      //assign media element too
      this.media = <HTMLAudioElement>document.getElementById("audio");
    });
    this.fetchQariList();
  }

  get $player(): HTMLAudioElement {
    return this.audioEl.nativeElement;
  }

  listen(s, targetEl: HTMLElement) {
    let num = s.index;
    this.media.pause();
    this.spin = true;
    // replace http with https in prod
    // this.audioSrc = `http://cdn.islamic.network/quran/audio/64/ar.abdurrahmaansudais/${ayahNumber}.mp3`;
    let apiEndpoint = `https://api.quran.com/api/v4/chapter_recitations/${this.qariId}/${num}`;
    this.http.get(apiEndpoint).subscribe((res: any) => {
      this.spin = false;
      console.log(res);
      this.audioSrc = res.audio_file.audio_url;
      this.media.src = this.audioSrc;
      setTimeout(() => {
        this.media.play();
        console.log(targetEl.parentElement);
        this.nowPlaying = s;
      }, 150);
    });
  }

  // API ENDPOINTS
  // https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=100
  // https://api.quran.com/api/v4/chapter_recitations/{id}/{chapter_number}

  queryChanged(ip: string) {
    let temp: string = ip.toLowerCase();
    temp = this.surahService.a2e(this.surahService.p2e(temp));

    if (temp === "") this.surahInfo = this.surahInfoCopy;
    this.surahInfo = this.surahInfoCopy.filter((d) => {
      return (
        parseInt(d.index).toString().indexOf(temp) > -1 ||
        d.title.toLowerCase().indexOf(temp) > -1 ||
        d.titleAr.indexOf(temp) > -1
      );
    });
  }
  fetchQariList() {
    this.surahService.fetchQariList().subscribe((res: any) => {
      console.log(res);
      this.reciters = res.reciters;
    });
  }

  qariSelect() {
    this.selectRef.open();
  }
  qariChanged(e) {
    console.log(e);
    this.qariId = parseInt(e);
  }
}
