import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SurahPageRoutingModule } from './surah-routing.module';
import { SurahPage } from './surah.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    SurahPageRoutingModule
  ],
  declarations: [SurahPage],
  providers: [],
  exports: []
})
export class SurahPageModule { }
