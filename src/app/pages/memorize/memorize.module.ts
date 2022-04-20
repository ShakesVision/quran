import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { MemorizePageRoutingModule } from "./memorize-routing.module";

import { MemorizePage } from "./memorize.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MemorizePageRoutingModule,
  ],
  declarations: [MemorizePage],
})
export class MemorizePageModule {}
