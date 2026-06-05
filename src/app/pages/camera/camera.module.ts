import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";
import { CameraPageRoutingModule } from "./camera-routing.module";
import { CameraPage } from "./camera.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TranslateModule,
    CameraPageRoutingModule,
  ],
  declarations: [CameraPage],
})
export class CameraPageModule {}
