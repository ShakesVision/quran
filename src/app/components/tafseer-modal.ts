import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-tafseer-modal",
  templateUrl: "tafseer-modal.html",
  styleUrls: ["tafseer-modal.scss"],
})
export class TafseerModalComponent {
  // Verse object from API.
  @Input() verse;
  audioSrc: string;
  baseurl = "https://verses.quran.com/";

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.audioSrc = `${this.baseurl}${this.verse.audio.url}`;
  }

  playWord(word) {
    let url = `${this.baseurl}${word.audio_url}`;
    let audio = new Audio(url);
    audio.play();
  }
  dismissModal() {
    // Using the injected ModalController this component
    // can close itself
    this.modalCtrl.dismiss();
  }
}
