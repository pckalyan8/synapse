import { Routes } from '@angular/router';
export const GEN_AI_ROUTES: Routes = [{
  path: '',
  loadComponent: () => import('./gen-ai-overview.component').then(m => m.GenAiOverviewComponent),
  title: 'Generative AI — Synapse',
}];