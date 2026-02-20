import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { TajweedPageRoutingModule } from "./tajweed-routing.module";
import { TajweedPage } from "./tajweed.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TajweedPageRoutingModule,
  ],
  declarations: [TajweedPage],
})
export class TajweedPageModule {}
