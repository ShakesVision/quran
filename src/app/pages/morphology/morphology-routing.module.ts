import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MorphologyPage } from './morphology.page';

const routes: Routes = [
  {
    path: '',
    component: MorphologyPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MorphologyPageRoutingModule {}
