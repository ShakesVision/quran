import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ScannedPage } from './scanned.page';

const routes: Routes = [
  {
    path: '',
    component: ScannedPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScannedPageRoutingModule {}
