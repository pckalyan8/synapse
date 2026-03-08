// src/app/features/dashboard/dashboard.component.ts
// Minimal scaffold — prevents the lazy-route 404 error while you build out the UI.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon }   from '@angular/material/icon';

import { FlashcardStateService } from '../../core/services/flashcard-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButton, MatIcon],
  template: `
    <div class="dashboard">
      <header class="dashboard__header">
        <h1>Welcome to Synapse</h1>
        <p class="dashboard__subtitle">Your second brain for long-term knowledge retention.</p>
      </header>

      <div class="dashboard__stats">
        <div class="stat-card">
          <mat-icon>style</mat-icon>
          <span class="stat-card__value">{{ stats().total }}</span>
          <span class="stat-card__label">Total Cards</span>
        </div>
        <div class="stat-card stat-card--accent">
          <mat-icon>schedule</mat-icon>
          <span class="stat-card__value">{{ stats().due }}</span>
          <span class="stat-card__label">Due Today</span>
        </div>
        <div class="stat-card">
          <mat-icon>verified</mat-icon>
          <span class="stat-card__value">{{ stats().mastered }}</span>
          <span class="stat-card__label">Mastered</span>
        </div>
      </div>

      @if (stats().due > 0) {
        <a mat-flat-button routerLink="/review" class="dashboard__cta">
          <mat-icon>play_arrow</mat-icon>
          Start Review ({{ stats().due }} cards)
        </a>
      } @else {
        <p class="dashboard__all-done">
          <mat-icon>celebration</mat-icon> All caught up — no cards due right now!
        </p>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
      padding-block: var(--space-12);

      &__header { text-align: center; }

      &__subtitle {
        margin-block-start: var(--space-2);
        color: var(--color-on-surface-variant);
        font-size: var(--font-size-lg);
      }

      &__stats {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
        justify-content: center;
      }

      &__cta {
        min-width: 220px;
        height: 48px;
        font-size: var(--font-size-md) !important;
        border-radius: var(--radius-full) !important;
      }

      &__all-done {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--color-on-surface-variant);
        font-size: var(--font-size-lg);
      }
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-8);
      background: var(--color-surface-1);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      min-width: 140px;
      transition: box-shadow var(--duration-normal) var(--easing-standard);

      &:hover { box-shadow: var(--shadow-2); }

      &--accent { background: var(--color-primary-container); }

      mat-icon {
        font-size: 28px; width: 28px; height: 28px;
        color: var(--color-primary);
      }

      &__value {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        line-height: 1;
        color: var(--color-on-surface);
      }

      &__label {
        font-size: var(--font-size-sm);
        color: var(--color-on-surface-variant);
      }
    }
  `],
})
export class DashboardComponent {
  private readonly state = inject(FlashcardStateService);
  readonly stats = computed(() => this.state.stats());
}