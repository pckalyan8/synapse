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
import { MatIcon }                  from '@angular/material/icon';

import { FlashcardStateService } from '../../core/services/flashcard-state.service';
import { ConfidenceRating }       from '../../core/models/flashcard.model';
import { FlashcardComponent }     from '../../shared/components/flashcard/flashcard.component';
import { EmptyStateComponent }    from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-review-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlashcardComponent, EmptyStateComponent, MatButton, MatIcon],
  template: `
    <div class="review-page">

      @if (!sessionStarted()) {
        <!-- ── Pre-session ───────────────────────────────────────────────── -->
        <div class="review-page__start">
          <h1 class="review-page__heading">Ready to Review?</h1>

          @if (dueCount() === 0) {
            <app-empty-state
              icon="celebration"
              title="All caught up!"
              message="No cards are due right now. Come back later or add more cards." />
          } @else {
            <div class="review-page__due-summary">
              <span class="due-badge">{{ dueCount() }}</span>
              <p>card{{ dueCount() !== 1 ? 's' : '' }} due for review</p>
            </div>
            <button mat-flat-button class="review-page__cta" (click)="startSession()">
              <mat-icon>play_arrow</mat-icon> Start Session
            </button>
          }
        </div>

      } @else if (activeCard()) {
        <!-- ── Active session ───────────────────────────────────────────── -->
        <app-flashcard
          [vm]="activeCard()!"
          [inSession]="true"
          [sessionProgress]="{ current: currentIndex(), total: sessionTotal() }"
          (rated)="onRated($event)"
          (flipped)="onFlipped($event)" />

      } @else {
        <!-- ── Session complete ──────────────────────────────────────────── -->
        <div class="review-page__complete">
          <mat-icon class="review-page__trophy">emoji_events</mat-icon>
          <h2>Session Complete!</h2>
          <p>You reviewed <strong>{{ sessionTotal() }}</strong> card{{ sessionTotal() !== 1 ? 's' : '' }}.</p>
          <div class="review-page__complete-actions">
            <button mat-stroked-button (click)="goToDashboard()">
              <mat-icon>dashboard</mat-icon> Dashboard
            </button>
            <button mat-flat-button (click)="startSession()">
              <mat-icon>replay</mat-icon> Review More
            </button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .review-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 128px);
      padding: var(--space-8) var(--space-4);

      &__start, &__complete {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-6);
        text-align: center;
        max-width: 480px;
      }

      &__heading {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
      }

      &__due-summary {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-size: var(--font-size-lg);
        color: var(--color-on-surface-variant);
      }

      &__cta {
        min-width: 200px;
        height: 48px;
        font-size: var(--font-size-md) !important;
        border-radius: var(--radius-full) !important;
      }

      &__trophy {
        font-size: 72px;
        width: 72px;
        height: 72px;
        color: var(--color-tertiary);
      }

      &__complete-actions {
        display: flex;
        gap: var(--space-4);
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    .due-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      height: 48px;
      padding-inline: var(--space-3);
      border-radius: var(--radius-full);
      background: var(--color-primary-container);
      color: var(--color-on-primary-container);
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
    }
  `],
})
export class ReviewSessionComponent implements OnDestroy {
  private readonly state  = inject(FlashcardStateService);
  private readonly router = inject(Router);

  readonly dueCount       = computed(() => this.state.dueCards().length);
  readonly activeCard     = computed(() => this.state.activeCard());
  readonly sessionStarted = computed(() => this.state.isSessionActive());

  private _sessionTotal  = signal(0);
  private _currentIndex  = signal(0);

  readonly sessionTotal  = computed(() => this._sessionTotal());
  readonly currentIndex  = computed(() => this._currentIndex());

  ngOnDestroy(): void { this.state.endSession(); }

  startSession(): void {
    this._sessionTotal.set(this.dueCount());
    this._currentIndex.set(1);
    this.state.startSession();
  }

  onRated(event: { cardId: string; rating: ConfidenceRating }): void {
    this._currentIndex.update(i => i + 1);
    this.state.rateCard(event.cardId, event.rating);
  }

  onFlipped(_: boolean): void { /* hook for future analytics */ }

  goToDashboard(): void { this.router.navigate(['/dashboard']); }
}