// ─────────────────────────────────────────────────────────────────────────────
// src/app/shared/components/flashcard/flashcard.component.ts
// Standalone Angular 21 component — signals, computed, effect throughout.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';

import { ConfidenceRating, FlashcardViewModel } from '../../../core/models/flashcard.model';
import { MarkdownRendererComponent } from '../markdown-renderer/markdown-renderer.component';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RatingOption {
  rating: ConfidenceRating;
  label: string;
  description: string;
  shortcut: string;
}

const RATING_OPTIONS: RatingOption[] = [
  { rating: ConfidenceRating.Blackout, label: 'Blackout', description: 'Complete blank',           shortcut: '0' },
  { rating: ConfidenceRating.Wrong,    label: 'Wrong',    description: 'Wrong but recognised',     shortcut: '1' },
  { rating: ConfidenceRating.Hard,     label: 'Hard',     description: 'Correct with struggle',    shortcut: '2' },
  { rating: ConfidenceRating.Good,     label: 'Good',     description: 'Correct with hesitation',  shortcut: '3' },
  { rating: ConfidenceRating.Easy,     label: 'Easy',     description: 'Correct, minor effort',    shortcut: '4' },
  { rating: ConfidenceRating.Perfect,  label: 'Perfect',  description: 'Instant perfect recall',   shortcut: '5' },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-flashcard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatRippleModule,
    MarkdownRendererComponent,
  ],
  template: `
    <div class="flashcard-wrapper" [class.flashcard-wrapper--session]="inSession()">

      <!-- ── Progress indicator ───────────────────────────────────────── -->
      @if (inSession() && sessionProgress()) {
        <div class="flashcard-progress" role="progressbar"
             [attr.aria-valuenow]="sessionProgress()!.current"
             [attr.aria-valuemax]="sessionProgress()!.total"
             [attr.aria-label]="'Card ' + sessionProgress()!.current + ' of ' + sessionProgress()!.total">
          <div class="flashcard-progress__bar"
               [style.width.%]="sessionProgressPercent()">
          </div>
          <span class="flashcard-progress__label">
            {{ sessionProgress()!.current }} / {{ sessionProgress()!.total }}
          </span>
        </div>
      }

      <!-- ── Card scene (3D flip container) ──────────────────────────── -->
      <div class="card-scene" role="button" tabindex="0"
           [attr.aria-label]="flipAriaLabel()"
           [attr.aria-expanded]="isFlipped()"
           (click)="flip()"
           (keydown.space)="$event.preventDefault(); flip()"
           (keydown.enter)="flip()"
           matRipple [matRippleUnbounded]="false"
           [matRippleColor]="'rgba(var(--color-primary-rgb, 16,83,208), 0.08)'">

        <div class="card-stage" [class.card-stage--flipped]="isFlipped()">

          <!-- FRONT face -->
          <div class="card-face card-face--front" aria-hidden="{{ isFlipped() }}">
            <div class="card-face__chip">Question</div>
            <div class="card-face__domain">{{ vm().card.domainId | uppercase }}</div>

            <div class="card-face__content">
              <app-markdown-renderer
                [content]="vm().card.front"
                [compact]="false" />
            </div>

            <div class="card-face__hint">
              <mat-icon>touch_app</mat-icon>
              <span>Tap to reveal answer</span>
            </div>
          </div>

          <!-- BACK face -->
          <div class="card-face card-face--back" aria-hidden="{{ !isFlipped() }}">
            <div class="card-face__chip card-face__chip--answer">Answer</div>

            <div class="card-face__content">
              <app-markdown-renderer
                [content]="vm().card.back"
                [compact]="true" />
            </div>

            @if (vm().card.tags.length) {
              <div class="card-face__tags" aria-label="Tags">
                @for (tag of vm().card.tags; track tag) {
                  <span class="tag">{{ tag }}</span>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── Next-review info ─────────────────────────────────────────── -->
      <div class="card-meta">
        <span class="card-meta__interval">
          <mat-icon>schedule</mat-icon>
          {{ intervalLabel() }}
        </span>
        @if (vm().progress.lastRating !== null) {
          <span class="card-meta__last-rating"
                [attr.data-rating]="vm().progress.lastRating">
            Last: {{ lastRatingLabel() }}
          </span>
        }
      </div>

      <!-- ── Rating buttons (shown only after flip) ───────────────────── -->
      @if (isFlipped()) {
        <div class="rating-panel" role="group" aria-label="How well did you recall this?">
          <p class="rating-panel__prompt">How well did you recall this?</p>
          <div class="rating-panel__buttons">
            @for (opt of ratingOptions; track opt.rating) {
              <button mat-flat-button
                      class="rating-btn"
                      [attr.data-rating]="opt.rating"
                      [matTooltip]="opt.description + ' (' + opt.shortcut + ')'"
                      (click)="submitRating(opt.rating); $event.stopPropagation()">
                {{ opt.label }}
              </button>
            }
          </div>
        </div>
      }

    </div>
  `,
  styleUrl: './flashcard.component.scss',
  host: {
    // Keyboard shortcuts: 0-5 to rate when card is flipped, Space to flip
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class FlashcardComponent implements OnInit {

  // ── Signal Inputs ────────────────────────────────────────────────────────
  readonly vm          = input.required<FlashcardViewModel>();
  readonly inSession   = input<boolean>(false);
  readonly sessionProgress = input<{ current: number; total: number } | null>(null);

  // ── Signal Outputs ───────────────────────────────────────────────────────
  readonly rated  = output<{ cardId: string; rating: ConfidenceRating }>();
  readonly flipped = output<boolean>();

  // ── Internal state signals ───────────────────────────────────────────────
  readonly isFlipped = signal<boolean>(false);

  // ── Derived / computed ───────────────────────────────────────────────────
  readonly ratingOptions = RATING_OPTIONS;

  readonly flipAriaLabel = computed(() =>
    this.isFlipped()
      ? 'Card showing answer. Click to return to question.'
      : 'Card showing question. Click to reveal answer.',
  );

  readonly sessionProgressPercent = computed(() => {
    const p = this.sessionProgress();
    if (!p) return 0;
    return Math.round(((p.current - 1) / p.total) * 100);
  });

  readonly intervalLabel = computed(() => {
    const days = this.vm().progress.intervalDays;
    if (days === 0) return 'Due now';
    if (days === 1) return 'Next: tomorrow';
    return `Next: in ${days} days`;
  });

  readonly lastRatingLabel = computed(() => {
    const r = this.vm().progress.lastRating;
    return r !== null ? (RATING_OPTIONS.find((o) => o.rating === r)?.label ?? '—') : '—';
  });

  // ── Effect: reset flip state when the card changes ───────────────────────
  constructor() {
    effect(() => {
      // Track vm() so the effect re-runs on card change.
      const cardId = this.vm().card.id;
      // Flip back to front without tracking isFlipped (avoid circular deps).
      untracked(() => {
        if (this.isFlipped()) this.isFlipped.set(false);
      });
    });
  }

  ngOnInit(): void {}

  // ── Public methods ───────────────────────────────────────────────────────

  flip(): void {
    this.isFlipped.update((v) => !v);
    this.flipped.emit(this.isFlipped());
  }

  submitRating(rating: ConfidenceRating): void {
    this.rated.emit({ cardId: this.vm().card.id, rating });
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    // Only handle shortcuts when this component is active in a session
    if (!this.inSession()) return;

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.flip();
      return;
    }

    if (this.isFlipped()) {
      const num = parseInt(event.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 5) {
        event.preventDefault();
        this.submitRating(num as ConfidenceRating);
      }
    }
  }
}