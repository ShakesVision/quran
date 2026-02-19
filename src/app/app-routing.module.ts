import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // Home / Dashboard
  { 
    path: '', 
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  
  // Browse - Juz/Surah grid selector
  { 
    path: 'browse', 
    loadChildren: () => import('./pages/juz/juz.module').then(m => m.JuzPageModule)
  },
  
  // =============================================
  // NEW URL-BASED ROUTES - Refresh-safe navigation
  // =============================================
  
  // Full Quran reader
  {
    path: 'quran',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'full' }
  },
  {
    path: 'quran/page/:page',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'full' }
  },
  
  // Juz reader with URL params
  {
    path: 'juz/:id',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'juz' }
  },
  {
    path: 'juz/:id/ruku/:ruku',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'juz' }
  },
  
  // Surah reader with URL params
  {
    path: 'surah/:id',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'surah' }
  },
  {
    path: 'surah/:id/ayah/:ayah',
    loadChildren: () => import('./pages/read/read.module').then(m => m.ReadPageModule),
    data: { mode: 'surah' }
  },
  
  // =============================================
  // LEGACY ROUTES - Keep for backward compatibility
  // =============================================
  
  { 
    path: 'juz', 
    redirectTo: 'browse', 
    pathMatch: 'full' 
  },
  { 
    path: 'read', 
    redirectTo: 'quran', 
    pathMatch: 'full' 
  },
  { 
    path: 'surahs', 
    loadChildren: () => import('./pages/surah/surah.module').then(m => m.SurahPageModule)
  },
  { 
    path: 'surahs/:id', 
    loadChildren: () => import('./pages/surah-details/surah-details.module').then(m => m.SurahDetailsPageModule)
  },
  
  // =============================================
  // OTHER FEATURES
  // =============================================
  
  {
    path: 'discover',
    loadChildren: () => import('./pages/discover/discover.module').then(m => m.DiscoverPageModule)
  },
  {
    path: 'memorize',
    loadChildren: () => import('./pages/memorize/memorize.module').then(m => m.MemorizePageModule)
  },
  {
    path: 'progress',
    loadChildren: () => import('./pages/progress/progress.module').then(m => m.ProgressPageModule)
  },
  {
    path: 'listen',
    loadChildren: () => import('./pages/listen/listen.module').then(m => m.ListenPageModule)
  },
  {
    path: 'scanned',
    loadChildren: () => import('./pages/scanned/scanned.module').then(m => m.ScannedPageModule)
  },
  {
    path: 'scanned/page/:page',
    loadChildren: () => import('./pages/scanned/scanned.module').then(m => m.ScannedPageModule)
  },
  {
    path: 'playground',
    loadChildren: () => import('./pages/playground/playground.module').then(m => m.PlaygroundPageModule)
  },
  
  // Wildcard - redirect to home
  { 
    path: '**', 
    redirectTo: '', 
    pathMatch: 'full' 
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
