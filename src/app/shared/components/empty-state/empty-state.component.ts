import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-state__icon">{{ icon() }}</mat-icon>
      <h3 class="empty-state__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty-state__message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-12) var(--space-8);
      text-align: center;

      &__icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: var(--color-outline);
        opacity: 0.6;
      }

      &__title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-on-surface);
      }

      &__message {
        font-size: var(--font-size-md);
        color: var(--color-on-surface-variant);
        max-width: 360px;
        line-height: var(--line-height-relaxed);
      }
    }
  `],
})
export class EmptyStateComponent {
  readonly icon    = input<string>('inbox');
  readonly title   = input<string>('Nothing here yet');
  readonly message = input<string>('');
}