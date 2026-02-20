import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { TajweedPage } from "./tajweed.page";

const routes: Routes = [
  {
    path: "",
    component: TajweedPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TajweedPageRoutingModule {}
