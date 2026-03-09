// src/app/features/review-session/review-session.component.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon }   from '@angular/material/icon';

import { FlashcardStateService } from '../../core/services/flashcard-state.service';
import { ConfidenceRating }      from '../../core/models/flashcard.model';
import { FlashcardComponent }    from '../../shared/components/flashcard/flashcard.component';
import { EmptyStateComponent }   from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-review-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlashcardComponent, MatButton, MatIcon],
  template: `
    <div class="review-page" [class.review-page--idle]="!sessionStarted() || !activeCard()">

      @if (!sessionStarted()) {
        <!-- ── Pre-session ────────────────────────────────────────────── -->
        <div class="review-page__splash">

          @if (dueCount() === 0) {
            <div class="splash-card splash-card--done">
              <mat-icon class="splash-card__icon splash-card__icon--done">celebration</mat-icon>
              <h1 class="splash-card__heading">All caught up!</h1>
              <p class="splash-card__sub">No cards are due right now. Great work keeping up!</p>
              <button mat-stroked-button class="splash-card__btn" (click)="goToDashboard()">
                <mat-icon>dashboard</mat-icon> Dashboard
              </button>
            </div>

          } @else {
            <div class="splash-card">
              <mat-icon class="splash-card__icon">school</mat-icon>
              <h1 class="splash-card__heading">Ready to Review?</h1>
              <p class="splash-card__sub">You have cards waiting to be reviewed.</p>

              <div class="due-badge-wrap">
                <span class="due-badge">{{ dueCount() }}</span>
                <span class="due-badge-label">card{{ dueCount() !== 1 ? 's' : '' }} due</span>
              </div>

              <button mat-flat-button class="splash-card__btn splash-card__btn--primary"
                      (click)="startSession()">
                <mat-icon>play_arrow</mat-icon> Start Session
              </button>
            </div>
          }
        </div>

      } @else if (activeCard()) {
        <!-- ── Active session ─────────────────────────────────────────── -->
        <div class="review-page__session">
          <app-flashcard
            [vm]="activeCard()!"
            [inSession]="true"
            [sessionProgress]="{ current: currentIndex(), total: sessionTotal() }"
            (rated)="onRated($event)"
            (flipped)="onFlipped($event)" />
        </div>

      } @else {
        <!-- ── Session complete ───────────────────────────────────────── -->
        <div class="review-page__splash">
          <div class="splash-card splash-card--complete">
            <mat-icon class="splash-card__icon splash-card__icon--trophy">emoji_events</mat-icon>
            <h1 class="splash-card__heading">Session Complete!</h1>
            <p class="splash-card__sub">
              You reviewed <strong>{{ sessionTotal() }}</strong>
              card{{ sessionTotal() !== 1 ? 's' : '' }} in this session.
            </p>
            <div class="splash-card__actions">
              <button mat-stroked-button (click)="goToDashboard()">
                <mat-icon>dashboard</mat-icon> Dashboard
              </button>
              <button mat-flat-button (click)="startSession()">
                <mat-icon>replay</mat-icon> Review More
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    // ── Page shell ────────────────────────────────────────────────────────────
    .review-page {
      width: 100%;
      padding: var(--space-6) var(--space-4);

      // Idle state (pre-session or complete) → vertically centre in viewport
      &--idle {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100dvh - 64px);
        padding: var(--space-8) var(--space-4);
      }

      // Active session → top-aligned, let card + rating panel breathe
      &__session {
        width: 100%;
        max-width: 760px;
        margin-inline: auto;
        padding-block-end: var(--space-8);
      }

      &__splash {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    // ── Splash / info cards ───────────────────────────────────────────────────
    .splash-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-5);
      text-align: center;
      background: var(--color-surface-1);
      border-radius: var(--radius-2xl, 24px);
      padding: var(--space-10) var(--space-8);
      box-shadow: var(--shadow-2);
      width: 100%;
      max-width: 460px;
      border: 1px solid var(--color-outline-variant);

      &--done {
        border-color: var(--color-rating-good, #27ae60);
        border-width: 2px;
      }

      &--complete {
        border-color: var(--color-tertiary, #7b1fa2);
        border-width: 2px;
      }

      &__icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        padding: var(--space-4);
        border-radius: 50%;
        background: var(--color-primary-container);
        color: var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;

        &--done   { background: color-mix(in srgb, var(--color-rating-good, #27ae60) 15%, transparent); color: var(--color-rating-good, #27ae60); }
        &--trophy { background: var(--color-tertiary-container); color: var(--color-tertiary); }
      }

      &__heading {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-on-surface);
        line-height: 1.2;
        margin: 0;
      }

      &__sub {
        font-size: var(--font-size-lg);
        color: var(--color-on-surface-variant);
        line-height: var(--line-height-relaxed);
        max-width: 340px;
        margin: 0;
      }

      &__btn {
        min-width: 180px;
        height: 48px;
        font-size: var(--font-size-md) !important;
        border-radius: var(--radius-full) !important;

        &--primary {
          font-size: var(--font-size-lg) !important;
          height: 54px;
          min-width: 210px;
        }
      }

      &__actions {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    // ── Due badge ─────────────────────────────────────────────────────────────
    .due-badge-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .due-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 56px;
      height: 56px;
      padding-inline: var(--space-4);
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 40%, transparent);
    }

    .due-badge-label {
      font-size: var(--font-size-lg);
      color: var(--color-on-surface-variant);
      font-weight: var(--font-weight-medium);
    }

    // ── Responsive ────────────────────────────────────────────────────────────
    @media (max-width: 600px) {
      .splash-card {
        padding: var(--space-8) var(--space-5);
        gap: var(--space-4);

        &__heading { font-size: var(--font-size-2xl); }
        &__sub     { font-size: var(--font-size-md); }
      }

      .due-badge { min-width: 48px; height: 48px; font-size: var(--font-size-xl); }
    }
  `],
})
export class ReviewSessionComponent implements OnDestroy {
  private readonly flashcardState = inject(FlashcardStateService);
  private readonly router         = inject(Router);

  readonly sessionStarted = signal(false);
  readonly sessionTotal   = signal(0);
  readonly currentIndex   = signal(1);
  readonly flippedCards   = signal(0);

  readonly dueCount  = computed(() => this.flashcardState.dueCards().length);
  readonly activeCard = computed(() => this.flashcardState.activeCard());

  startSession(): void {
    this.flashcardState.startSession();
    this.sessionTotal.set(this.flashcardState.dueCards().length);
    this.currentIndex.set(1);
    this.flippedCards.set(0);
    this.sessionStarted.set(true);
  }

  onRated(event: { cardId: string; rating: ConfidenceRating }): void {
    this.flashcardState.rateCard(event.cardId, event.rating);
    this.currentIndex.update(i => i + 1);
  }

  onFlipped(isFlipped: boolean): void {
    if (isFlipped) this.flippedCards.update(n => n + 1);
  }

  goToDashboard(): void {
    this.flashcardState.endSession();
    this.sessionStarted.set(false);
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy(): void {
    this.flashcardState.endSession();
  }
}