// src/app/app.routes.ts — replace the previous version

import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard — Synapse',
  },
  {
    path: 'topics',
    loadChildren: () =>
      import('./features/topics/topics.routes').then(m => m.TOPIC_ROUTES),
  },
  {
    path: 'review',
    loadChildren: () =>
      import('./features/review-session/review-session.routes').then(m => m.REVIEW_ROUTES),
  },
  {
    path: 'notes',
    loadChildren: () =>
      import('./features/notes/notes.routes').then(m => m.NOTES_ROUTES),
  },
  { path: '**', redirectTo: 'dashboard' },
];