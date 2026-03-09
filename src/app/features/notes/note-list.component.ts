// src/app/features/notes/note-list.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule }        from '@angular/forms';
import { MatIcon }            from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { NoteManagementService, ManagedNote } from '../../core/services/note-management.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-note-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon, MatButton, MatIconButton, MatTooltipModule, DatePipe],
  template: `
    <div class="notes-page">
      <header class="notes-page__header">
        <div class="notes-page__title-row">
          <div>
            <h1>Notes</h1>
            <p>Long-form Markdown reference notes per domain.</p>
          </div>
          <button mat-flat-button class="add-btn" (click)="openEditor()">
            <mat-icon>add</mat-icon> New Note
          </button>
        </div>
      </header>

      @if (allNotes().length) {
        <div class="notes-grid">
          @for (note of allNotes(); track note.id) {
            <div class="note-card" [class.note-card--custom]="!note.isBuiltIn">
              <a class="note-card__link" [routerLink]="[note.id]">
                <mat-icon class="note-card__icon">{{ note.isBuiltIn ? 'description' : 'edit_note' }}</mat-icon>
                <div class="note-card__body">
                  <h3>{{ note.title }}</h3>
                  <span class="note-card__domain">{{ note.domain }}</span>
                  <span class="note-card__date">{{ note.updatedAt | date:'mediumDate' }}</span>
                </div>
                <mat-icon class="note-card__arrow">chevron_right</mat-icon>
              </a>
              @if (!note.isBuiltIn) {
                <div class="note-card__custom-actions">
                  <button mat-icon-button class="action-btn" matTooltip="Edit note"
                          (click)="openEditor(note)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button class="action-btn action-btn--danger" matTooltip="Delete note"
                          (click)="deleteNote(note.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="notes-empty">
          <mat-icon>edit_note</mat-icon>
          <p>No notes yet. Click <strong>New Note</strong> to create one.</p>
        </div>
      }
    </div>

    <!-- ── Note Editor Modal ──────────────────────────────────────────── -->
    @if (editorOpen()) {
      <div class="modal-backdrop" (click)="closeEditor()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h2>{{ editingNote() ? 'Edit Note' : 'New Note' }}</h2>
            <button mat-icon-button (click)="closeEditor()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal__fields">
            <label class="modal__label">Title *
              <input class="modal__input" [(ngModel)]="form.title" placeholder="e.g. Java Streams Deep Dive" />
            </label>

            <label class="modal__label">Domain / Topic *
              <input class="modal__input" [(ngModel)]="form.domain" placeholder="e.g. Java" list="domain-list" />
              <datalist id="domain-list">
                <option value="Java"></option><option value="Spring Boot"></option><option value="Python"></option>
                <option value="Machine Learning" ></option><option value="Generative AI" ></option>
              </datalist>
            </label>

            <label class="modal__label">Content (Markdown) *
              <div class="editor-tabs">
                <button [class.active]="editorTab() === 'write'" (click)="editorTab.set('write')" type="button">Write</button>
                <button [class.active]="editorTab() === 'preview'" (click)="editorTab.set('preview')" type="button">Preview</button>
              </div>
              @if (editorTab() === 'write') {
                <textarea class="modal__textarea"
                          [(ngModel)]="form.content"
                          placeholder="# My Note&#10;&#10;Write Markdown here…"
                          rows="18">
                </textarea>
              } @else {
                <div class="modal__preview-pane"
                     [innerHTML]="renderMarkdown(form.content)">
                </div>
              }
            </label>
          </div>

          <div class="modal__actions">
            <button mat-stroked-button (click)="closeEditor()">Cancel</button>
            <button mat-flat-button (click)="saveNote()"
                    [disabled]="!form.title.trim() || !form.domain.trim() || !form.content.trim()">
              {{ editingNote() ? 'Save Changes' : 'Create Note' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .notes-page {
      max-width: 760px;
      margin-inline: auto;

      &__title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      }

      &__header {
        margin-block-end: var(--space-8);
        p { color: var(--color-on-surface-variant); margin-block-start: var(--space-2); }
      }
    }

    .add-btn { border-radius: var(--radius-full) !important; align-self: center; }

    .notes-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .note-card {
      display: flex;
      align-items: center;
      background: var(--color-surface-1);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-1);
      border: 1px solid transparent;
      overflow: hidden;
      transition:
        box-shadow   var(--duration-fast) var(--easing-standard),
        border-color var(--duration-fast) var(--easing-standard);

      &:hover {
        box-shadow: var(--shadow-2);
        border-color: var(--color-primary);
      }

      &--custom { border-left: 3px solid var(--color-primary); }

      &__link {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        text-decoration: none;
        color: inherit;
        min-width: 0;
      }

      &__icon {
        color: var(--color-primary);
        flex-shrink: 0;
      }

      &__body {
        flex: 1;
        min-width: 0;
        h3 {
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-semibold);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      &__domain {
        display: inline-block;
        font-size: var(--font-size-xs);
        color: var(--color-on-surface-variant);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-inline-end: var(--space-3);
      }

      &__date {
        font-size: var(--font-size-xs);
        color: var(--color-on-surface-variant);
      }

      &__arrow { color: var(--color-outline); flex-shrink: 0; }

      &__custom-actions {
        display: flex;
        padding-inline-end: var(--space-2);
        opacity: 0;
        transition: opacity var(--duration-fast);
      }

      &:hover &__custom-actions { opacity: 1; }
    }

    .action-btn {
      width: 32px !important;
      height: 32px !important;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &--danger mat-icon { color: var(--color-error); }
    }

    .notes-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-16) var(--space-4);
      text-align: center;
      color: var(--color-on-surface-variant);
      mat-icon { font-size: 56px; width: 56px; height: 56px; opacity: 0.4; }
      p { font-size: var(--font-size-lg); }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
      backdrop-filter: blur(3px);
    }

    .modal {
      background: var(--color-surface-2);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      width: 100%;
      max-width: 700px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      box-shadow: var(--shadow-5);
      overflow: hidden;

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); }
      }

      &__fields {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        overflow-y: auto;
        flex: 1;
        padding-inline-end: var(--space-1);
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

      &__textarea {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        color: var(--color-on-surface);
        font-size: var(--font-size-sm);
        font-family: 'Courier New', monospace;
        outline: none;
        resize: vertical;
        min-height: 300px;
        transition: border-color var(--duration-fast);
        &:focus { border-color: var(--color-primary); }
      }

      &__preview-pane {
        min-height: 300px;
        padding: var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        overflow-y: auto;
        font-size: var(--font-size-sm);
        line-height: 1.7;
      }

      &__actions {
        display: flex;
        gap: var(--space-3);
        justify-content: flex-end;
        padding-block-start: var(--space-2);
        border-top: 1px solid var(--color-outline-variant);
      }
    }

    .editor-tabs {
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

        &.active {
          background: var(--color-primary);
          color: var(--color-on-primary);
        }
      }
    }
  `],
})
export class NoteListComponent {
  private readonly noteService = inject(NoteManagementService);

  readonly allNotes = this.noteService.allNoteMeta;

  readonly editorOpen  = signal(false);
  readonly editingNote = signal<ManagedNote | null>(null);
  readonly editorTab   = signal<'write' | 'preview'>('write');

  form = { title: '', domain: '', content: '' };

  openEditor(note?: ManagedNote): void {
    this.editingNote.set(note ?? null);
    this.form = note && !note.isBuiltIn
      ? { title: note.title, domain: note.domain, content: note.content }
      : { title: '', domain: '', content: '' };
    this.editorTab.set('write');
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingNote.set(null);
  }

  saveNote(): void {
    const { title, domain, content } = this.form;
    if (!title.trim() || !domain.trim() || !content.trim()) return;
    const editing = this.editingNote();
    if (editing) {
      this.noteService.updateNote(editing.id, title.trim(), domain.trim(), content.trim());
    } else {
      this.noteService.addNote(title.trim(), domain.trim(), content.trim());
    }
    this.closeEditor();
  }

  deleteNote(id: string): void {
    if (confirm('Delete this note? This cannot be undone.')) {
      this.noteService.deleteNote(id);
    }
  }

  renderMarkdown(md: string): string {
    if (!md) return '<p style="color: var(--color-on-surface-variant); font-style: italic;">Nothing to preview yet.</p>';
    // Simple markdown rendering for preview
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|l|p])(.+)$/gm, '<p>$1</p>');
  }
}