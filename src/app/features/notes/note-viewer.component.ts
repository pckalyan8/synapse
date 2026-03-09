import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink }     from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { MatIcon }        from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MarkdownRendererComponent } from '../../shared/components/markdown-renderer/markdown-renderer.component';
import { EmptyStateComponent }       from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-note-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, MatProgressSpinner, MarkdownRendererComponent, EmptyStateComponent],
  template: `
    <div class="note-viewer">
      <nav class="note-viewer__breadcrumb">
        <a routerLink="/notes">Notes</a>
        <mat-icon>chevron_right</mat-icon>
        <span>{{ id() }}</span>
      </nav>

      @if (isLoading()) {
        <div class="note-viewer__loading">
          <mat-progress-spinner mode="indeterminate" diameter="36" />
        </div>
      } @else if (error()) {
        <app-empty-state icon="error_outline" [title]="error()!" />
      } @else if (content()) {
        <app-markdown-renderer [content]="content()!" />
      }
    </div>
  `,
  styles: [`
    .note-viewer {
      max-width: 800px;
      margin-inline: auto;
      padding-block-end: var(--space-16);

      &__breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
        margin-block-end: var(--space-8);

        a { color: var(--color-primary); text-decoration: none; &:hover { text-decoration: underline; } }
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }

      &__loading {
        display: flex;
        justify-content: center;
        padding-block: var(--space-12);
      }
    }
  `],
})
export class NoteViewerComponent {
  // Route param bound via withComponentInputBinding()
  readonly id = input.required<string>();

  private readonly http = inject(HttpClient);

  readonly content   = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  constructor() {
    // React to id() changes (e.g. navigating between notes)
    // Using effect to load when id signal changes
    import('@angular/core').then(({ effect }) => {
      effect(() => {
        const noteId = this.id();
        this.isLoading.set(true);
        this.error.set(null);
        this.http
          .get(`/assets/data/notes/${noteId}.md`, { responseType: 'text' })
          .subscribe({
            next: md => { this.content.set(md); this.isLoading.set(false); },
            error: () => {
              this.error.set(`Note "${noteId}" not found.`);
              this.isLoading.set(false);
            },
          });
      });
    });
  }
}