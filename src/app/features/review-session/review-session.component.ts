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

              @if (totalCount() > 0) {
                <div class="divider"></div>
                <p class="splash-card__sub splash-card__sub--muted">
                  Want to keep practising? Review all {{ totalCount() }} cards freely.
                </p>
                <button mat-flat-button class="splash-card__btn splash-card__btn--practice"
                        (click)="startAllSession()">
                  <mat-icon>shuffle</mat-icon> Practice All ({{ totalCount() }})
                </button>
              }

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

              @if (totalCount() > dueCount()) {
                <button mat-stroked-button class="splash-card__btn"
                        (click)="startAllSession()">
                  <mat-icon>shuffle</mat-icon> Practice All ({{ totalCount() }})
                </button>
              }
            </div>
          }
        </div>

      } @else if (activeCard()) {
        <!-- ── Active session ─────────────────────────────────────────── -->
        <div class="review-page__session">
          @if (isPracticeAll()) {
            <div class="session-mode-badge">
              <mat-icon>shuffle</mat-icon> Practice Mode
            </div>
          }
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
              @if (dueCount() > 0) {
                <button mat-flat-button (click)="startSession()">
                  <mat-icon>replay</mat-icon> Review Due ({{ dueCount() }})
                </button>
              }
              @if (totalCount() > 0) {
                <button mat-stroked-button (click)="startAllSession()">
                  <mat-icon>shuffle</mat-icon> Practice All ({{ totalCount() }})
                </button>
              }
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

      &--idle {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100dvh - 64px);
        padding: var(--space-8) var(--space-4);
      }

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

    // ── Practice mode badge ───────────────────────────────────────────────────
    .session-mode-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-tertiary, #7b1fa2);
      background: color-mix(in srgb, var(--color-tertiary, #7b1fa2) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-tertiary, #7b1fa2) 25%, transparent);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      margin-block-end: var(--space-3);
      width: fit-content;
      margin-inline: auto;

      mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
    }

    // ── Splash / info cards ───────────────────────────────────────────────────
    .splash-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
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
        font-size: 56px !important;
        width: 56px !important;
        height: 56px !important;
        color: var(--color-primary);

        &--done   { color: var(--color-rating-good, #27ae60); }
        &--trophy { color: var(--color-tertiary, #7b1fa2); }
      }

      &__heading {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        margin: 0;
        color: var(--color-on-surface);
      }

      &__sub {
        font-size: var(--font-size-base);
        color: var(--color-on-surface-variant);
        margin: 0;
        max-width: 320px;
        line-height: 1.5;

        &--muted { font-size: var(--font-size-sm); }
      }

      &__btn {
        width: 100%;
        border-radius: var(--radius-full) !important;
        padding-block: var(--space-3) !important;
        font-size: var(--font-size-base) !important;

        &--primary {
          background: var(--color-primary) !important;
          color: var(--color-on-primary) !important;
        }

        &--practice {
          background: color-mix(in srgb, var(--color-tertiary, #7b1fa2) 90%, transparent) !important;
          color: white !important;
        }
      }

      &__actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: 100%;

        button { border-radius: var(--radius-full) !important; }
      }
    }

    // ── Divider ───────────────────────────────────────────────────────────────
    .divider {
      width: 100%;
      height: 1px;
      background: var(--color-outline-variant);
      margin-block: var(--space-1);
    }

    // ── Due badge ─────────────────────────────────────────────────────────────
    .due-badge-wrap {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
    }

    .due-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 56px;
      height: 56px;
      padding-inline: var(--space-3);
      border-radius: var(--radius-2xl);
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
  readonly isPracticeAll  = signal(false);

  readonly dueCount   = computed(() => this.flashcardState.dueCards().length);
  readonly totalCount = computed(() => {
    const domainId = this.flashcardState.activeDomainId();
    if (!domainId) return this.flashcardState.allCards().length;
    return (this.flashcardState.cardsByDomain()[domainId] ?? []).length;
  });
  readonly activeCard = computed(() => this.flashcardState.activeCard());

  startSession(): void {
    this.flashcardState.startSession();
    this.sessionTotal.set(this.flashcardState.dueCards().length);
    this.currentIndex.set(1);
    this.flippedCards.set(0);
    this.isPracticeAll.set(false);
    this.sessionStarted.set(true);
  }

  startAllSession(): void {
    const total = this.totalCount();
    if (total === 0) return;
    this.flashcardState.startSessionAll();
    this.sessionTotal.set(total);
    this.currentIndex.set(1);
    this.flippedCards.set(0);
    this.isPracticeAll.set(true);
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