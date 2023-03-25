import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ReadPageRoutingModule } from "./read-routing.module";

import { ReadPage } from "./read.page";
import { VirtualScrollerModule } from "ngx-virtual-scroller";
import { PinchZoomModule } from "ngx-pinch-zoom";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReadPageRoutingModule,
    VirtualScrollerModule,
    PinchZoomModule,
  ],
  declarations: [ReadPage],
})
export class ReadPageModule {}
