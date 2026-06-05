import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ReadPageRoutingModule } from "./read-routing.module";

import { ReadPage } from "./read.page";
import { VirtualScrollerModule } from "ngx-virtual-scroller";
import { PinchZoomModule } from "ngx-pinch-zoom";
import { TafseerModalComponent } from "src/app/components/tafseer-modal";
import { TranslateModule } from "@ngx-translate/core";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReadPageRoutingModule,
    VirtualScrollerModule,
    PinchZoomModule,
    TranslateModule,
  ],
  declarations: [ReadPage, TafseerModalComponent],
})
export class ReadPageModule {}
