import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/weather/weather').then(m => m.Weather) },
  { path: '**', redirectTo: '' }
];
