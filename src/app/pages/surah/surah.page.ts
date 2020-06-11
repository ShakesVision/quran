import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router, ActivatedRoute } from "@angular/router"
import { SurahService } from './../../services/surah.service';
import { Surah } from './../../services/surah';

@Component({
  selector: 'app-surah',
  templateUrl: 'surah.page.html',
  styleUrls: ['surah.page.scss'],
})
export class SurahPage implements OnInit {
  items: Observable<Surah[]>;

  constructor(private surahService: SurahService, private router: Router) {
      
  }
  ngOnInit() {
    this.items = this.surahService.getSurahs();
  }

  gotoRead(item) {
    this.surahService.currentSurah = item;
    this.router.navigate(['/read']);
  }

}