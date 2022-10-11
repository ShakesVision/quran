import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { JuzPage } from './juz.page';

const routes: Routes = [
  {
    path: '',
    component: JuzPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JuzPageRoutingModule {}
