import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from '@ngx-translate/core';

import { TajweedPageRoutingModule } from "./tajweed-routing.module";
import { TajweedPage } from "./tajweed.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TranslateModule,
    TajweedPageRoutingModule,
  ],
  declarations: [TajweedPage],
})
export class TajweedPageModule {}
