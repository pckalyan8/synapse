import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink }       from '@angular/router';
import { HttpClient }       from '@angular/common/http';
import { MatIcon }          from '@angular/material/icon';
import { toSignal }         from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

export interface NoteEntry {
  id: string;
  title: string;
  domain: string;
  path: string;       // path to .md file in assets
  updatedAt: string;
}

@Component({
  selector: 'app-note-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, EmptyStateComponent],
  template: `
    <div class="notes-page">
      <header class="notes-page__header">
        <h1>Notes</h1>
        <p>Long-form Markdown reference notes per domain.</p>
      </header>

      @if (notes().length) {
        <div class="notes-grid">
          @for (note of notes(); track note.id) {
            <a class="note-card" [routerLink]="[note.id]">
              <mat-icon>description</mat-icon>
              <div class="note-card__body">
                <h3>{{ note.title }}</h3>
                <span class="note-card__domain">{{ note.domain }}</span>
              </div>
              <mat-icon class="note-card__arrow">chevron_right</mat-icon>
            </a>
          }
        </div>
      } @else {
        <app-empty-state
          icon="description"
          title="No notes yet"
          message="Add Markdown files to assets/data/notes/ and register them in notes-index.json." />
      }
    </div>
  `,
  styles: [`
    .notes-page {
      max-width: 720px;
      margin-inline: auto;

      &__header {
        margin-block-end: var(--space-8);
        p { color: var(--color-on-surface-variant); margin-block-start: var(--space-2); }
      }
    }

    .notes-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .note-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface-1);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-1);
      text-decoration: none;
      color: inherit;
      border: 1px solid transparent;
      transition:
        box-shadow   var(--duration-fast) var(--easing-standard),
        border-color var(--duration-fast) var(--easing-standard);

      &:hover {
        box-shadow: var(--shadow-2);
        border-color: var(--color-primary);
      }

      mat-icon:first-child {
        color: var(--color-primary);
        flex-shrink: 0;
      }

      &__body {
        flex: 1;
        h3 { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
      }

      &__domain {
        font-size: var(--font-size-xs);
        color: var(--color-on-surface-variant);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      &__arrow { color: var(--color-outline); flex-shrink: 0; }
    }
  `],
})
export class NoteListComponent {
  private readonly http = inject(HttpClient);
  readonly notes = toSignal(
    this.http.get<NoteEntry[]>('/data/notes/notes-index.json'),
    { initialValue: [] },
  );
}