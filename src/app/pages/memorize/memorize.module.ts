import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { MemorizePageRoutingModule } from "./memorize-routing.module";

import { MemorizePage } from "./memorize.page";
import { TranslateModule } from "@ngx-translate/core";
import { MemorizeAddModalComponent } from "../../components/memorize-add-modal/memorize-add-modal.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MemorizePageRoutingModule,
    TranslateModule,
  ],
  declarations: [MemorizePage, MemorizeAddModalComponent],
})
export class MemorizePageModule {}
