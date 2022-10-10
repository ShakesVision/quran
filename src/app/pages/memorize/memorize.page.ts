import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { AlertController, ModalController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { Observable, Subject } from "rxjs";

@Component({
  selector: "app-memorize",
  templateUrl: "./memorize.page.html",
  styleUrls: ["./memorize.page.scss"],
})
export class MemorizePage implements OnInit {
  items: Array<Object> = [];
  recommendedChapters = ["الفاتحہ", "یس", "رحمن", "واقعہ", "ملک", "کہف "];
  isOpen: boolean = true;
  memorizeEntryForm: FormGroup;
  constructor(
    private storage: Storage,
    private alertController: AlertController,
    private modalController: ModalController,
    public formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.setupStorage();
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
          name: "date",
          id: "date",
          type: "date",
          placeholder: "Date...",
          value: new Date(),
        },
        {
          name: "number",
          id: "number",
          type: "number",
          placeholder: "Surah number...",
        },
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
          name: "from",
          id: "from",
          type: "number",
          placeholder: "From Ayah number...",
        },
        {
          name: "to",
          id: "to",
          type: "number",
          placeholder: "To Ayah number...",
        },
        {
          name: "finished",
          id: "finished",
          type: "checkbox",
          label: "Finished",
          handler: () => {
            console.log("checkbox selected.");
          },
          checked: true,
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
            this.items.push(data);
          },
        },
      ],
    });
    alert.present();
  }
  getFormattedDate = (date) => new Date(date).toLocaleDateString();
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
}
