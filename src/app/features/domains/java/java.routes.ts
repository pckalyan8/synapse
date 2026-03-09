import { Routes } from '@angular/router';

export const JAVA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./java-overview.component').then(m => m.JavaOverviewComponent),
    title: 'Java — Synapse',
  },
];