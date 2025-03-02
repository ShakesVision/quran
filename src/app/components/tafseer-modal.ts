import { HttpClient } from "@angular/common/http";
import { Component, Input } from "@angular/core";
import { AlertController, ModalController } from "@ionic/angular";
import { finalize, map } from "rxjs/operators";
import { SurahService } from "../services/surah.service";
import { error } from "console";
import { QuranData } from "src/assets/data/quran-data";

@Component({
  selector: "tafseer-modal",
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
    en: null,
  };
  loading = false;
  sajdahMessage: string;

  constructor(
    private modalCtrl: ModalController,
    private httpClient: HttpClient,
    private surahService: SurahService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.audioSrc = `${this.baseurl}${this.verse.audio.url}`;
    this.checkIfAyahHasSajdah();
  }

  playWord(word) {
    let url = `${this.baseurl}${word.audio_url}`;
    let audio = new Audio(url);
    audio.play();
  }
  dismissModal() {
    this.modalCtrl.dismiss();
  }
  loadTafsir(lang: string) {
    this.loading = true;
    const [s, a] = this.verse.verse_key.split(":");
    const base_url = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
    let slug = "";
    switch (lang) {
      case "ar":
        slug = "ar-tafsir-ibn-kathir";
        break;
      case "ur":
        slug = "ur-tafseer-ibn-e-kaseer";
        break;
      case "en":
        slug = "en-tafsir-maarif-ul-quran";
        break;
      default:
        slug = "ur-tafseer-ibn-e-kaseer";
        break;
    }
    const url = `${base_url}/${slug}/${s}/${a}.json`;
    return this.httpClient
      .get<any>(url)
      .pipe(
        map((res) => res.text),
        finalize(() => (this.loading = false))
      )
      .subscribe((res) => (this.tafsir[lang] = res));
  }

  /**
   * Loads the next ayah in the tafseer modal.
   * @param {number} offset The offset to the next ayah.
   * @example
   *  // To load the next ayah
   *  this.loadNextAyah(1);
   *  // To load the previous ayah
   *  this.loadNextAyah(-1);
   */
  loadNextAyah(offset: number) {
    const [s, a] = this.verse.verse_key.split(":");
    const nextAyahNumber = parseInt(a) + offset;
    if (nextAyahNumber === 0) {
      this.surahService.presentToastWithOptions(
        `Invalid Ayah: ${nextAyahNumber}`,
        "danger",
        "middle"
      );
      return;
    }
    const nextAyahKey = `${s}:${nextAyahNumber}`;
    this.fetchTrans(nextAyahKey);
  }

  async loadAnyAyah() {
    const alert = await this.alertController.create({
      header: "Enter Ayah Key",
      inputs: [
        {
          name: "ayahKey",
          type: "text",
          placeholder: "Enter Ayah Key (e.g. 1:1)",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "OK",
          handler: (data) => {
            if (data.ayahKey) {
              this.fetchTrans(data.ayahKey);
            }
          },
        },
      ],
    });
    await alert.present();
  }
  fetchTrans(verse_key: string) {
    this.surahService.fetchTrans(verse_key).subscribe(
      (res: any) => {
        console.log(res, QuranData);
        this.verse = res.verse;
        this.tafsir = { ur: null, ar: null, en: null };
        this.checkIfAyahHasSajdah();
      },
      (error) => {
        console.log(error);
        this.surahService.presentToastWithOptions(
          `${error.error?.status}: ${error.error?.error}`,
          "danger",
          "middle"
        );
      }
    );
  }

  getAyahOrVerseNumberFromKey(whatToGet: "surah" | "ayah", key: string) {
    const [s, a] = key.split(":");
    return parseInt(whatToGet === "surah" ? s : a);
  }

  checkIfAyahHasSajdah() {
    const [s, a] = this.verse.verse_key.split(":");
    const sajdaRef = QuranData.Sajda.find(
      (sajdah) => sajdah[0] === parseInt(s) && sajdah[1] === parseInt(a)
    );
    // Found that ayah has sajdah
    if (sajdaRef)
      this.sajdahMessage = `(A sajdah is ${sajdaRef[2]} on this verse!)`;
  }
}
