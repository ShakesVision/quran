import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SurahService } from './../../services/surah.service';
import { Surah } from './../../services/surah';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

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
        this.navCtrl.pop();
      });
    } else {
      this.surahService.addSurah(this.surahForm.value).then(res => {
        this.navCtrl.pop();
      });
    }
  }

  delete() {
    this.surahService.deleteSurahById(this.id).then(res => {
      this.navCtrl.pop();
    });
  }
}
