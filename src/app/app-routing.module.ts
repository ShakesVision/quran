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
  {
    path: 'memorize',
    loadChildren: () => import('./pages/memorize/memorize.module').then( m => m.MemorizePageModule)
  },
  {
    path: 'progress',
    loadChildren: () => import('./pages/progress/progress.module').then( m => m.ProgressPageModule)
  },  {
    path: 'listen',
    loadChildren: () => import('./pages/listen/listen.module').then( m => m.ListenPageModule)
  },
  {
    path: 'scanned',
    loadChildren: () => import('./pages/scanned/scanned.module').then( m => m.ScannedPageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
