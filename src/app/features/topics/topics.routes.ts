import { Routes } from '@angular/router';

export const TOPIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./topic-list.component').then(m => m.TopicListComponent),
    title: 'Topics — Synapse',
  },
  {
    path: 'java',
    loadChildren: () => import('../domains/java/java.routes').then(m => m.JAVA_ROUTES),
  },
  {
    path: 'spring-boot',
    loadChildren: () => import('../domains/spring-boot/spring-boot.routes').then(m => m.SPRING_BOOT_ROUTES),
  },
  {
    path: 'python',
    loadChildren: () => import('../domains/python/python.routes').then(m => m.PYTHON_ROUTES),
  },
  {
    path: 'machine-learning',
    loadChildren: () => import('../domains/machine-learning/ml.routes').then(m => m.ML_ROUTES),
  },
  {
    path: 'generative-ai',
    loadChildren: () => import('../domains/generative-ai/gen-ai.routes').then(m => m.GEN_AI_ROUTES),
  },
];