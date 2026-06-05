import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";
import { TranslateModule } from '@ngx-translate/core';

import { ScannedPageRoutingModule } from "./scanned-routing.module";

import { ScannedPage } from "./scanned.page";
import { PinchZoomModule } from "ngx-pinch-zoom";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    ScannedPageRoutingModule,
    PinchZoomModule,
  ],
  declarations: [ScannedPage],
})
export class ScannedPageModule {}
