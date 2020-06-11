import { Component, OnInit } from '@angular/core';
import { SurahService } from './../../services/surah.service';

@Component({
  selector: 'app-read',
  templateUrl: './read.page.html',
  styleUrls: ['./read.page.scss'],
})
export class ReadPage implements OnInit {
  surah;
  pages: string[];
  lines: string[];
  currentPage:number = 1;
  translation: string;

  constructor(private surahService: SurahService) { }

  ngOnInit() {
    this.surah = this.surahService.currentSurah;
    this.pages = this.surah.arabic.split("\n\n");
    this.lines = this.pages[this.currentPage-1].split("\n");
  }

  tabulate(strIn) {    
    //this.pages = strIn.split("\n\n");    
    /* strIn = strIn.replace(/^\s+|\s+$/g, "").replace(/\r?\n|\r/g, "</td></tr>\n<tr><td>");    
    if (strIn.length != "")
      return "<table align='center' dir='rtl'>\n<tr><td>" + strIn + "</td></tr>\n</table>";
    else
      return "متن موجود نہیں!"; */
  }

  goToPage(n:number) {
    this.currentPage +=n;
    this.lines = this.pages[this.currentPage-1].split("\n");    
  }

  openTrans(n:number) {
    this.translation = this.surah.urdu.split("\n\n")[this.currentPage-1].split("\n")[n];
    console.log((n+1) + this.translation);
    var e = document.getElementById("line_" + n.toString());
    e.insertAdjacentHTML('afterend', `<div class="trans"> ${this.translation} </div>`);
  }

}
