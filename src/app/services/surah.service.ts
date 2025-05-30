import { Surah, Index } from "./surah";
import { Injectable } from "@angular/core";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/compat/firestore";
import { map, take } from "rxjs/operators";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { ToastController, ToastOptions } from "@ionic/angular";
import { Subject } from "rxjs/internal/Subject";

@Injectable({
  providedIn: "root",
})
export class SurahService {
  surahCollection: AngularFirestoreCollection<Surah>;
  indexCollection: AngularFirestoreCollection<Index>;
  currentSurah;
  surahInfo = [];

  scanLinkData$ = new Subject<{
    loading?: boolean;
    identifier?: string;
    incompleteUrl?: string;
  }>();

  diacritics = {
    RUKU_MARK: "ۧ",
    AYAH_MARK: "۝",
    BISM: "﷽",
    SAJDAH_MARK: "۞",
    NOON_MUTTASIL: "ۨ",
    WAQF_LAZIM: "ۘ",
    WAQF_LAZIM2: "ۢ",
    WAQF_NABI: "ؔ",
    JAZM: "ْ",
    TATWEEL: "ـ",
  };
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
  juzNames = [
    "الۗم",
    "سيقول",
    "تلك الرسل",
    "لن تنالوا",
    "والمحصنات",
    "لا يحب الله",
    "وإذا سمعوا",
    "ولو أننا",
    "قال الملأ",
    "واعلموا",
    "يعتذرون",
    "وما من دآبة",
    "وما أبریٔ",
    "ربما",
    "سبحان الذى",
    "قال ألم",
    "اقترب للناس",
    "قد أفلح",
    "وقال الذين",
    "أمن خلق",
    "أتل ماأوحی",
    "ومن يقنت",
    "ومآ لي",
    "فمن أظلم",
    "إليه يرد",
    "حم",
    "قال فما خطبكم",
    "قد سمع الله",
    "تبارك الذى",
    "عم",
  ];
  surahNames = [
    "الفاتحة",
    "البقرة",
    "آل عمران",
    "النساء",
    "المائدة",
    "الأنعام",
    "الأعراف",
    "الأنفال",
    "التوبة",
    "يونس",
    "هود",
    "يوسف",
    "الرعد",
    "ابراهيم",
    "الحجر",
    "النحل",
    "الاسرآء",
    "الکهف",
    "مريم",
    "طه",
    "الأنبيآء",
    "الحج",
    "المؤمنون",
    "النور",
    "الفرقان",
    "الشعراء",
    "النمل",
    "القصص",
    "العنکبوت",
    "الروم",
    "لقمان",
    "السجدة",
    "الأحزاب",
    "سبأ",
    "فاطر",
    "يس",
    "الصافات",
    "ص",
    "الزمر",
    "المؤمن",
    "فصلت",
    "الشوری",
    "الزخرف",
    "الدخان",
    "الجاثية",
    "الأحقاف",
    "محمد ",
    "الفتح",
    "الحجرات",
    "ق",
    "الذ اريات",
    "الطور",
    "النجم",
    "القمر",
    "الرحمن",
    "الواقعة",
    "الحديد",
    "المجادلة",
    "الحشر",
    "الممتحنة",
    "الصف",
    "الجمعة",
    "المنافقون",
    "التغابن",
    "الطلاق",
    "التحريم",
    "الملک",
    "القلم",
    "الحاقة",
    "المعارج",
    "نوح",
    "الجن",
    "المزمل",
    "المدثر",
    "القيامة",
    "الدهر",
    "المرسلات",
    "النبأ",
    "النازعات",
    "عبس",
    "التکوير",
    "الإنفطار",
    "المطففين",
    "الإنشقاق",
    "البروج",
    "الطارق",
    "الأعلی",
    "الغاشية",
    "الفجر",
    "البلد",
    "الشمس",
    "الليل",
    "الضحی",
    "الإنشراح",
    "التين",
    "العلق",
    "القدر",
    "البينة",
    "الزلزال",
    "العاديات",
    "القارعة",
    "التکاثر",
    "العصر",
    "الهمزة",
    "الفيل",
    "قريش",
    "الماعون",
    "الکوثر",
    "الکافرون",
    "النصر",
    "تبت",
    "الإخلاص",
    "الفلق",
    "الناس",
  ];
  isLoggedIn = this.afAuth.onAuthStateChanged; //this.afAuth.authState;
  constructor(
    private afs: AngularFirestore,
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private toastController: ToastController,
    private httpClient: HttpClient
  ) {
    this.surahCollection = this.afs.collection<Surah>("surahs");
    this.indexCollection = this.afs.collection<Index>("index", (ref) =>
      ref.orderBy("surahNo")
    );
  }

  ngOnInit() {
    this.getSurahInfo().subscribe((res: any) => (this.surahInfo = res));
  }

  getArabicScript(text) {
    return text
      .replace(/آ/g, "آ")
      .replace(/ا/g, "ا")
      .replace(/ب/g, "ب")
      .replace(/پ/g, "پ")
      .replace(/ت/g, "ت")
      .replace(/ٹ/g, "ٹ")
      .replace(/ث/g, "ث")
      .replace(/ج/g, "ج")
      .replace(/چ/g, "چ")
      .replace(/خ/g, "خ")
      .replace(/ح/g, "ح")
      .replace(/د/g, "د")
      .replace(/ڈ/g, "ڈ")
      .replace(/ذ/g, "ذ")
      .replace(/ر/g, "ر")
      .replace(/ڑ/g, "ڑ")
      .replace(/ز/g, "ز")
      .replace(/ژ/g, "ژ")
      .replace(/س/g, "س")
      .replace(/ش/g, "ش")
      .replace(/ص/g, "ص")
      .replace(/ض/g, "ض")
      .replace(/ط/g, "ط")
      .replace(/ظ/g, "ظ")
      .replace(/ع/g, "ع")
      .replace(/غ/g, "غ")
      .replace(/ف/g, "ف")
      .replace(/ک/g, "ك")
      .replace(/ق/g, "ق")
      .replace(/گ/g, "گ")
      .replace(/ل/g, "ل")
      .replace(/م/g, "م")
      .replace(/ن/g, "ن")
      .replace(/و/g, "و")
      .replace(/ہ/g, "ه")
      .replace(/ء/g, "ء")
      .replace(/ی/g, "ي")
      .replace(/ئ/g, "ئ")
      .replace(/ے/g, "ے")
      .replace(/ۃ/g, "ة")
      .replace(/ؤ/g, "ؤ")
      .replace(/إ/g, "إ")
      .replace(/أ/g, "أ")
      .replace(/ھ/g, "ه")
      .replace(/ الذي /g, " الذى ")
      .replace(/ علي /g, " على ")
      .replace(/ معني /g, " معنى ")
      .replace(/ إلي /g, " إلى ")
      .replace(/ تعاليٰ /g, " تعالىٰ ")
      .replace(/ النبي /g, " النبى ")
      .replace(/صلي الله عليه وسلم/g, "صلى الله عليه وسلم")
      .replace(/ في /g, " فى ")
      .replace(/ أبي /g, " أبى ")
      .replace(/ رضي الله عنه /g, " رضى الله عنه ")
      .replace(/ يري /g, " يرى ")
      .replace(/ وهي /g, " وهى ")
      .replace(/ أي /g, " أى ")
      .replace(/ التي /g, " التى ")
      .replace(/ فسيأتي /g, " فسيأتى ")
      .replace(/ الذي /g, " الذى ")
      .replace(/ إلي /g, " إلى ")
      .replace(/ فنفي /g, " فنفى ")
      .replace(/ الّذي /g, " الّذى ")
      .replace(/ النبي /g, " النبى ")
      .replace(/ صلّي /g, " صلّى ")
      .replace(/ إحدي /g, " إحدى ")
      .replace(/ يأتي /g, " يأتى ")
      .replace(/أي /g, " أى ")
      .replace(/ والدواعي /g, " والدواعى ")
      .replace(/ صلي /g, " صلى ");
  }

  tashkeelRemover(text: string) {
    return text
      .replace(/َ/g, "")
      .replace(/ِ/g, "")
      .replace(/ُ/g, "")
      .replace(/ّ/g, "")
      .replace(/ْ/g, "")
      .replace(/ٌ/g, "")
      .replace(/ً/g, "")
      .replace(/ٍ/g, "")
      .replace(/ٌ/g, "")
      .replace(/ۡ/g, "")
      .replace(/ٰ/g, "")
      .replace(/ٓ/g, "")
      .replace(/ٗ/g, "")
      .replace(/ۖ‏/g, "")
      .replace(/ۚ/g, "")
      .replace(/ؕ/g, "")
      .replace(/ۙ/g, "")
      .replace(/ۢ/g, "")
      .replace(/۟/g, "")
      .replace(/ۤ/g, "")
      .replace(/ٖ/g, "");
  }

  removeTatweel(text: string) {
    const re = new RegExp(this.diacritics.TATWEEL, "g");
    return text.replace(re, "");
  }

  // signup(email, password) {
  //   return this.afAuth.auth.createUserWithEmailAndPassword(email, password);
  // }
  signin(email, password) {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }
  signout() {
    return this.afAuth.signOut();
  }

  addSurah(item: Surah) {
    return this.surahCollection.add(item);
  }

  updateSurahById(id, item: Surah) {
    return this.surahCollection.doc(id).set(item);
  }

  getSurahs(): Observable<Surah[]> {
    return this.surahCollection.valueChanges({ idField: "id" });
  }

  getSurahById(id): Observable<Surah> {
    return this.surahCollection.doc<Surah>(id).valueChanges().pipe(take(1));
  }

  deleteSurahById(id) {
    return this.afs.doc<Surah>(`surahs/${id}`).delete();
  }

  addIndex(item: Index) {
    return this.indexCollection.add(item);
  }

  updateIndexById(id, item: Index) {
    return this.indexCollection.doc(id).set(item);
  }

  getIndexes(): Observable<Index[]> {
    return this.indexCollection.valueChanges({ idField: "id" });
  }

  getIndexById(id): Observable<Index> {
    return this.indexCollection.doc<Index>(id).valueChanges().pipe(take(1));
  }

  deleteIndexById(id) {
    return this.afs.doc<Index>(`index/${id}`).delete();
  }

  fetchIndexBySurahNumber(remoteId) {
    return this.afs.collection<Index>("index", (ref) =>
      ref.where("remoteId", "==", remoteId)
    );
  }

  getSurahInfo() {
    return this.http.get("assets/data/surah.json");
  }
  fetchQariList() {
    const url = `https://api.quran.com/api/v4/resources/chapter_reciters?language=ar`;
    return this.http.get(url);
  }

  fetchTrans(verseKey, lang = "en") {
    let url = `https://api.quran.com/api/v4/verses/by_key/${verseKey}?language=${lang}&fields=text_indopak,text&words=true&word_fields=text_indopak,text&translations=131,151,158,84&translation_fields=resource_name,language_name&audio=2`;
    return this.httpClient.get(url);
  }
  async presentToastWithOptions(
    msg,
    color,
    position: ToastOptions["position"],
    duration = 3000
  ) {
    const toast = await this.toastController.create({
      message: msg,
      position,
      color,
      duration,
      buttons: [
        {
          text: "Ok",
          role: "cancel",
          handler: () => {
            console.log("Cancel clicked.");
          },
        },
      ],
    });
    toast.present();
  }

  getPaddedNumber(n: number) {
    return String(n).padStart(4, "0");
  }

  p2e = (s) => s?.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  a2e = (s) => s?.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  e2a = (s) => s?.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

  //Juz and Surah calculated methods, not working for last index (30 and 114)
  juzCalculated = (p: number) =>
    this.juzPageNumbers.findIndex((e) => e > p) == -1
      ? 30
      : this.juzPageNumbers.findIndex((e) => e > p);
  surahCalculated = (p: number) =>
    this.surahPageNumbers.findIndex((e) => e > p) == -1
      ? 114
      : this.surahPageNumbers.findIndex((e) => e > p);
}
