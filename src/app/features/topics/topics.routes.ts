// src/app/features/topics/topics.routes.ts
// REPLACES the previous version that had individual domain sub-routes.
// All topics (built-in and custom) now use the unified TopicExplorerComponent.

import { Routes } from '@angular/router';

export const TOPIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./topic-list.component').then(m => m.TopicListComponent),
    title: 'Topics — Synapse',
  },
  {
    path: ':topicId',
    loadComponent: () =>
      import('./topic-explorer.component').then(m => m.TopicExplorerComponent),
    // title is set dynamically by the component
  },
];
