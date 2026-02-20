import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MorphologyPageRoutingModule } from './morphology-routing.module';
import { MorphologyPage } from './morphology.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MorphologyPageRoutingModule
  ],
  declarations: [MorphologyPage]
})
export class MorphologyPageModule {}
