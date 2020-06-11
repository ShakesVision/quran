import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)},
  { path: 'surahs', loadChildren: () => import('./pages/surah/surah.module').then( m => m.SurahPageModule)},
    { path: 'surahs/:id', loadChildren: () => import('./pages/surah-details/surah-details.module').then( m => m.SurahDetailsPageModule)},
  {
    path: 'read',
    loadChildren: () => import('./pages/read/read.module').then( m => m.ReadPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
