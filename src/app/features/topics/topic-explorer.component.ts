// src/app/features/topics/topic-explorer.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient }                 from '@angular/common/http';
import { FormsModule }                from '@angular/forms';
import { MatIcon }                    from '@angular/material/icon';
import { MatButton, MatIconButton }   from '@angular/material/button';
import { MatTooltipModule }           from '@angular/material/tooltip';
import { MatProgressSpinner }         from '@angular/material/progress-spinner';

import { FlashcardStateService }   from '../../core/services/flashcard-state.service';
import { TopicManagementService }  from '../../core/services/topic-management.service';
import { FolderService }           from '../../core/services/folder.service';
import { Flashcard }               from '../../core/models/flashcard.model';
import { Folder }                  from '../../core/models/folder.model';


// ── Editor state types ────────────────────────────────────────────────────────

interface CardEditor {
  open: boolean; mode: 'add' | 'edit';
  cardId: string | null;
  front: string; back: string; tags: string;
  activePanel: 'front' | 'back';
}

interface FolderEditor {
  open: boolean; mode: 'add' | 'edit';
  folderId: string | null; label: string;
}

const BLANK_CARD: CardEditor = {
  open: false, mode: 'add', cardId: null,
  front: '', back: '', tags: '', activePanel: 'front',
};

const BLANK_FOLDER: FolderEditor = {
  open: false, mode: 'add', folderId: null, label: '',
};

@Component({
  selector: 'app-topic-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule,
    MatIcon, MatButton, MatIconButton, MatTooltipModule, MatProgressSpinner,

  ],
  template: `
<div class="explorer">

  <!-- ── Breadcrumb ──────────────────────────────────────────────────────── -->
  <nav class="explorer__breadcrumb" aria-label="Navigation path">
    <a class="breadcrumb__link" routerLink="/topics">
      <mat-icon>grid_view</mat-icon> Topics
    </a>
    <mat-icon class="breadcrumb__sep">chevron_right</mat-icon>

    <button class="breadcrumb__link"
            [class.breadcrumb__link--active]="!currentFolderId()"
            (click)="navigateTo(null)">
      {{ topicLabel() }}
    </button>

    @for (crumb of breadcrumb(); track crumb.id) {
      <mat-icon class="breadcrumb__sep">chevron_right</mat-icon>
      <button class="breadcrumb__link"
              [class.breadcrumb__link--active]="crumb.id === currentFolderId()"
              (click)="navigateTo(crumb.id)">
        {{ crumb.label }}
      </button>
    }
  </nav>

  <!-- ── Page header ─────────────────────────────────────────────────────── -->
  <header class="explorer__header">
    <div class="explorer__header-left">
      <div class="explorer__icon-wrap" [style.background]="topicAccentBg()">
        <mat-icon [style.color]="topicAccent()">{{ topicIcon() }}</mat-icon>
      </div>
      <div>
        <h1 class="explorer__title">{{ currentFolderLabel() }}</h1>
        @if (breadcrumb().length > 0) {
          <p class="explorer__subtitle">{{ pathString() }}</p>
        }
      </div>
    </div>

    <div class="explorer__header-actions">
      @if (!isLoading()) {
        <button mat-stroked-button class="action-btn" (click)="openAddFolder()">
          <mat-icon>create_new_folder</mat-icon> New Folder
        </button>
        <button mat-flat-button class="action-btn action-btn--primary" (click)="openAddCard()">
          <mat-icon>add_card</mat-icon> Add Card
        </button>
      }
    </div>
  </header>

  <!-- ── Stats strip ─────────────────────────────────────────────────────── -->
  @if (!isLoading() && domainStats().total > 0) {
    <div class="explorer__stats-strip">
      <div class="stat-chip">
        <mat-icon>style</mat-icon>
        <span><strong>{{ domainStats().total }}</strong> total cards</span>
      </div>
      <div class="stat-chip stat-chip--due" [class.stat-chip--zero]="domainStats().due === 0">
        <mat-icon>schedule</mat-icon>
        <span><strong>{{ domainStats().due }}</strong> due today</span>
      </div>
      <div class="stat-chip stat-chip--mastered">
        <mat-icon>verified</mat-icon>
        <span><strong>{{ domainStats().mastered }}</strong> mastered</span>
      </div>
      @if (domainStats().due > 0) {
        <a mat-flat-button routerLink="/review" class="review-btn">
          <mat-icon>play_arrow</mat-icon> Review Now
        </a>
      }
    </div>
  }

  <!-- ── Loading ─────────────────────────────────────────────────────────── -->
  @if (isLoading()) {
    <div class="explorer__loading">
      <mat-progress-spinner mode="indeterminate" diameter="40" />
    </div>
  } @else {

    <!-- ── Subfolders ────────────────────────────────────────────────────── -->
    @if (subfolders().length > 0) {
      <section class="explorer__section">
        <h2 class="explorer__section-title">
          <mat-icon>folder_open</mat-icon> Folders
        </h2>
        <div class="folder-grid">
          @for (folder of subfolders(); track folder.id) {
            <div class="folder-card" (click)="navigateTo(folder.id)" role="button" tabindex="0"
                 (keydown.enter)="navigateTo(folder.id)">
              <div class="folder-card__left">
                <mat-icon class="folder-card__icon">folder</mat-icon>
                <div class="folder-card__info">
                  <span class="folder-card__label">{{ folder.label }}</span>
                  <span class="folder-card__meta">
                    {{ folderCardCount(folder.id) }} card{{ folderCardCount(folder.id) !== 1 ? 's' : '' }}
                    · {{ folderSubfolderCount(folder.id) }} folder{{ folderSubfolderCount(folder.id) !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
              <div class="folder-card__actions" (click)="$event.stopPropagation()">
                <button mat-icon-button class="icon-btn" matTooltip="Rename folder"
                        (click)="openEditFolder(folder)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button class="icon-btn icon-btn--danger" matTooltip="Delete folder"
                        (click)="deleteFolderAction(folder)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      </section>
    }

    <!-- ── Cards at current level ────────────────────────────────────────── -->
    @if (currentLevelCards().length > 0) {
      <section class="explorer__section">
        <h2 class="explorer__section-title">
          <mat-icon>style</mat-icon>
          Cards
          <span class="section-count">{{ currentLevelCards().length }}</span>
        </h2>
        <div class="card-grid">
          @for (vm of currentLevelCards(); track vm.card.id) {
            <div class="card-item" [class.card-item--due]="vm.isDue">
              <div class="card-item__front"
                   [innerHTML]="renderMd(vm.card.front, 120)"></div>
              <div class="card-item__back"
                   [innerHTML]="renderMd(vm.card.back, 80)"></div>
              <div class="card-item__footer">
                <div class="card-item__tags">
                  @for (tag of vm.card.tags; track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                  @if (vm.isDue) {
                    <span class="tag tag--due">Due</span>
                  }
                  @if (!vm.card.isCustom) {
                    <span class="tag tag--seed">Seed</span>
                  }
                </div>
                @if (vm.card.isCustom) {
                  <div class="card-item__actions">
                    <button mat-icon-button class="icon-btn" matTooltip="Edit card"
                            (click)="openEditCard(vm.card)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="icon-btn icon-btn--danger" matTooltip="Delete card"
                            (click)="deleteCardAction(vm.card.id)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </section>
    }

    <!-- ── Empty state ───────────────────────────────────────────────────── -->
    @if (subfolders().length === 0 && currentLevelCards().length === 0) {
      <div class="explorer__empty">
        <mat-icon>inbox</mat-icon>
        <p>Nothing here yet.</p>
        <p class="explorer__empty-sub">
          Add a <strong>Folder</strong> to organise cards into sub-topics,
          or add a <strong>Card</strong> directly at this level.
        </p>
        <div class="explorer__empty-actions">
          <button mat-stroked-button (click)="openAddFolder()">
            <mat-icon>create_new_folder</mat-icon> New Folder
          </button>
          <button mat-flat-button (click)="openAddCard()">
            <mat-icon>add_card</mat-icon> Add Card
          </button>
        </div>
      </div>
    }
  }
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════
     CARD EDITOR MODAL
     ═══════════════════════════════════════════════════════════════════════ -->
@if (cardEditor().open) {
  <div class="modal-backdrop" (click)="closeCardEditor()">
    <div class="modal" role="dialog" aria-modal="true"
         (click)="$event.stopPropagation()">

      <div class="modal__header">
        <div class="modal__title-group">
          <mat-icon class="modal__icon">{{ cardEditor().mode === 'add' ? 'add_card' : 'edit' }}</mat-icon>
          <div>
            <h2>{{ cardEditor().mode === 'add' ? 'New Flashcard' : 'Edit Flashcard' }}</h2>
            <p class="modal__subtitle">{{ pathString() || topicLabel() }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="closeCardEditor()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Side-by-side editor panels -->
      <div class="modal__panels">

        <!-- Front panel -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__label">
              <mat-icon>help_outline</mat-icon> Front (Question)
            </span>
            <div class="panel__tab-strip">
              <button [class.active]="cardEditor().activePanel === 'front'"
                      (click)="setActivePanel('front')" type="button">Write</button>
              <button [class.active]="false"
                      (click)="setActivePanel('back')" type="button">Preview</button>
            </div>
          </div>
          <textarea class="panel__textarea"
                    placeholder="## What is X?&#10;&#10;Describe the concept or question..."
                    [(ngModel)]="frontValue"
                    rows="9">
          </textarea>
          @if (frontValue.trim()) {
            <div class="panel__preview" [innerHTML]="renderMd(frontValue, 500)"></div>
          }
        </div>

        <!-- Back panel -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__label">
              <mat-icon>lightbulb_outline</mat-icon> Back (Answer)
            </span>
          </div>
          <textarea class="panel__textarea"
                    placeholder="**Short summary** &#10;&#10;- Key point 1&#10;- Key point 2&#10;&#10;> Pro tip or example"
                    [(ngModel)]="backValue"
                    rows="9">
          </textarea>
          @if (backValue.trim()) {
            <div class="panel__preview" [innerHTML]="renderMd(backValue, 500)"></div>
          }
        </div>
      </div>

      <!-- Tags row -->
      <label class="modal__field">
        <span class="modal__field-label">
          Tags <span class="modal__field-hint">(comma-separated, optional)</span>
        </span>
        <input class="modal__input" type="text"
               placeholder="e.g. concurrency, threads, jvm"
               [(ngModel)]="tagsValue" />
      </label>

      <!-- Footer -->
      <div class="modal__footer">
        <span class="modal__validation" [class.valid]="frontValue.trim() && backValue.trim()">
          @if (frontValue.trim() && backValue.trim()) {
            <mat-icon>check_circle</mat-icon> Ready to save
          } @else {
            <mat-icon>info</mat-icon> Front and back are required
          }
        </span>
        <div class="modal__actions">
          <button mat-stroked-button (click)="closeCardEditor()">Cancel</button>
          <button mat-flat-button (click)="saveCard()"
                  [disabled]="!frontValue.trim() || !backValue.trim()">
            <mat-icon>{{ cardEditor().mode === 'add' ? 'add_card' : 'save' }}</mat-icon>
            {{ cardEditor().mode === 'add' ? 'Create Card' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
}

<!-- ═══════════════════════════════════════════════════════════════════════════
     FOLDER EDITOR MODAL
     ═══════════════════════════════════════════════════════════════════════ -->
@if (folderEditor().open) {
  <div class="modal-backdrop" (click)="closeFolderEditor()">
    <div class="modal modal--sm" role="dialog" aria-modal="true"
         (click)="$event.stopPropagation()">

      <div class="modal__header">
        <div class="modal__title-group">
          <mat-icon class="modal__icon">
            {{ folderEditor().mode === 'add' ? 'create_new_folder' : 'drive_file_rename_outline' }}
          </mat-icon>
          <div>
            <h2>{{ folderEditor().mode === 'add' ? 'New Folder' : 'Rename Folder' }}</h2>
            <p class="modal__subtitle">{{ pathString() || topicLabel() }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="closeFolderEditor()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <label class="modal__field" style="padding: 0 var(--space-6) var(--space-2)">
        <span class="modal__field-label">Folder name</span>
        <input class="modal__input" type="text"
               placeholder="e.g. Spring JPA, Design Patterns, Week 3..."
               [(ngModel)]="folderLabelValue"
               (keydown.enter)="saveFolder()" />
      </label>

      <div class="modal__footer">
        <span></span>
        <div class="modal__actions">
          <button mat-stroked-button (click)="closeFolderEditor()">Cancel</button>
          <button mat-flat-button (click)="saveFolder()"
                  [disabled]="!folderLabelValue.trim()">
            <mat-icon>{{ folderEditor().mode === 'add' ? 'create_new_folder' : 'save' }}</mat-icon>
            {{ folderEditor().mode === 'add' ? 'Create Folder' : 'Rename' }}
          </button>
        </div>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    // ── Page layout ──────────────────────────────────────────────────────────
    .explorer {
      max-width: 1000px;
      margin-inline: auto;
      padding-block-end: var(--space-16);
    }

    // ── Breadcrumb ───────────────────────────────────────────────────────────
    .explorer__breadcrumb {
      display: flex;
      align-items: center;
      gap: 0;
      flex-wrap: wrap;
      margin-block-end: var(--space-5);
      font-size: var(--font-size-sm);
    }

    .breadcrumb__link {
      all: unset;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-on-surface-variant);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-sm);
      transition: color var(--duration-fast), background var(--duration-fast);
      text-decoration: none;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &:hover:not(.breadcrumb__link--active) {
        color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, transparent);
      }

      &--active {
        color: var(--color-on-surface);
        font-weight: var(--font-weight-semibold);
        cursor: default;
      }
    }

    .breadcrumb__sep {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: var(--color-outline-variant);
      flex-shrink: 0;
    }

    // ── Header ───────────────────────────────────────────────────────────────
    .explorer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
      margin-block-end: var(--space-5);
      padding-block-end: var(--space-5);
      border-bottom: 1px solid var(--color-outline-variant);

      &-left {
        display: flex;
        align-items: center;
        gap: var(--space-4);
      }

      &-actions {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
      }
    }

    .explorer__icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    .explorer__title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      margin: 0;
      line-height: 1.25;
    }

    .explorer__subtitle {
      font-size: var(--font-size-sm);
      color: var(--color-on-surface-variant);
      margin: var(--space-1) 0 0;
    }

    .action-btn {
      border-radius: var(--radius-full) !important;
      white-space: nowrap;

      &--primary { }
    }

    // ── Stats strip ──────────────────────────────────────────────────────────
    .explorer__stats-strip {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
      padding: var(--space-3) var(--space-5);
      background: var(--color-surface-1);
      border-radius: var(--radius-lg);
      margin-block-end: var(--space-6);
      border: 1px solid var(--color-outline-variant);
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--color-on-surface-variant);
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      strong { color: var(--color-on-surface); font-weight: var(--font-weight-semibold); }

      &--due strong  { color: var(--color-error); }
      &--mastered mat-icon { color: var(--color-rating-good, #27ae60); }
      &--zero { opacity: 0.5; }
    }

    .review-btn {
      margin-left: auto;
      border-radius: var(--radius-full) !important;
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    .explorer__loading {
      display: flex;
      justify-content: center;
      padding: var(--space-16);
    }

    // ── Section headers ──────────────────────────────────────────────────────
    .explorer__section {
      margin-block-end: var(--space-8);
    }

    .explorer__section-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-on-surface-variant);
      margin-block-end: var(--space-4);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .section-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding-inline: var(--space-1);
      border-radius: var(--radius-full);
      background: var(--color-surface-2);
      border: 1px solid var(--color-outline-variant);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      color: var(--color-on-surface);
    }

    // ── Folder grid ──────────────────────────────────────────────────────────
    .folder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-3);
    }

    .folder-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      background: var(--color-surface-1);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition:
        box-shadow   var(--duration-fast)   var(--easing-standard),
        border-color var(--duration-fast)   var(--easing-standard),
        background   var(--duration-fast)   var(--easing-standard);

      &:hover {
        box-shadow:   var(--shadow-2);
        border-color: var(--color-primary);
        background:   color-mix(in srgb, var(--color-primary) 4%, var(--color-surface-1));
      }

      &__left {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
      }

      &__icon {
        font-size: 24px !important;
        width: 24px !important;
        height: 24px !important;
        color: var(--color-primary);
        flex-shrink: 0;
      }

      &__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

      &__label {
        font-weight: var(--font-weight-semibold);
        font-size: var(--font-size-sm);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      &__meta {
        font-size: var(--font-size-xs);
        color: var(--color-on-surface-variant);
      }

      &__actions {
        display: flex;
        gap: var(--space-1);
        opacity: 0;
        transition: opacity var(--duration-fast);
      }

      &:hover &__actions { opacity: 1; }
    }

    // ── Card grid ────────────────────────────────────────────────────────────
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }

    .card-item {
      display: flex;
      flex-direction: column;
      background: var(--color-surface-1);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition:
        box-shadow var(--duration-fast) var(--easing-standard),
        border-color var(--duration-fast) var(--easing-standard);

      &:hover { box-shadow: var(--shadow-2); }

      &--due { border-left: 3px solid var(--color-error); }

      &__front {
        padding: var(--space-4) var(--space-4) var(--space-2);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        line-height: 1.5;
        border-bottom: 1px solid var(--color-outline-variant);
        min-height: 72px;

        // prevent very long words from breaking layout
        overflow-wrap: break-word;
        word-break: break-word;

        h1, h2, h3 {
          font-size: var(--font-size-sm) !important;
          font-weight: var(--font-weight-bold) !important;
          margin: 0 0 var(--space-1) !important;
        }
      }

      &__back {
        padding: var(--space-3) var(--space-4);
        font-size: var(--font-size-xs);
        color: var(--color-on-surface-variant);
        line-height: 1.5;
        flex: 1;
        overflow-wrap: break-word;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      &__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-4) var(--space-3);
        gap: var(--space-2);
        border-top: 1px solid var(--color-outline-variant);
        flex-wrap: wrap;
      }

      &__tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        flex: 1;
        min-width: 0;
      }

      &__actions {
        display: flex;
        gap: var(--space-1);
        flex-shrink: 0;
      }
    }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 1px var(--space-2);
      border-radius: var(--radius-full);
      background: var(--color-surface-2);
      color: var(--color-on-surface-variant);
      font-size: var(--font-size-xs);
      border: 1px solid var(--color-outline-variant);
      white-space: nowrap;

      &--due {
        background: color-mix(in srgb, var(--color-error) 12%, transparent);
        color: var(--color-error);
        border-color: color-mix(in srgb, var(--color-error) 30%, transparent);
        font-weight: var(--font-weight-semibold);
      }

      &--seed {
        background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        color: var(--color-primary);
        border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
        font-style: italic;
        font-size: 10px;
      }
    }

    // ── Icon buttons ─────────────────────────────────────────────────────────
    .icon-btn {
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }

      &--danger mat-icon { color: var(--color-error); }
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    .explorer__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-20) var(--space-8);
      text-align: center;

      mat-icon {
        font-size: 64px; width: 64px; height: 64px;
        color: var(--color-outline-variant);
      }

      p { font-size: var(--font-size-lg); color: var(--color-on-surface-variant); margin: 0; }

      &-sub {
        font-size: var(--font-size-sm) !important;
        max-width: 360px;
      }

      &-actions {
        display: flex;
        gap: var(--space-3);
        margin-block-start: var(--space-4);
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    // ── Modal backdrop ───────────────────────────────────────────────────────
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    // ── Modal ────────────────────────────────────────────────────────────────
    .modal {
      background: var(--color-surface-2);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 960px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      box-shadow: var(--shadow-5);
      overflow-y: auto;
      padding-block-end: var(--space-6);

      &--sm { max-width: 480px; }

      &__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-5) var(--space-6) 0;
        flex-shrink: 0;
      }

      &__title-group {
        display: flex;
        align-items: center;
        gap: var(--space-3);

        h2 {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          margin: 0;
        }
      }

      &__icon {
        font-size: 28px !important;
        width: 28px !important;
        height: 28px !important;
        color: var(--color-primary);
      }

      &__subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
        margin: var(--space-1) 0 0;
      }

      &__panels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-4);
        padding: 0 var(--space-6);

        @media (max-width: 680px) { grid-template-columns: 1fr; }
      }

      &__field {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: 0 var(--space-6);
      }

      &__field-label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-on-surface-variant);
      }

      &__field-hint {
        font-weight: var(--font-weight-normal);
        opacity: 0.7;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
        padding: var(--space-2) var(--space-6) 0;
        border-top: 1px solid var(--color-outline-variant);
        flex-shrink: 0;
      }

      &__validation {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
        mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; }

        &.valid {
          color: var(--color-rating-good, #27ae60);
          mat-icon { color: var(--color-rating-good, #27ae60); }
        }
      }

      &__actions {
        display: flex;
        gap: var(--space-3);
      }
    }

    // ── Editor panels ────────────────────────────────────────────────────────
    .panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);

      &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
      }

      &__label {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-on-surface-variant);
        mat-icon { font-size: 15px !important; width: 15px !important; height: 15px !important; }
      }

      &__tab-strip {
        display: flex;
        background: var(--color-surface-1);
        border-radius: var(--radius-sm);
        padding: 2px;
        border: 1px solid var(--color-outline-variant);

        button {
          all: unset;
          cursor: pointer;
          padding: 2px var(--space-3);
          border-radius: calc(var(--radius-sm) - 1px);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
          color: var(--color-on-surface-variant);
          white-space: nowrap;
          transition: background var(--duration-fast), color var(--duration-fast);

          &.active {
            background: var(--color-primary);
            color: var(--color-on-primary);
          }
        }
      }

      &__textarea {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-outline);
        background: var(--color-surface-1);
        color: var(--color-on-surface);
        font-size: var(--font-size-sm);
        font-family: 'Menlo', 'Consolas', 'Courier New', monospace;
        outline: none;
        resize: vertical;
        min-height: 180px;
        width: 100%;
        box-sizing: border-box;
        transition: border-color var(--duration-fast), box-shadow var(--duration-fast);

        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
        }
      }

      &__preview {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px dashed var(--color-outline-variant);
        background: color-mix(in srgb, var(--color-primary) 3%, var(--color-surface-1));
        font-size: var(--font-size-sm);
        line-height: 1.7;
        max-height: 200px;
        overflow-y: auto;
        color: var(--color-on-surface);
        word-break: break-word;

        h1, h2, h3 { margin: 0.2em 0 0.3em; }
        h1 { font-size: 1.15em; }
        h2 { font-size: 1.05em; }
        h3 { font-size: 1em; }
      }
    }
  `],
})
export class TopicExplorerComponent implements OnInit {
  private readonly route         = inject(ActivatedRoute);
  private readonly http          = inject(HttpClient);
  private readonly state         = inject(FlashcardStateService);
  private readonly topicService  = inject(TopicManagementService);
  private readonly folderService = inject(FolderService);

  // ── Route params ──────────────────────────────────────────────────────────
  readonly topicId = signal<string>('');

  // ── Navigation state ──────────────────────────────────────────────────────
  readonly currentFolderId = signal<string | null>(null);

  // ── Loading ───────────────────────────────────────────────────────────────
  readonly isLoading = signal(true);

  // ── Editor signals ────────────────────────────────────────────────────────
  readonly cardEditor   = signal<CardEditor>({ ...BLANK_CARD });
  readonly folderEditor = signal<FolderEditor>({ ...BLANK_FOLDER });

  // Two-way bound model values (for ngModel compatibility)
  frontValue = '';
  backValue  = '';
  tagsValue  = '';
  folderLabelValue = '';

  // ── Computed: topic metadata ──────────────────────────────────────────────
  readonly topicMeta = computed(() =>
    this.topicService.findTopic(this.topicId()));

  readonly topicLabel = computed(() =>
    this.topicMeta()?.label ?? this.topicId());

  readonly topicIcon = computed(() =>
    this.topicMeta()?.icon ?? 'folder_special');

  readonly topicAccent = computed(() =>
    this.topicMeta()?.accentColor ?? 'var(--color-primary)');

  readonly topicAccentBg = computed(() => {
    const c = this.topicAccent();
    return `color-mix(in srgb, ${c} 15%, transparent)`;
  });

  // ── Computed: navigation ──────────────────────────────────────────────────
  readonly breadcrumb = computed(() => {
    const fid = this.currentFolderId();
    if (!fid) return [];
    return this.folderService.getBreadcrumb(fid);
  });

  readonly currentFolderLabel = computed(() => {
    const fid = this.currentFolderId();
    if (!fid) return this.topicLabel();
    return this.folderService.getFolder(fid)?.label ?? '';
  });

  readonly pathString = computed(() => {
    const crumbs = this.breadcrumb();
    if (crumbs.length === 0) return '';
    return [this.topicLabel(), ...crumbs.map(c => c.label)].join(' › ');
  });

  // ── Computed: content at current level ───────────────────────────────────
  readonly subfolders = computed(() =>
    this.folderService.getChildren(this.topicId(), this.currentFolderId()));

  readonly currentLevelCards = computed(() => {
    const domain   = this.topicId();
    const folderId = this.currentFolderId();
    return (this.state.cardsByDomain()[domain] ?? []).filter(vm =>
      (vm.card.folderId ?? null) === folderId
    );
  });

  // ── Computed: stats for whole domain ─────────────────────────────────────
  readonly domainStats = computed(() =>
    this.state.statsByDomain()[this.topicId()] ?? { total: 0, due: 0, mastered: 0 });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('topicId') ?? '';
    this.topicId.set(id);
    this.state.setActiveDomain(id);
    this.loadBuiltInCards(id);
  }

  private loadBuiltInCards(topicId: string): void {
    this.isLoading.set(true);
    this.http.get<Flashcard[]>(`/assets/data/flashcards/${topicId}.json`).subscribe({
      next:  cards => { this.state.loadCards(cards); this.isLoading.set(false); },
      error: ()    => { this.isLoading.set(false); }, // custom topics have no JSON — fine
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  navigateTo(folderId: string | null): void {
    this.currentFolderId.set(folderId);
  }

  // ── Folder CRUD ───────────────────────────────────────────────────────────
  openAddFolder(): void {
    this.folderLabelValue = '';
    this.folderEditor.set({ open: true, mode: 'add', folderId: null, label: '' });
  }

  openEditFolder(folder: Folder): void {
    this.folderLabelValue = folder.label;
    this.folderEditor.set({ open: true, mode: 'edit', folderId: folder.id, label: folder.label });
  }

  closeFolderEditor(): void {
    this.folderEditor.update(e => ({ ...e, open: false }));
  }

  saveFolder(): void {
    const e = this.folderEditor();
    const label = this.folderLabelValue.trim();
    if (!label) return;

    if (e.mode === 'add') {
      this.folderService.addFolder(this.topicId(), this.currentFolderId(), label);
    } else if (e.folderId) {
      this.folderService.updateFolder(e.folderId, label);
    }
    this.closeFolderEditor();
  }

  deleteFolderAction(folder: Folder): void {
    const childCount   = this.folderService.getDescendantIds(folder.id).length;
    const cardsInside  = (this.state.cardsByDomain()[this.topicId()] ?? [])
      .filter(vm => vm.card.isCustom &&
        (vm.card.folderId === folder.id ||
         this.folderService.getDescendantIds(folder.id).includes(vm.card.folderId ?? '')));
    const msg = `Delete folder "${folder.label}"?`
      + (childCount > 0 ? `\n• ${childCount} sub-folder(s)` : '')
      + (cardsInside.length > 0 ? `\n• ${cardsInside.length} custom card(s) inside` : '')
      + '\n\nThis cannot be undone.';

    if (!confirm(msg)) return;
    const deletedIds = this.folderService.deleteFolder(folder.id);
    this.state.deleteCardsInFolders(deletedIds);
    if (deletedIds.includes(this.currentFolderId() ?? '')) {
      this.currentFolderId.set(null);
    }
  }

  // ── Card CRUD ─────────────────────────────────────────────────────────────
  openAddCard(): void {
    this.frontValue = '';
    this.backValue  = '';
    this.tagsValue  = '';
    this.cardEditor.set({ ...BLANK_CARD, open: true, mode: 'add' });
  }

  openEditCard(card: Flashcard): void {
    this.frontValue = card.front;
    this.backValue  = card.back;
    this.tagsValue  = card.tags.join(', ');
    this.cardEditor.set({
      open: true, mode: 'edit', cardId: card.id,
      front: card.front, back: card.back, tags: card.tags.join(', '),
      activePanel: 'front',
    });
  }

  closeCardEditor(): void {
    this.cardEditor.update(e => ({ ...e, open: false }));
  }

  setActivePanel(panel: 'front' | 'back'): void {
    this.cardEditor.update(e => ({ ...e, activePanel: panel }));
  }

  saveCard(): void {
    const front = this.frontValue.trim();
    const back  = this.backValue.trim();
    if (!front || !back) return;
    const tags     = this.tagsValue.split(',').map(t => t.trim()).filter(Boolean);
    const folderId = this.currentFolderId() ?? undefined;
    const e        = this.cardEditor();

    if (e.mode === 'add') {
      this.state.addCard(this.topicId(), front, back, tags, folderId);
    } else if (e.cardId) {
      this.state.updateCard(e.cardId, front, back, tags, folderId);
    }
    this.closeCardEditor();
  }

  deleteCardAction(cardId: string): void {
    if (confirm('Delete this flashcard? This cannot be undone.')) {
      this.state.deleteCard(cardId);
    }
  }

  isCustomCard(cardId: string): boolean {
    return this.state.isCustomCard(cardId);
  }

  // ── Stats helpers ─────────────────────────────────────────────────────────
  folderCardCount(folderId: string): number {
    const allFolderIds = [folderId, ...this.folderService.getDescendantIds(folderId)];
    return (this.state.cardsByDomain()[this.topicId()] ?? [])
      .filter(vm => vm.card.folderId && allFolderIds.includes(vm.card.folderId))
      .length;
  }

  folderSubfolderCount(folderId: string): number {
    return this.folderService.getChildren(this.topicId(), folderId).length;
  }

  // ── Markdown renderer ─────────────────────────────────────────────────────
  renderMd(md: string, maxLen = 200): string {
    if (!md?.trim()) return '';
    let text = md.trim();
    if (text.length > maxLen) text = text.slice(0, maxLen) + '…';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
      .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--color-surface-2);padding:1px 4px;border-radius:3px;font-size:0.88em">$1</code>')
      .replace(/^- (.+)$/gm,  '<li style="margin-left:1.1em">$1</li>')
      .replace(/\n\n+/g, '</p><p style="margin-top:0.5em">')
      .replace(/\n/g, '<br>');
  }
}
