import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SurahDetailsPageRoutingModule } from './surah-details-routing.module';
import { SurahDetailsPage } from './surah-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    SurahDetailsPageRoutingModule
  ],
  declarations: [SurahDetailsPage],
  providers: [],
  exports: []
})
export class SurahDetailsPageModule { }
