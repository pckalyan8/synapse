import { Routes } from '@angular/router';

export const NOTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./note-list.component').then(m => m.NoteListComponent),
    title: 'Notes — Synapse',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./note-viewer.component').then(m => m.NoteViewerComponent),
  },
];