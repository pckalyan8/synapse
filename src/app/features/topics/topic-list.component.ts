// src/app/features/topics/topic-list.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIcon }   from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TopicManagementService, ManagedTopic } from '../../core/services/topic-management.service';
import { FlashcardStateService }                from '../../core/services/flashcard-state.service';

const ICON_OPTIONS = [
  'coffee','eco','code','psychology','auto_awesome','science','school',
  'terminal','memory','dns','cloud','security','analytics','design_services',
  'calculate','biotech','architecture','data_object','devices','smartphone',
  'hub','bolt','rocket_launch','explore',
];

const COLOR_OPTIONS = [
  '#e76f51','#52b788','#4361ee','#9b5de5','#f72585',
  '#f4a261','#2ec4b6','#e9c46a','#457b9d','#e63946',
  '#06d6a0','#118ab2','#ffd166','#a8dadc','#6d6875',
];

interface TopicFormState {
  open: boolean;
  mode: 'add' | 'edit';
  topicId: string | null;
  label: string;
  description: string;
  icon: string;
  accentColor: string;
}

const BLANK_FORM: TopicFormState = {
  open: false, mode: 'add', topicId: null,
  label: '', description: '', icon: 'folder_special', accentColor: '#4361ee',
};

@Component({
  selector: 'app-topic-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, MatIcon, MatButton, MatIconButton, MatTooltipModule],
  template: `
<div class="topic-page">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="topic-page__header">
    <div>
      <h1>Knowledge Domains</h1>
      <p>Select a topic to explore flashcards and folders.</p>
    </div>
    <button mat-flat-button class="new-topic-btn" (click)="openAddTopic()">
      <mat-icon>add</mat-icon> New Topic
    </button>
  </header>

  <!-- ── Topic grid ──────────────────────────────────────────────────────── -->
  <div class="topic-grid">
    @for (topic of topics(); track topic.id) {
      <div class="topic-card" [style.--accent]="topic.accentColor">
        <!-- Edit / Delete for custom topics -->
        @if (!topic.isBuiltIn) {
          <div class="topic-card__toolbar">
            <button mat-icon-button class="tb-btn" matTooltip="Edit topic"
                    (click)="openEditTopic($event, topic)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button class="tb-btn tb-btn--danger" matTooltip="Delete topic"
                    (click)="deleteTopic($event, topic)">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        }

        <a class="topic-card__content" [routerLink]="['/topics', topic.id]">
          <div class="topic-card__icon-wrap">
            <mat-icon>{{ topic.icon }}</mat-icon>
          </div>
          <div class="topic-card__body">
            <h2 class="topic-card__title">{{ topic.label }}</h2>
            <p class="topic-card__desc">{{ topic.description }}</p>
          </div>
          <div class="topic-card__stats">
            @if (domainStats()[topic.id]; as s) {
              <span class="stat"><strong>{{ s.total }}</strong> cards</span>
              <span class="stat stat--due" [class.stat--zero]="s.due === 0">
                <strong>{{ s.due }}</strong> due
              </span>
              <span class="stat stat--mastered">
                <strong>{{ s.mastered }}</strong> mastered
              </span>
            } @else {
              <span class="stat stat--zero">No cards yet</span>
            }
          </div>
        </a>
      </div>
    }
  </div>

</div>

<!-- ═══════════════════════════════════════════════════════
     NEW / EDIT TOPIC MODAL
     ═══════════════════════════════════════════════════ -->
@if (form().open) {
  <div class="modal-backdrop" (click)="closeForm()">
    <div class="topic-modal" (click)="$event.stopPropagation()">

      <div class="topic-modal__header">
        <h2>{{ form().mode === 'add' ? 'New Topic' : 'Edit Topic' }}</h2>
        <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
      </div>

      <!-- Preview -->
      <div class="topic-modal__preview"
           [style.border-color]="form().accentColor"
           [style.background]="previewBg()">
        <div class="preview-icon" [style.background]="previewIconBg()">
          <mat-icon [style.color]="form().accentColor">{{ form().icon }}</mat-icon>
        </div>
        <div class="preview-text">
          <strong>{{ form().label || 'Topic Name' }}</strong>
          <span>{{ form().description || 'Description goes here' }}</span>
        </div>
      </div>

      <!-- Fields -->
      <label class="topic-modal__field">
        <span>Name *</span>
        <input class="topic-modal__input" type="text"
               placeholder="e.g. TypeScript, Docker, AWS..."
               [(ngModel)]="labelValue" />
      </label>

      <label class="topic-modal__field">
        <span>Description</span>
        <input class="topic-modal__input" type="text"
               placeholder="Short description of what this topic covers"
               [(ngModel)]="descValue" />
      </label>

      <!-- Icon picker -->
      <div class="topic-modal__field">
        <span>Icon</span>
        <div class="icon-grid">
          @for (icon of iconOptions; track icon) {
            <button class="icon-opt" type="button"
                    [class.icon-opt--active]="form().icon === icon"
                    [style.color]="form().icon === icon ? form().accentColor : ''"
                    (click)="setIcon(icon)"
                    [attr.aria-label]="icon">
              <mat-icon>{{ icon }}</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Colour picker -->
      <div class="topic-modal__field">
        <span>Accent colour</span>
        <div class="color-grid">
          @for (c of colorOptions; track c) {
            <button class="color-swatch" type="button"
                    [style.background]="c"
                    [class.color-swatch--active]="form().accentColor === c"
                    (click)="setColor(c)"
                    [attr.aria-label]="c">
            </button>
          }
        </div>
      </div>

      <div class="topic-modal__footer">
        <button mat-stroked-button (click)="closeForm()">Cancel</button>
        <button mat-flat-button (click)="saveTopic()" [disabled]="!labelValue.trim()">
          <mat-icon>{{ form().mode === 'add' ? 'add' : 'save' }}</mat-icon>
          {{ form().mode === 'add' ? 'Create Topic' : 'Save Changes' }}
        </button>
      </div>

    </div>
  </div>
}
  `,
  styles: [`
    .topic-page {
      &__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
        margin-block-end: var(--space-8);

        h1 { margin-block-end: var(--space-2); }
        p  { color: var(--color-on-surface-variant); font-size: var(--font-size-lg); }
      }
    }

    .new-topic-btn {
      border-radius: var(--radius-full) !important;
      white-space: nowrap;
    }

    .topic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
      gap: var(--space-5);
    }

    // ── Topic card ────────────────────────────────────────────────────────────
    .topic-card {
      position: relative;
      background: var(--color-surface-1);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      border: 2px solid transparent;
      transition:
        box-shadow    var(--duration-normal) var(--easing-standard),
        border-color  var(--duration-normal) var(--easing-standard),
        transform     var(--duration-fast)   var(--easing-standard);

      &:hover {
        box-shadow: var(--shadow-3);
        border-color: var(--accent);
        transform: translateY(-2px);
      }

      &__toolbar {
        position: absolute;
        top: var(--space-3);
        right: var(--space-3);
        z-index: 10;
        display: flex;
        gap: var(--space-1);
        opacity: 0;
        transition: opacity var(--duration-fast);
        background: var(--color-surface-2);
        border-radius: var(--radius-md);
        padding: 2px;
        box-shadow: var(--shadow-1);
      }

      &:hover &__toolbar { opacity: 1; }

      &__content {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-6);
        text-decoration: none;
        color: inherit;
        height: 100%;
        box-sizing: border-box;
        border-radius: var(--radius-lg);
      }

      &__icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--accent) 15%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 24px; width: 24px; height: 24px;
          color: var(--accent);
        }
      }

      &__title { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); margin: 0; }
      &__desc  { font-size: var(--font-size-sm); color: var(--color-on-surface-variant); line-height: var(--line-height-relaxed); margin: 0; }

      &__stats {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        padding-block-start: var(--space-2);
        border-top: 1px solid var(--color-outline-variant);
        margin-block-start: auto;
      }
    }

    .tb-btn {
      width: 28px !important; height: 28px !important;
      mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
      &--danger mat-icon { color: var(--color-error); }
    }

    .stat {
      font-size: var(--font-size-xs);
      color: var(--color-on-surface-variant);
      strong { font-weight: var(--font-weight-semibold); color: var(--color-on-surface); }
      &--due strong    { color: var(--color-error); }
      &--mastered strong { color: var(--color-rating-good, #27ae60); }
      &--zero          { opacity: 0.5; }
    }

    // ── Modal ─────────────────────────────────────────────────────────────────
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: var(--space-4);
      backdrop-filter: blur(3px);
    }

    .topic-modal {
      background: var(--color-surface-2);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
      width: 100%; max-width: 520px;
      max-height: 92vh;
      display: flex; flex-direction: column; gap: var(--space-5);
      box-shadow: var(--shadow-5);
      overflow-y: auto;

      &__header {
        display: flex; align-items: center; justify-content: space-between;
        h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); }
      }

      &__preview {
        display: flex; align-items: center; gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        border-radius: var(--radius-lg);
        border: 2px solid;
        transition: border-color var(--duration-fast), background var(--duration-fast);

        strong { font-weight: var(--font-weight-semibold); display: block; }
        span   { font-size: var(--font-size-sm); color: var(--color-on-surface-variant); }
      }

      .preview-icon {
        width: 44px; height: 44px;
        border-radius: var(--radius-md);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }

      .preview-text {
        display: flex; flex-direction: column; gap: 2px;
      }

      &__field {
        display: flex; flex-direction: column; gap: var(--space-2);
        font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
        color: var(--color-on-surface-variant);
      }

      &__input {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        color: var(--color-on-surface);
        font-size: var(--font-size-sm);
        outline: none;
        transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
        }
      }

      &__footer {
        display: flex; justify-content: flex-end; gap: var(--space-3);
        border-top: 1px solid var(--color-outline-variant);
        padding-block-start: var(--space-4);
      }
    }

    .icon-grid {
      display: flex; flex-wrap: wrap; gap: var(--space-2);
    }

    .icon-opt {
      all: unset; cursor: pointer;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      border: 2px solid transparent;
      background: var(--color-surface-1);
      color: var(--color-on-surface-variant);
      transition: all var(--duration-fast);

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover { background: var(--color-surface-2); border-color: var(--color-outline); }
      &--active { border-color: currentColor; background: color-mix(in srgb, currentColor 12%, transparent); }
    }

    .color-grid {
      display: flex; flex-wrap: wrap; gap: var(--space-2);
    }

    .color-swatch {
      all: unset; cursor: pointer;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid transparent;
      outline: 2px solid transparent;
      outline-offset: 2px;
      transition: outline-color var(--duration-fast), transform var(--duration-fast);

      &:hover { transform: scale(1.15); }
      &--active { outline-color: var(--color-on-surface); }
    }
  `],
})
export class TopicListComponent {
  private readonly topicService = inject(TopicManagementService);
  private readonly stateService = inject(FlashcardStateService);

  readonly topics      = computed(() => this.topicService.allTopics());
  readonly domainStats = computed(() => this.stateService.statsByDomain());

  readonly iconOptions  = ICON_OPTIONS;
  readonly colorOptions = COLOR_OPTIONS;

  readonly form = signal<TopicFormState>({ ...BLANK_FORM });

  // Two-way bound values
  labelValue = '';
  descValue  = '';

  // ── Computed preview helpers ──────────────────────────────────────────────
  readonly previewBg     = computed(() =>
    `color-mix(in srgb, ${this.form().accentColor} 8%, var(--color-surface-1))`);
  readonly previewIconBg = computed(() =>
    `color-mix(in srgb, ${this.form().accentColor} 15%, transparent)`);

  // ── Open / close ──────────────────────────────────────────────────────────
  openAddTopic(): void {
    this.labelValue = '';
    this.descValue  = '';
    this.form.set({ ...BLANK_FORM, open: true, mode: 'add' });
  }

  openEditTopic(event: Event, topic: ManagedTopic): void {
    event.preventDefault();
    event.stopPropagation();
    this.labelValue = topic.label;
    this.descValue  = topic.description;
    this.form.set({
      open: true, mode: 'edit', topicId: topic.id,
      label: topic.label, description: topic.description,
      icon: topic.icon, accentColor: topic.accentColor,
    });
  }

  closeForm(): void {
    this.form.update(f => ({ ...f, open: false }));
  }

  setIcon(icon: string): void {
    this.form.update(f => ({ ...f, icon }));
  }

  setColor(c: string): void {
    this.form.update(f => ({ ...f, accentColor: c }));
  }

  saveTopic(): void {
    const f     = this.form();
    const label = this.labelValue.trim();
    if (!label) return;
    const data = {
      label,
      description: this.descValue.trim() || `Cards about ${label}`,
      icon:        f.icon,
      accentColor: f.accentColor,
    };
    if (f.mode === 'add') {
      this.topicService.addTopic(data);
    } else if (f.topicId) {
      this.topicService.updateTopic(f.topicId, data);
    }
    this.closeForm();
  }

  deleteTopic(event: Event, topic: ManagedTopic): void {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete topic "${topic.label}" and all its folders?\n\nCards must be deleted separately.`)) {
      this.topicService.deleteTopic(topic.id);
    }
  }
}
