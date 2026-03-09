import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButton }        from '@angular/material/button';
import { MatIcon }          from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule }  from '@angular/material/core';
import { ConfidenceRating, FlashcardViewModel } from '../../../core/models/flashcard.model';
import { MarkdownRendererComponent } from '../markdown-renderer/markdown-renderer.component';

const RATING_OPTIONS = [
  { rating: ConfidenceRating.Blackout, label: 'Blackout', description: 'Complete blank',         shortcut: '0' },
  { rating: ConfidenceRating.Wrong,    label: 'Wrong',    description: 'Wrong but recognised',   shortcut: '1' },
  { rating: ConfidenceRating.Hard,     label: 'Hard',     description: 'Correct with struggle',  shortcut: '2' },
  { rating: ConfidenceRating.Good,     label: 'Good',     description: 'Correct, hesitation',    shortcut: '3' },
  { rating: ConfidenceRating.Easy,     label: 'Easy',     description: 'Correct, little effort', shortcut: '4' },
  { rating: ConfidenceRating.Perfect,  label: 'Perfect',  description: 'Perfect recall',         shortcut: '5' },
];

@Component({
  selector: 'app-flashcard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, MatTooltipModule, MatRippleModule, MarkdownRendererComponent],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.scss',
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
})
export class FlashcardComponent {
  readonly vm              = input.required<FlashcardViewModel>();
  readonly inSession       = input<boolean>(false);
  readonly sessionProgress = input<{ current: number; total: number } | null>(null);

  readonly rated   = output<{ cardId: string; rating: ConfidenceRating }>();
  readonly flipped = output<boolean>();

  readonly isFlipped     = signal<boolean>(false);
  readonly ratingOptions = RATING_OPTIONS;

  readonly flipAriaLabel = computed(() =>
    this.isFlipped() ? 'Showing answer. Click to return to question.' : 'Showing question. Click to reveal answer.');

  readonly sessionProgressPercent = computed(() => {
    const p = this.sessionProgress();
    return p ? Math.round(((p.current - 1) / p.total) * 100) : 0;
  });

  readonly intervalLabel = computed(() => {
    const d = this.vm().progress.intervalDays;
    if (d === 0) return 'Due now';
    if (d === 1) return 'Next: tomorrow';
    return `Next: in ${d} days`;
  });

  readonly lastRatingLabel = computed(() => {
    const r = this.vm().progress.lastRating;
    return r !== null ? (RATING_OPTIONS.find(o => o.rating === r)?.label ?? '—') : '—';
  });

  constructor() {
    effect(() => {
      void this.vm().card.id;
      untracked(() => this.isFlipped.set(false));
    });
  }

  flip(): void {
    this.isFlipped.update(v => !v);
    this.flipped.emit(this.isFlipped());
  }

  submitRating(rating: ConfidenceRating): void {
    this.rated.emit({ cardId: this.vm().card.id, rating });
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.inSession()) return;
    if (event.key === ' ') { event.preventDefault(); this.flip(); return; }
    if (this.isFlipped()) {
      const num = parseInt(event.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 5) {
        event.preventDefault();
        this.submitRating(num as ConfidenceRating);
      }
    }
  }
}