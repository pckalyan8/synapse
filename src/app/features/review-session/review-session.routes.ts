import { Routes } from '@angular/router';

export const REVIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./review-session.component').then(m => m.ReviewSessionComponent),
    title: 'Review — Synapse',
  },
];