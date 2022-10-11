import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { JuzPageRoutingModule } from './juz-routing.module';

import { JuzPage } from './juz.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    JuzPageRoutingModule
  ],
  declarations: [JuzPage]
})
export class JuzPageModule {}
