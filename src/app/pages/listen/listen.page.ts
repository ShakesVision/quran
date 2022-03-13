import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SurahService } from 'src/app/services/surah.service';

@Component({
  selector: 'app-listen',
  templateUrl: './listen.page.html',
  styleUrls: ['./listen.page.scss'],
})
export class ListenPage implements OnInit {
  ayahNumber:number;
  audioSrc:string;
  media: HTMLAudioElement;
  spin:boolean= false;
  surahInfo = [];

  @ViewChild('audioEl') audioEl:ElementRef<HTMLAudioElement>;
  constructor(private http:HttpClient, private surahService:SurahService) { }

  ngOnInit() {
    this.media = <HTMLAudioElement>document.getElementById('audio');
    this.surahInfo = [...this.surahService.surahInfo];
  }

  get $player(): HTMLAudioElement {
    return this.audioEl.nativeElement;
  } 

  listen(num) {
    this.media.pause();
    this.spin = true;
    // replace http with https in prod
    // this.audioSrc = `http://cdn.islamic.network/quran/audio/64/ar.abdurrahmaansudais/${ayahNumber}.mp3`;
    let apiEndpoint = `https://api.quran.com/api/v4/chapter_recitations/3/${num}`;
    this.getUrl(apiEndpoint).subscribe((res:any)=>{
      this.spin=false;
      console.log(res);    
      this.audioSrc = res.audio_file.audio_url
      this.media.src = this.audioSrc;
      this.media.play();
    })
    console.log(this.audioEl);
  }

  getUrl(url) {
    return this.http.get(url);
  }

  // API ENDPOINTS
  // https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=100
  // https://api.quran.com/api/v4/chapter_recitations/{id}/{chapter_number}

}
