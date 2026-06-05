import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { MorphologyPageRoutingModule } from './morphology-routing.module';
import { MorphologyPage } from './morphology.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    MorphologyPageRoutingModule
  ],
  declarations: [MorphologyPage]
})
export class MorphologyPageModule {}
