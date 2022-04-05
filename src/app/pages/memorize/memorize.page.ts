import { Component, OnInit } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
import { Observable, Subject } from "rxjs";

@Component({
  selector: "app-memorize",
  templateUrl: "./memorize.page.html",
  styleUrls: ["./memorize.page.scss"],
})
export class MemorizePage implements OnInit {
  items: Array<Object> = [];
  recommendedChapters = [
    'الفاتحہ',
    'یس',
    'رحمن',
    'واقعہ',
    'ملک',
    'کہف '  
  ]
  isOpen:boolean = true;
  constructor(
    private storage: Storage,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.storage.create();
    this.storage.set("v1", { mother: "son" }).then((res) => console.log(res));
    this.storage.set("v2", { mother: "son" }).then((res) => console.log(res));
    localStorage.setItem("v1", "son");
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
          value: new Date()
        },
        {
          name: "surah",
          id: "surah",
          type: "search",
          placeholder: "Surah name...",
          handler: (input)=>{
            console.log('Inside handler:',input);
          }
        },
        {
          name: 'from',
          id: 'from',
          type: 'number',
          placeholder: "From Ayah number..."
        },
        {
          name: 'to',
          id: 'to',
          type: 'number',
          placeholder: "To Ayah number..."
        },
        {
          name: 'finished',
          id: 'finished',
          type: 'checkbox',
          label: 'Finished',
          handler: ()=>{
            console.log('checkbox selected.');
          },
          checked: true
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data)=> {
            console.log(data);
            this.items.push(data);
          }
        }
      ]
    });
    alert.present();
  }
  getFormattedDate = (date) => new Date(date).toLocaleDateString();
  closeModal() {
    this.isOpen = false;
  }
}
