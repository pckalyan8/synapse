import { Routes } from '@angular/router';
export const ML_ROUTES: Routes = [{
  path: '',
  loadComponent: () => import('./ml-overview.component').then(m => m.MlOverviewComponent),
  title: 'Machine Learning — Synapse',
}];