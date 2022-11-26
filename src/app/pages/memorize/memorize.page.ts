import { Component, OnInit, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { AlertController, IonModal, ModalController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { Observable, Subject } from "rxjs";
import { SurahService } from "src/app/services/surah.service";

@Component({
  selector: "app-memorize",
  templateUrl: "./memorize.page.html",
  styleUrls: ["./memorize.page.scss"],
})
export class MemorizePage implements OnInit {
  @ViewChild(IonModal) modal: IonModal;
  items: Array<Object> = [];
  recommendedChapters = ["الفاتحہ", "یس", "رحمن", "واقعہ", "ملک", "کہف "];
  isOpen: boolean = true;
  memorizeEntryForm: FormGroup;
  surahInfo = [];

  constructor(
    private storage: Storage,
    private alertController: AlertController,
    private modalController: ModalController,
    public formBuilder: FormBuilder,
    private surahService: SurahService
  ) {}

  ngOnInit() {
    this.setupStorage();
    this.surahService
      .getSurahInfo()
      .subscribe((res: any) => (this.surahInfo = res));
    this.memorizeEntryForm = this.formBuilder.group({
      date: new FormControl(new Date().toISOString()),
      number: new FormControl(""),
      surah: new FormControl("", Validators.required),
      from: new FormControl("", Validators.required),
      to: new FormControl("", Validators.required),
      finished: new FormControl(false),
    });
  }
  async setupStorage() {
    await this.storage.create();
  }

  async add() {
    const alert = await this.alertController.create({
      subHeader: "Add",
      inputs: [
        {
          name: "surah",
          id: "surah",
          type: "search",
          placeholder: "Surah name...",
          handler: (input) => {
            console.log("Inside handler:", input);
          },
        },
        {
          name: "completed",
          id: "completed",
          type: "number",
          placeholder: "Number of Ayahs memorized...",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Add",
          handler: (data) => {
            console.log(data);
            data.started = new Date();
            data.updated = new Date();
            this.items.push(data);
          },
        },
      ],
    });
    alert.present();
  }
  getFormattedDate = (date) => new Date(date).toLocaleDateString();
  openModelWithItem(item) {
    this.modal.present().then();
  }
  closeModal() {
    this.isOpen = false;
    this.modalController.dismiss();
  }
  getValueFromModal(e) {
    if (e.detail.data) {
      console.log(e);
      this.storage.set(e.detail.data.number, e.detail.data);
      this.items.push(e.detail.data);
    }
  }
  toggle(e) {
    // console.log(e.detail.checked);
  }
  onSubmit() {
    this.modalController.dismiss(this.memorizeEntryForm.value);
  }
  dateChanged(ev) {
    console.log(ev.detail.value);
  }
  getSurahName(num) {
    return this.surahService.surahNames[parseInt(num) - 1];
  }
  getSurahInfo(num, method) {
    // this.surahService.getSurahInfo().subscribe(res=>{})
    let selected = this.surahInfo.find(
      (s: any) => parseInt(s.index) === parseInt(num)
    );
    switch (method) {
      case "name":
        return selected.title + selected.titleAr;
        break;
      case "count":
        return selected.count;
        break;

      default:
        return selected.title + selected.titleAr;
        break;
    }
  }
}
