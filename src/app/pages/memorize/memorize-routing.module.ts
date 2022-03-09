import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MemorizePage } from './memorize.page';

const routes: Routes = [
  {
    path: '',
    component: MemorizePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MemorizePageRoutingModule {}
