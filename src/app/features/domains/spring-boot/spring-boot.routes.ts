import { Routes } from '@angular/router';
export const SPRING_BOOT_ROUTES: Routes = [{
  path: '',
  loadComponent: () => import('./spring-boot-overview.component').then(m => m.SpringBootOverviewComponent),
  title: 'Spring Boot — Synapse',
}];