// src/app/features/topics/topic-list.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink }    from '@angular/router';
import { FormsModule }   from '@angular/forms';
import { MatIcon }       from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltipModule }         from '@angular/material/tooltip';

import { FlashcardStateService }   from '../../core/services/flashcard-state.service';
import { TopicManagementService, ManagedTopic, Subtopic } from '../../core/services/topic-management.service';

type ModalMode = 'add-topic' | 'edit-topic' | 'add-subtopic' | 'edit-subtopic' | null;

const MATERIAL_ICONS = [
  'code','coffee','eco','psychology','auto_awesome','school','science',
  'terminal','cloud','storage','security','bug_report','analytics',
  'architecture','api','device_hub','data_object','functions','memory',
  'hub','workspaces','layers','category','bookmark',
];

const ACCENT_COLORS = [
  '#e76f51','#52b788','#4361ee','#9b5de5','#f72585',
  '#06d6a0','#ffd166','#ef476f','#118ab2','#073b4c',
  '#e9c46a','#264653','#2a9d8f','#e63946','#457b9d',
];

@Component({
  selector: 'app-topic-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon, MatButton, MatIconButton, MatTooltipModule],
  template: `
    <div class="topic-page">
      <header class="topic-page__header">
        <div class="topic-page__title-row">
          <div>
            <h1>Knowledge Domains</h1>
            <p>Select a domain to study its flashcards and notes.</p>
          </div>
          <button mat-flat-button class="add-btn" (click)="openAddTopic()">
            <mat-icon>add</mat-icon> New Topic
          </button>
        </div>
      </header>

      <div class="topic-grid">
        @for (topic of topics(); track topic.id) {
          <div class="topic-card" [style.--accent]="topic.accentColor">

            <!-- Header row -->
            <div class="topic-card__header">
              <div class="topic-card__icon-wrap">
                <mat-icon>{{ topic.icon }}</mat-icon>
              </div>
              @if (!topic.isBuiltIn) {
                <div class="topic-card__actions">
                  <button mat-icon-button class="action-btn" matTooltip="Edit topic"
                          (click)="openEditTopic(topic); $event.preventDefault()">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button class="action-btn action-btn--danger" matTooltip="Delete topic"
                          (click)="deleteTopic(topic.id); $event.preventDefault()">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </div>

            <!-- Body (navigable) -->
            <a class="topic-card__link" [routerLink]="topic.isBuiltIn ? [topic.id] : null"
               [class.topic-card__link--disabled]="!topic.isBuiltIn">
              <div class="topic-card__body">
                <h2 class="topic-card__title">{{ topic.label }}</h2>
                <p class="topic-card__desc">{{ topic.description }}</p>
              </div>

              <div class="topic-card__stats">
                @if (topic.isBuiltIn && domainStats()[topic.id]; as s) {
                  <span class="stat"><strong>{{ s.total }}</strong> cards</span>
                  <span class="stat stat--due" [class.stat--zero]="s.due === 0">
                    <strong>{{ s.due }}</strong> due
                  </span>
                  <span class="stat stat--mastered">
                    <strong>{{ s.mastered }}</strong> mastered
                  </span>
                } @else if (!topic.isBuiltIn) {
                  <span class="stat stat--zero">Custom topic</span>
                } @else {
                  <span class="stat stat--zero">No cards yet</span>
                }
              </div>
            </a>

            <!-- Subtopics section -->
            <div class="topic-card__subtopics">
              @for (sub of getSubtopics(topic); track sub.id) {
                <div class="subtopic-chip">
                  <span>{{ sub.label }}</span>
                  <button class="subtopic-chip__del"
                          (click)="deleteSubtopic(topic, sub.id); $event.preventDefault()"
                          matTooltip="Remove subtopic">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
              <button class="subtopic-add-btn" matTooltip="Add subtopic"
                      (click)="openAddSubtopic(topic); $event.preventDefault()">
                <mat-icon>add</mat-icon>
                <span>Subtopic</span>
              </button>
            </div>

          </div>
        }
      </div>
    </div>

    <!-- ── Modal overlay ──────────────────────────────────────────────── -->
    @if (modalMode()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">

          @if (modalMode() === 'add-topic' || modalMode() === 'edit-topic') {
            <h2 class="modal__title">
              {{ modalMode() === 'add-topic' ? 'New Topic' : 'Edit Topic' }}
            </h2>

            <label class="modal__label">Label *
              <input class="modal__input" [(ngModel)]="form.label" placeholder="e.g. System Design" />
            </label>

            <label class="modal__label">Description
              <input class="modal__input" [(ngModel)]="form.description" placeholder="Short description" />
            </label>

            <label class="modal__label">Icon
              <div class="icon-picker">
                @for (icon of icons; track icon) {
                  <button class="icon-option" [class.icon-option--selected]="form.icon === icon"
                          (click)="form.icon = icon" type="button">
                    <mat-icon>{{ icon }}</mat-icon>
                  </button>
                }
              </div>
            </label>

            <label class="modal__label">Accent colour
              <div class="color-picker">
                @for (color of colors; track color) {
                  <button class="color-swatch" [style.background]="color"
                          [class.color-swatch--selected]="form.accentColor === color"
                          (click)="form.accentColor = color" type="button">
                  </button>
                }
              </div>
            </label>

            <div class="modal__preview" [style.--accent]="form.accentColor">
              <div class="modal__preview-icon">
                <mat-icon>{{ form.icon || 'category' }}</mat-icon>
              </div>
              <span>{{ form.label || 'Preview' }}</span>
            </div>

            <div class="modal__actions">
              <button mat-stroked-button (click)="closeModal()">Cancel</button>
              <button mat-flat-button (click)="submitTopicForm()" [disabled]="!form.label.trim()">
                {{ modalMode() === 'add-topic' ? 'Create Topic' : 'Save Changes' }}
              </button>
            </div>
          }

          @if (modalMode() === 'add-subtopic' || modalMode() === 'edit-subtopic') {
            <h2 class="modal__title">
              {{ modalMode() === 'add-subtopic' ? 'Add Subtopic' : 'Edit Subtopic' }}
              @if (activeTopic()) {
                <span class="modal__subtitle">to {{ activeTopic()!.label }}</span>
              }
            </h2>

            <label class="modal__label">Subtopic Label *
              <input class="modal__input" [(ngModel)]="subForm.label" placeholder="e.g. Concurrency" />
            </label>

            <label class="modal__label">Description (optional)
              <input class="modal__input" [(ngModel)]="subForm.description" placeholder="Brief description" />
            </label>

            <div class="modal__actions">
              <button mat-stroked-button (click)="closeModal()">Cancel</button>
              <button mat-flat-button (click)="submitSubtopicForm()" [disabled]="!subForm.label.trim()">
                {{ modalMode() === 'add-subtopic' ? 'Add Subtopic' : 'Save' }}
              </button>
            </div>
          }

        </div>
      </div>
    }
  `,
  styles: [`
    .topic-page {
      &__title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      }
      &__header {
        margin-block-end: var(--space-8);
        h1 { margin-block-end: var(--space-2); }
        p  { color: var(--color-on-surface-variant); font-size: var(--font-size-lg); }
      }
    }

    .add-btn { border-radius: var(--radius-full) !important; align-self: center; }

    .topic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-5);
    }

    .topic-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-5);
      background: var(--color-surface-1);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      border: 2px solid transparent;
      transition:
        box-shadow   var(--duration-normal) var(--easing-standard),
        border-color var(--duration-normal) var(--easing-standard);

      &:hover {
        box-shadow: var(--shadow-3);
        border-color: var(--accent, var(--color-primary));
      }

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      &__icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--accent, var(--color-primary)) 18%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
        mat-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
          color: var(--accent, var(--color-primary));
        }
      }

      &__actions {
        display: flex;
        gap: var(--space-1);
        opacity: 0;
        transition: opacity var(--duration-fast) var(--easing-standard);
      }

      &:hover &__actions { opacity: 1; }

      &__link {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        text-decoration: none;
        color: inherit;
        flex: 1;

        &--disabled { cursor: default; pointer-events: none; }
      }

      &__title { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); }
      &__desc  { font-size: var(--font-size-sm); color: var(--color-on-surface-variant); line-height: var(--line-height-relaxed); }

      &__stats {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        padding-block-start: var(--space-2);
        border-top: 1px solid var(--color-outline-variant);
      }

      &__subtopics {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        padding-block-start: var(--space-2);
        border-top: 1px solid var(--color-outline-variant);
      }
    }

    .action-btn {
      width: 30px !important;
      height: 30px !important;
      line-height: 30px !important;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &--danger mat-icon { color: var(--color-error); }
    }

    .stat {
      font-size: var(--font-size-xs);
      color: var(--color-on-surface-variant);
      strong { font-weight: var(--font-weight-semibold); color: var(--color-on-surface); }
      &--due strong    { color: var(--color-error); }
      &--mastered strong { color: var(--color-rating-good, #4caf50); }
      &--zero          { opacity: 0.5; }
    }

    /* Subtopic chips */
    .subtopic-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px 8px 2px 10px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--accent, var(--color-primary)) 15%, transparent);
      font-size: var(--font-size-xs);
      color: var(--accent, var(--color-primary));
      font-weight: var(--font-weight-medium);

      &__del {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        opacity: 0.6;
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
        &:hover { opacity: 1; }
      }
    }

    .subtopic-add-btn {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      border: 1px dashed var(--color-outline);
      font-size: var(--font-size-xs);
      color: var(--color-on-surface-variant);
      transition: border-color var(--duration-fast), color var(--duration-fast);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { border-color: var(--accent, var(--color-primary)); color: var(--accent, var(--color-primary)); }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
      backdrop-filter: blur(2px);
    }

    .modal {
      background: var(--color-surface-2);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
      box-shadow: var(--shadow-5);
      max-height: 90vh;
      overflow-y: auto;

      &__title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
      }

      &__subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
        font-weight: var(--font-weight-normal);
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

      &__actions {
        display: flex;
        gap: var(--space-3);
        justify-content: flex-end;
        padding-block-start: var(--space-2);
      }

      &__preview {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--accent, var(--color-primary)) 10%, var(--color-surface-1));
        border: 1px solid color-mix(in srgb, var(--accent, var(--color-primary)) 30%, transparent);
        font-weight: var(--font-weight-semibold);
      }

      &__preview-icon {
        width: 36px; height: 36px;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--accent, var(--color-primary)) 20%, transparent);
        display: flex; align-items: center; justify-content: center;
        mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--accent, var(--color-primary)); }
      }
    }

    .icon-picker {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .icon-option {
      all: unset;
      cursor: pointer;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-outline-variant);
      color: var(--color-on-surface-variant);
      transition: border-color var(--duration-fast), background var(--duration-fast), color var(--duration-fast);

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-container); }
      &--selected { background: var(--color-primary); color: var(--color-on-primary); border-color: var(--color-primary); }
    }

    .color-picker {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .color-swatch {
      all: unset;
      cursor: pointer;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid transparent;
      transition: transform var(--duration-fast), border-color var(--duration-fast);
      &:hover { transform: scale(1.15); }
      &--selected { border-color: var(--color-on-surface); transform: scale(1.1); }
    }
  `],
})
export class TopicListComponent {
  private readonly stateService  = inject(FlashcardStateService);
  private readonly topicService  = inject(TopicManagementService);

  readonly topics      = this.topicService.allTopics;
  readonly domainStats = computed(() => this.stateService.statsByDomain());

  // ── Modal state ───────────────────────────────────────────────────────────
  readonly modalMode  = signal<ModalMode>(null);
  readonly activeTopic = signal<ManagedTopic | null>(null);
  readonly activeSubtopicId = signal<string | null>(null);

  readonly icons  = MATERIAL_ICONS;
  readonly colors = ACCENT_COLORS;

  form = { label: '', description: '', icon: 'category', accentColor: ACCENT_COLORS[0] };
  subForm = { label: '', description: '' };

  // ── Topic actions ─────────────────────────────────────────────────────────

  openAddTopic(): void {
    this.form = { label: '', description: '', icon: 'category', accentColor: ACCENT_COLORS[0] };
    this.activeTopic.set(null);
    this.modalMode.set('add-topic');
  }

  openEditTopic(topic: ManagedTopic): void {
    this.form = { label: topic.label, description: topic.description, icon: topic.icon, accentColor: topic.accentColor };
    this.activeTopic.set(topic);
    this.modalMode.set('edit-topic');
  }

  submitTopicForm(): void {
    if (!this.form.label.trim()) return;
    if (this.modalMode() === 'add-topic') {
      this.topicService.addTopic({ label: this.form.label.trim(), description: this.form.description.trim(), icon: this.form.icon, accentColor: this.form.accentColor });
    } else if (this.activeTopic()) {
      this.topicService.updateTopic(this.activeTopic()!.id, { label: this.form.label.trim(), description: this.form.description.trim(), icon: this.form.icon, accentColor: this.form.accentColor });
    }
    this.closeModal();
  }

  deleteTopic(id: string): void {
    if (confirm('Delete this topic? This cannot be undone.')) {
      this.topicService.deleteTopic(id);
    }
  }

  // ── Subtopic actions ──────────────────────────────────────────────────────

  getSubtopics(topic: ManagedTopic): import('../../core/services/topic-management.service').Subtopic[] {
    if (topic.isBuiltIn) return this.topicService.getBuiltInSubtopics(topic.id);
    return topic.subtopics;
  }

  openAddSubtopic(topic: ManagedTopic): void {
    this.subForm = { label: '', description: '' };
    this.activeTopic.set(topic);
    this.activeSubtopicId.set(null);
    this.modalMode.set('add-subtopic');
  }

  submitSubtopicForm(): void {
    if (!this.subForm.label.trim() || !this.activeTopic()) return;
    const topic = this.activeTopic()!;
    if (this.modalMode() === 'add-subtopic') {
      if (topic.isBuiltIn) {
        this.topicService.addBuiltInSubtopic(topic.id, this.subForm.label.trim(), this.subForm.description.trim());
        // Force refresh by re-assigning activeTopic
        this.activeTopic.set({ ...topic });
      } else {
        this.topicService.addSubtopic(topic.id, this.subForm.label.trim(), this.subForm.description.trim() || undefined);
      }
    }
    this.closeModal();
  }

  deleteSubtopic(topic: ManagedTopic, subtopicId: string): void {
    if (topic.isBuiltIn) {
      this.topicService.deleteBuiltInSubtopic(topic.id, subtopicId);
    } else {
      this.topicService.deleteSubtopic(topic.id, subtopicId);
    }
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.activeTopic.set(null);
    this.activeSubtopicId.set(null);
  }
}