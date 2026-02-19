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
  // Hardcoded popular reciters as fallback
  private readonly HARDCODED_RECITERS = [
    { id: 7, name: 'Mishari Rashid al-`Afasy' },
    { id: 2, name: 'Abdul-Rahman Al-Sudais' },
    { id: 1, name: 'AbdulBaset AbdulSamad' },
    { id: 3, name: 'Abdullah Basfar' },
    { id: 5, name: 'Hani ar-Rifai' },
    { id: 6, name: 'Mahmoud Khalil Al-Husary' },
    { id: 4, name: 'Abu Bakr al-Shatri' },
    { id: 10, name: 'Saud ash-Shuraim' },
    { id: 9, name: 'Mohamed al-Tablawi' },
    { id: 8, name: 'Sa`ud ash-Shuraym' },
  ];
  ayahNumber: number;
  audioSrc: string;
  nowPlaying;
  media: HTMLAudioElement;
  spin: boolean = false;
  qariId: number = 7;
  selectedQariName: string = 'Al-Afasy';
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
    });
    this.fetchQariList();
  }

  private getMediaEl(): HTMLAudioElement | null {
    // Try ViewChild first, then fallback to DOM query
    if (this.audioEl?.nativeElement) return this.audioEl.nativeElement;
    return document.getElementById('audio') as HTMLAudioElement;
  }

  get $player(): HTMLAudioElement {
    return this.audioEl?.nativeElement;
  }

  listen(s, targetEl: HTMLElement) {
    let num = s.index;
    // Guard against null media element (audio element is inside *ngIf)
    const media = this.getMediaEl();
    if (media) media.pause();
    this.spin = true;
    // replace http with https in prod
    // this.audioSrc = `http://cdn.islamic.network/quran/audio/64/ar.abdurrahmaansudais/${ayahNumber}.mp3`;
    let apiEndpoint = `https://api.quran.com/api/v4/chapter_recitations/${this.qariId}/${num}`;
    this.http.get(apiEndpoint).subscribe((res: any) => {
      this.spin = false;
      console.log(res);
      this.audioSrc = res.audio_file.audio_url;
      this.nowPlaying = s;
      // Wait for Angular to render the audio element (inside *ngIf="nowPlaying")
      setTimeout(() => {
        const el = this.getMediaEl();
        if (el) {
          el.src = this.audioSrc;
          el.play();
        }
      }, 200);
    });
  }

  // API ENDPOINTS
  // https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=100
  // https://api.quran.com/api/v4/chapter_recitations/{id}/{chapter_number}

  queryChanged(ip: string) {
    let temp: string = ip.toLowerCase();
    temp = this.surahService.a2e(
      this.surahService.p2e(this.surahService.getArabicScript(temp))
    );

    if (temp === "") this.surahInfo = this.surahInfoCopy;
    this.surahInfo = this.surahInfoCopy.filter((d) => {
      return (
        parseInt(d.index).toString().indexOf(temp) > -1 ||
        d.title.toLowerCase().indexOf(temp) > -1 ||
        this.surahService.getArabicScript(d.titleAr).includes(temp)
      );
    });
  }
  fetchQariList() {
    this.surahService.fetchQariList().subscribe(
      (res: any) => {
        console.log(res);
        this.reciters = res.reciters?.sort((a, b) => a.id - b.id) || this.HARDCODED_RECITERS;
        this.updateSelectedQariName();
      },
      (error) => {
        console.warn('Failed to fetch Qari list from API, using hardcoded list.', error);
        this.reciters = this.HARDCODED_RECITERS;
        this.updateSelectedQariName();
      }
    );
  }

  private updateSelectedQariName() {
    const qari = this.reciters.find(r => r.id === this.qariId);
    this.selectedQariName = qari?.name?.split(' ')[0] || 'Qaari';
  }

  qariSelect() {
    this.selectRef.open();
  }
  qariChanged(e) {
    console.log(e);
    this.qariId = parseInt(e);
    const qari = this.reciters.find(r => r.id === this.qariId);
    this.selectedQariName = qari?.name?.split(' ')[0] || 'Qaari';
  }
}
