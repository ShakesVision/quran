import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SurahDetailsPage } from './surah-details.page';

const routes: Routes = [
  {
    path: '',
    component: SurahDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SurahDetailsPageRoutingModule {}