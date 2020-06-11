import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SurahPageRoutingModule } from './surah-routing.module';
import { SurahPage } from './surah.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SurahPageRoutingModule
  ],
  declarations: [SurahPage],
  providers: [],
  exports: []
})
export class SurahPageModule { }
