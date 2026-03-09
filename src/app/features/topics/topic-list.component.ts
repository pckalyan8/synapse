import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon }    from '@angular/material/icon';
import { MatButton }  from '@angular/material/button';

import { TOPICS }                from '../../core/models/topic.model';
import { FlashcardStateService } from '../../core/services/flashcard-state.service';

@Component({
  selector: 'app-topic-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIcon],
  template: `
    <div class="topic-page">
      <header class="topic-page__header">
        <h1>Knowledge Domains</h1>
        <p>Select a domain to study its flashcards and notes.</p>
      </header>

      <div class="topic-grid">
        @for (topic of topics; track topic.id) {
          <a class="topic-card" [routerLink]="[topic.id]"
             [style.--accent]="'var(' + topic.accentToken + ')'">
            <div class="topic-card__icon-wrap">
              <mat-icon>{{ topic.icon }}</mat-icon>
            </div>
            <div class="topic-card__body">
              <h2 class="topic-card__title">{{ topic.label }}</h2>
              <p class="topic-card__desc">{{ topic.description }}</p>
            </div>
            <div class="topic-card__stats">
              @if (domainStats()[topic.id]; as s) {
                <span class="stat">
                  <strong>{{ s.total }}</strong> cards
                </span>
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
        }
      </div>
    </div>
  `,
  styles: [`
    .topic-page {
      &__header {
        margin-block-end: var(--space-8);
        h1 { margin-block-end: var(--space-2); }
        p  { color: var(--color-on-surface-variant); font-size: var(--font-size-lg); }
      }
    }

    .topic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-5);
    }

    .topic-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-6);
      background: var(--color-surface-1);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      text-decoration: none;
      color: inherit;
      border: 2px solid transparent;
      transition:
        box-shadow    var(--duration-normal) var(--easing-standard),
        border-color  var(--duration-normal) var(--easing-standard),
        transform     var(--duration-fast)   var(--easing-standard);

      &:hover {
        box-shadow: var(--shadow-3);
        border-color: var(--accent, var(--color-primary));
        transform: translateY(-2px);
      }

      &__icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--accent, var(--color-primary)) 15%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: var(--accent, var(--color-primary));
        }
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
    }

    .stat {
      font-size: var(--font-size-xs);
      color: var(--color-on-surface-variant);

      strong { font-weight: var(--font-weight-semibold); color: var(--color-on-surface); }

      &--due strong    { color: var(--color-error); }
      &--mastered strong { color: var(--color-rating-good); }
      &--zero          { opacity: 0.5; }
    }
  `],
})
export class TopicListComponent {
  private readonly state = inject(FlashcardStateService);
  readonly topics      = TOPICS;
  readonly domainStats = computed(() => this.state.statsByDomain());
}