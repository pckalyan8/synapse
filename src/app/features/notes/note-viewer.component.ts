// src/app/features/notes/note-viewer.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink }        from '@angular/router';
import { FormsModule }               from '@angular/forms';
import { HttpClient }                from '@angular/common/http';
import { MatIcon }                   from '@angular/material/icon';
import { MatButton, MatIconButton }  from '@angular/material/button';
import { MatProgressSpinner }        from '@angular/material/progress-spinner';
import { MatTooltipModule }          from '@angular/material/tooltip';
import { MarkdownRendererComponent } from '../../shared/components/markdown-renderer/markdown-renderer.component';
import { EmptyStateComponent }       from '../../shared/components/empty-state/empty-state.component';
import { NoteManagementService }     from '../../core/services/note-management.service';

@Component({
  selector: 'app-note-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule,
    MatIcon, MatButton, MatIconButton, MatTooltipModule,
    MatProgressSpinner, MarkdownRendererComponent, EmptyStateComponent,
  ],
  template: `
    <div class="note-viewer">

      <!-- ── Breadcrumb / toolbar ──────────────────────────────────────── -->
      <nav class="note-viewer__breadcrumb">
        <a routerLink="/notes">← Notes</a>
        <mat-icon>chevron_right</mat-icon>
        <span class="note-viewer__breadcrumb-title">{{ noteTitle() }}</span>

        @if (isCustom() && !editing()) {
          <div class="note-viewer__toolbar">
            <button mat-icon-button matTooltip="Edit note" (click)="startEdit()">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Delete note" class="btn-danger" (click)="deleteNote()">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        }

        @if (editing()) {
          <div class="note-viewer__toolbar">
            <button mat-stroked-button (click)="cancelEdit()">Cancel</button>
            <button mat-flat-button (click)="saveEdit()"
                    [disabled]="!editForm.title.trim() || !editForm.content.trim()">
              <mat-icon>save</mat-icon> Save
            </button>
          </div>
        }
      </nav>

      <!-- ── View mode ─────────────────────────────────────────────────── -->
      @if (!editing()) {
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
      }

      <!-- ── Edit mode (custom notes only) ─────────────────────────────── -->
      @if (editing()) {
        <div class="note-editor">

          <div class="note-editor__row">
            <label class="note-editor__label">Title *
              <input class="note-editor__input" [(ngModel)]="editForm.title"
                     placeholder="Note title" />
            </label>
            <label class="note-editor__label">Domain *
              <input class="note-editor__input" [(ngModel)]="editForm.domain"
                     placeholder="e.g. Java" list="domain-list-viewer" />
              <datalist id="domain-list-viewer">
                <option value="Java" ></option><option value="Spring Boot" ></option>
                <option value="Python" ></option><option value="Machine Learning" ></option>
                <option value="Generative AI" ></option>
              </datalist>
            </label>
          </div>

          <div class="note-editor__tab-bar">
            <button [class.active]="editTab() === 'write'"
                    (click)="editTab.set('write')" type="button">Write</button>
            <button [class.active]="editTab() === 'preview'"
                    (click)="editTab.set('preview')" type="button">Preview</button>
          </div>

          @if (editTab() === 'write') {
            <textarea class="note-editor__textarea"
                      [(ngModel)]="editForm.content"
                      placeholder="# My Note&#10;&#10;Write Markdown here…"
                      rows="24">
            </textarea>
          } @else {
            <div class="note-editor__preview">
              <app-markdown-renderer [content]="editForm.content || ''" />
            </div>
          }

        </div>
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
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
        margin-block-end: var(--space-6);
        flex-wrap: wrap;

        a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: var(--font-weight-medium);
          white-space: nowrap;
          &:hover { text-decoration: underline; }
        }
        mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      }

      &__breadcrumb-title {
        flex: 1;
        color: var(--color-on-surface);
        font-weight: var(--font-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        margin-inline-start: auto;
      }

      &__meta { margin-block-end: var(--space-5); }

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

    .btn-danger ::ng-deep mat-icon { color: var(--color-error); }

    .note-editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);

      &__row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: var(--space-4);
        @media (max-width: 560px) { grid-template-columns: 1fr; }
      }

      &__label {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-on-surface-variant);
      }

      &__input {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        color: var(--color-on-surface);
        font-size: var(--font-size-md);
        outline: none;
        transition: border-color var(--duration-fast);
        &:focus { border-color: var(--color-primary); }
      }

      &__tab-bar {
        display: flex;
        gap: var(--space-1);
        background: var(--color-surface-1);
        border-radius: var(--radius-md);
        padding: 4px;
        align-self: flex-start;
        border: 1px solid var(--color-outline-variant);

        button {
          all: unset;
          cursor: pointer;
          padding: var(--space-1) var(--space-4);
          border-radius: calc(var(--radius-md) - 2px);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-on-surface-variant);
          transition: background var(--duration-fast), color var(--duration-fast);
          &.active { background: var(--color-primary); color: var(--color-on-primary); }
        }
      }

      &__textarea {
        padding: var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        color: var(--color-on-surface);
        font-size: var(--font-size-sm);
        font-family: var(--font-family-mono, 'Courier New', monospace);
        outline: none;
        resize: vertical;
        min-height: 420px;
        line-height: 1.6;
        transition: border-color var(--duration-fast);
        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent);
        }
      }

      &__preview {
        padding: var(--space-5);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline-variant);
        background: var(--color-surface-1);
        min-height: 420px;
      }
    }
  `],
})
export class NoteViewerComponent {
  readonly id = input.required<string>();

  private readonly http        = inject(HttpClient);
  private readonly noteService = inject(NoteManagementService);
  private readonly router      = inject(Router);

  readonly content    = signal<string | null>(null);
  readonly isLoading  = signal(true);
  readonly error      = signal<string | null>(null);
  readonly noteTitle  = signal<string>('');
  readonly noteDomain = signal<string>('');
  readonly isCustom   = signal(false);

  readonly editing = signal(false);
  readonly editTab = signal<'write' | 'preview'>('write');
  editForm = { title: '', domain: '', content: '' };

  constructor() {
    effect(() => {
      const noteId = this.id();
      this.isLoading.set(true);
      this.error.set(null);
      this.editing.set(false);

      const custom = this.noteService.getCustomNote(noteId);
      if (custom) {
        this.content.set(custom.content);
        this.noteTitle.set(custom.title);
        this.noteDomain.set(custom.domain);
        this.isCustom.set(true);
        this.isLoading.set(false);
        return;
      }

      this.isCustom.set(false);
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
          error: () => { this.error.set(`Note "${noteId}" not found.`); this.isLoading.set(false); },
        });
    });
  }

  startEdit(): void {
    this.editForm = { title: this.noteTitle(), domain: this.noteDomain(), content: this.content() ?? '' };
    this.editTab.set('write');
    this.editing.set(true);
  }

  cancelEdit(): void { this.editing.set(false); }

  saveEdit(): void {
    if (!this.editForm.title.trim() || !this.editForm.content.trim()) return;
    this.noteService.updateNote(this.id(), this.editForm.title.trim(), this.editForm.domain.trim(), this.editForm.content.trim());
    this.noteTitle.set(this.editForm.title.trim());
    this.noteDomain.set(this.editForm.domain.trim());
    this.content.set(this.editForm.content.trim());
    this.editing.set(false);
  }

  deleteNote(): void {
    if (confirm('Delete this note? This cannot be undone.')) {
      this.noteService.deleteNote(this.id());
      this.router.navigate(['/notes']);
    }
  }
}
