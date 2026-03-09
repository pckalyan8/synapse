import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="progress-ring"
         [attr.width]="size()"
         [attr.height]="size()"
         [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
         role="img"
         [attr.aria-label]="label() + ': ' + value() + '%'">
      <!-- Track -->
      <circle
        class="progress-ring__track"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        fill="none"
        [attr.stroke-width]="strokeWidth()" />
      <!-- Progress -->
      <circle
        class="progress-ring__fill"
        [attr.cx]="center()"
        [attr.cy]="center()"
        [attr.r]="radius()"
        fill="none"
        [attr.stroke-width]="strokeWidth()"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="dashOffset()"
        stroke-linecap="round"
        [style.transform]="'rotate(-90 ' + center() + ' ' + center() + ')'" />
      <!-- Label -->
      <text
        [attr.x]="center()"
        [attr.y]="center()"
        text-anchor="middle"
        dominant-baseline="central"
        class="progress-ring__text">
        {{ value() }}%
      </text>
    </svg>
  `,
  styles: [`
    .progress-ring {
      &__track { stroke: var(--color-outline-variant); }
      &__fill  {
        stroke: var(--color-primary);
        transition: stroke-dashoffset var(--duration-slow) var(--easing-decelerate);
      }
      &__text {
        font-family: var(--font-family-brand);
        font-size: 0.9em;
        font-weight: var(--font-weight-semibold);
        fill: var(--color-on-surface);
      }
    }
  `],
})
export class ProgressRingComponent {
  readonly value       = input<number>(0);       // 0–100
  readonly size        = input<number>(80);
  readonly strokeWidth = input<number>(7);
  readonly label       = input<string>('Progress');

  readonly center      = computed(() => this.size() / 2);
  readonly radius      = computed(() => (this.size() - this.strokeWidth()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashOffset  = computed(() =>
    this.circumference() * (1 - Math.min(100, Math.max(0, this.value())) / 100));
}