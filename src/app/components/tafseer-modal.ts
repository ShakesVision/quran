import { HttpClient } from "@angular/common/http";
import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { finalize, map } from "rxjs/operators";

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
  tafsir = {
    ar: null,
    ur: null,
  };
  loading = false;

  constructor(
    private modalCtrl: ModalController,
    private httpClient: HttpClient
  ) {}

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
  loadTafsir(lang: string) {
    this.loading = true;
    const [s, a] = this.verse.verse_key.split(":");
    const url =
      lang === "ar"
        ? `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/${s}/${a}.json`
        : `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ur-tafseer-ibn-e-kaseer/${s}/${a}.json`;
    return this.httpClient
      .get<any>(url)
      .pipe(
        map((res) => res.text),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => (this.tafsir[lang] = res));
  }
}
