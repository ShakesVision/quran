import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { PrivacyPageRoutingModule } from "./privacy-routing.module";

import { PrivacyPage } from "./privacy.page";
import { IonicModule } from "@ionic/angular";

@NgModule({
  imports: [CommonModule, IonicModule, PrivacyPageRoutingModule],
  declarations: [PrivacyPage],
})
export class PrivacyPageModule {}
