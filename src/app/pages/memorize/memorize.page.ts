import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-memorize',
  templateUrl: './memorize.page.html',
  styleUrls: ['./memorize.page.scss'],
})
export class MemorizePage implements OnInit {

  constructor(private storage: Storage) { }

  async ngOnInit() {    
    await this.storage.create();
    this.storage.set("v1",{mother:"son"}).then(res=>console.log(res));
    this.storage.set("v2",{mother:"son"}).then(res=>console.log(res));
    localStorage.setItem("v1","son");
  }

}
