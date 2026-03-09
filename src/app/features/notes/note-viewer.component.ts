// src/app/features/notes/note-viewer.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { NoteManagementService }     from '../../core/services/note-management.service';

@Component({
  selector: 'app-note-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon, MatProgressSpinner, MarkdownRendererComponent, EmptyStateComponent],
  template: `
    <div class="note-viewer">
      <nav class="note-viewer__breadcrumb">
        <a routerLink="/notes">← Notes</a>
        <mat-icon>chevron_right</mat-icon>
        <span>{{ noteTitle() }}</span>
      </nav>

      @if (isLoading()) {
        <div class="note-viewer__loading">
          <mat-progress-spinner mode="indeterminate" diameter="36" />
        </div>
      } @else if (error()) {
        <app-empty-state icon="error_outline" [title]="error()!" />
      } @else if (content()) {
        <div class="note-viewer__meta">
          @if (noteDomain()) {
            <span class="note-viewer__domain">{{ noteDomain() }}</span>
          }
        </div>
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
        margin-block-end: var(--space-6);

        a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
          &:hover { text-decoration: underline; }
        }
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }

      &__meta {
        margin-block-end: var(--space-6);
      }

      &__domain {
        display: inline-block;
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        background: var(--color-primary-container);
        color: var(--color-on-primary-container);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.06em;
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
  readonly id = input.required<string>();

  private readonly http        = inject(HttpClient);
  private readonly noteService = inject(NoteManagementService);

  readonly content   = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);
  readonly noteTitle = signal<string>('');
  readonly noteDomain = signal<string>('');

  constructor() {
    effect(() => {
      const noteId = this.id();
      this.isLoading.set(true);
      this.error.set(null);

      // Check if it's a custom (localStorage) note
      const custom = this.noteService.getCustomNote(noteId);
      if (custom) {
        this.content.set(custom.content);
        this.noteTitle.set(custom.title);
        this.noteDomain.set(custom.domain);
        this.isLoading.set(false);
        return;
      }

      // Otherwise, fetch from assets
      const meta = this.noteService.allNoteMeta().find(n => n.id === noteId);
      if (meta) {
        this.noteTitle.set(meta.title);
        this.noteDomain.set(meta.domain);
      } else {
        this.noteTitle.set(noteId);
      }

      this.http
        .get(`/data/notes/${noteId}.md`, { responseType: 'text' })
        .subscribe({
          next: md => { this.content.set(md); this.isLoading.set(false); },
          error: () => {
            this.error.set(`Note "${noteId}" not found.`);
            this.isLoading.set(false);
          },
        });
    });
  }
}