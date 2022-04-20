import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScannedPageRoutingModule } from './scanned-routing.module';

import { ScannedPage } from './scanned.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScannedPageRoutingModule
  ],
  declarations: [ScannedPage]
})
export class ScannedPageModule {}
