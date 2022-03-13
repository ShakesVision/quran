import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-listen',
  templateUrl: './listen.page.html',
  styleUrls: ['./listen.page.scss'],
})
export class ListenPage implements OnInit {
  ayahNumber:number;
  audioSrc:string;
  media: HTMLAudioElement;

  @ViewChild('audioEl') audioEl:ElementRef<HTMLAudioElement>;
  constructor() { }

  ngOnInit() {
    this.media = <HTMLAudioElement>document.getElementById('audio');

  }

  get $player(): HTMLAudioElement {
    return this.audioEl.nativeElement;
  } 

  listen(ayahNumber) {
    this.media.pause();
    // replace http with https in prod
    this.audioSrc = `http://cdn.islamic.network/quran/audio/64/ar.abdurrahmaansudais/${ayahNumber}.mp3`;
    console.log(this.audioEl);
    this.media.src = this.audioSrc;
    this.media.play();
  }

}
