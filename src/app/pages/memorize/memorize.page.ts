import { Component, OnInit, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import {
  AlertController,
  IonModal,
  ModalController,
  PopoverController,
  ToastController,
} from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { Observable, Subject } from "rxjs";
import { SurahService } from "src/app/services/surah.service";
import { ProgressPage } from "../progress/progress.page";

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
  isPopoverOpen: boolean = false;

  constructor(
    private storage: Storage,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    public formBuilder: FormBuilder,
    private surahService: SurahService,
    private popoverController: PopoverController
  ) {}

  ngOnInit() {
    this.setupStorage();
    this.storage.get("memorize").then((items) => {
      if (items) this.items = items.sort((a: any, b: any) => a.juz - b.juz);
    });
    // this.surahService
    //   .getSurahInfo()
    //   .subscribe((res: any) => (this.surahInfo = res));
    // this.memorizeEntryForm = this.formBuilder.group({
    //   date: new FormControl(new Date().toISOString()),
    //   number: new FormControl(""),
    //   surah: new FormControl("", Validators.required),
    //   from: new FormControl("", Validators.required),
    //   to: new FormControl("", Validators.required),
    //   finished: new FormControl(false),
    // });
  }
  async setupStorage() {
    await this.storage.create();
  }

  async add(item?) {
    const alert = await this.alertController.create({
      subHeader: item ? "Update" : "Add",
      cssClass: "custom-alert",
      inputs: [
        {
          name: "juz",
          id: "juz",
          type: "number",
          placeholder: "Juz number...",
          value: item ? item.juz : null,
          handler: (input) => {
            console.log("Inside handler:", input);
          },
        },
        {
          name: "completed",
          id: "completed",
          type: "number",
          placeholder: "Pages memorized...",
          value: item ? item.completed : null,
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          ...(item
            ? {
                text: "Delete",
                handler: (data) => {
                  console.log("deleting ", data.juz);
                  this.items.splice(
                    this.items.findIndex((i: any) => i.juz === item.juz),
                    1
                  );
                  this.saveItems();
                },
                cssClass: "delete-btn",
              }
            : null),
        },
        {
          text: item ? "Update" : "Add",
          cssClass: "add-btn",
          handler: (data) => {
            console.log(data);
            if (data.juz < 0 || data.juz > 30) {
              this.toast("Invalid juz number: " + data.juz, "danger");
              return;
            }
            if (!data.juz || !data.completed) {
              this.toast(
                "Invalid entries! Both fields are required.",
                "danger"
              );
              return;
            }

            data.juz = parseInt(data.juz);
            data.completed = parseFloat(data.completed);
            data.started = item ? item.started : new Date();
            data.updated = new Date();
            console.log(
              item,
              this.items.some((i: any) => i.juz === data.juz)
            );
            if (!item && this.items.some((i: any) => i.juz === data.juz)) {
              this.toast(
                "Entry for Juz " +
                  data.juz +
                  " already exists. Please edit the existing one.",
                "danger"
              );
              return;
            }
            const totalPages = this.getJuzInfo(data.juz, "count");
            data.total = totalPages;
            console.log(data, totalPages);
            if (data.completed > totalPages) {
              this.toast(
                `Juz ${data.juz} doesn't have that many pages. (${data.completed}) It only has ${totalPages}.`,
                "danger"
              );
              return;
            }

            item
              ? (this.items[
                  this.items.findIndex((n: any) => n.juz === item.juz)
                ] = data)
              : this.items.push(data);
            console.log(data);
            //Sort
            this.items = this.items.sort((a: any, b: any) => a.juz - b.juz);
            //Save
            this.saveItems();
          },
        },
      ],
    });
    alert.present();
  }
  saveItems() {
    this.storage.set("memorize", this.items);
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
  async toast(msg, clr = "primary") {
    const t = await this.toastController.create({
      message: msg,
      color: clr,
      duration: 3000,
    });
    t.present();
  }
  getJuzInfo(num, method) {
    if (typeof num !== "number") num = parseInt(num);
    switch (method) {
      case "name":
        return this.surahService.juzNames[num - 1];
        break;
      case "count":
        return num === this.surahService.juzPageNumbers.length
          ? 611 - this.surahService.juzPageNumbers[num - 1] + 1
          : this.surahService.juzPageNumbers[num] -
              this.surahService.juzPageNumbers[num - 1];
        break;

      default:
        return this.surahService.juzNames[num - 1];
        break;
    }
  }
  export() {
    window.navigator.clipboard.writeText(JSON.stringify(this.items));
    this.toast("Copied!", "success");
    this.popoverDismiss();
  }
  async import() {
    const importAlert = await this.alertController.create({
      header: "Import",
      inputs: [
        {
          type: "textarea",
          name: "textarea",
          placeholder: "Paste the exported JSON data here...",
        },
      ],
      buttons: [
        {
          text: "Import",
          cssClass: "import-btn-alert",
          handler: (data) => {
            console.log(data);
            this.items = JSON.parse(data.textarea);
            this.saveItems();
          },
        },
        {
          text: "Cancel",
          role: "cancel",
        },
      ],
    });
    importAlert.present();
    this.popoverDismiss();
  }
  async popoverDismiss() {
    await this.popoverController.dismiss();
  }
  async open(name) {
    const modal = await this.modalController.create({
      component: ProgressPage,
      componentProps: { name },
      swipeToClose: true,
    });
    modal.present();
  }
  async ionViewWillLeave() {
    const popover = await this.popoverController.getTop();
    if (popover) this.popoverDismiss();
  }
}
