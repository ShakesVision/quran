import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PlaygroundPageRoutingModule } from './playground-routing.module';
import { PlaygroundPage } from './playground.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlaygroundPageRoutingModule,
  ],
  declarations: [PlaygroundPage],
})
export class PlaygroundPageModule {}

