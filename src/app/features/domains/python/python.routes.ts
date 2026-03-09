import { Routes } from '@angular/router';
export const PYTHON_ROUTES: Routes = [{
  path: '',
  loadComponent: () => import('./python-overview.component').then(m => m.PythonOverviewComponent),
  title: 'Python — Synapse',
}];