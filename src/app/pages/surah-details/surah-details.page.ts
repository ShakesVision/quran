import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SurahService } from './../../services/surah.service';
import { Surah } from './../../services/surah';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';


@Component({
  selector: 'app-surah-details',
  templateUrl: 'surah-details.page.html',
  styleUrls: ['surah-details.page.scss'],
})
export class SurahDetailsPage implements OnInit {
  surahForm: FormGroup;
  id = null;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private surahService: SurahService, private navCtrl: NavController) {

  }

  ngOnInit() {
    this.surahForm = this.fb.group({
      arabic: '',
      urdu: '',
      number: '',
      name: '',
      revelationType: '',
      startLineNo: ''
    });

    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id && this.id != 'null') {
      this.surahService.getSurahById(this.id).subscribe(res => {
        console.log('my item: ', res);
        this.surahForm.patchValue(res);
      });
    } else {
      this.id = null;
    }
  }

  submit() {
    if (this.id) {
      this.surahService.updateSurahById(this.id, this.surahForm.value).then(res => {
        //updated. Update the index collection too. Code in notepad++. or under this IF block              

        let singleIdWeGot = "";
        this.surahService.fetchIndexBySurahNumber(this.id)
          .snapshotChanges().subscribe(a => {
            if (a.length == 1) {
              let indexGroup = ({
                surahNo: this.surahForm.get('number').value,
                surahName: this.surahForm.get('name').value,
                remoteId: this.id,
              });
              singleIdWeGot = a[0].payload.doc.id;
              console.log(singleIdWeGot);
              this.surahService.updateIndexById(singleIdWeGot, indexGroup).then(res => {
                console.log("updated" + res);
              });
              this.navCtrl.pop();
            }
            else console.log("Found Multiple items.");
          });
      });
    }
    else {
      this.surahService.addSurah(this.surahForm.value).then(res => {
        let indexGroup = ({
          surahNo: this.surahForm.get('number').value,
          surahName: this.surahForm.get('name').value,
          remoteId: res.id,
        });
        this.surahService.addIndex(indexGroup).then(res => {
          console.log(res);
        });
        this.navCtrl.pop();
      });
    }
  }

  delete() {
    this.surahService.deleteSurahById(this.id).then(res => {
      let singleIdWeGot = "";
      this.surahService.fetchIndexBySurahNumber(this.id)
        .snapshotChanges().subscribe(a => {
          if (a.length == 1) {
            singleIdWeGot = a[0].payload.doc.id;
            console.log(singleIdWeGot);
            this.surahService.deleteIndexById(singleIdWeGot).then(res => {
              console.log("deleted " + res);
            });
            this.navCtrl.pop();
          }
          else {
            console.log("Found Multiple items.");
            alert("Found" + a.length + "items enties.")
          }

        });
      this.navCtrl.pop();
    });
  }
}
