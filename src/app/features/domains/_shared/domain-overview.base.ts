// Shared base logic extracted as a class — domain components extend this.
import {
  computed,
  effect,
  inject,
  signal,
  OnInit,
  Directive,
  Component,
} from '@angular/core';
import { HttpClient }            from '@angular/common/http';
import { DomainId, Flashcard }   from '../../../core/models/flashcard.model';
import { FlashcardStateService } from '../../../core/services/flashcard-state.service';
import { ProgressRingComponent } from '@shared/components/progress-ring/progress-ring.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { FlashcardComponent } from '@shared/components/flashcard/flashcard.component';

@Component({
    styleUrl: './domain-overview.template.scss',
    templateUrl: '../_shared/domain-overview.template.html',
    imports: [
        ProgressRingComponent, EmptyStateComponent, MatProgressSpinner,
        MatIcon, FlashcardComponent
    ]
})
export abstract class DomainOverviewBase implements OnInit {
  protected abstract readonly domainId: DomainId;
  protected abstract readonly domainLabel: string;

  protected readonly http  = inject(HttpClient);
  protected readonly state = inject(FlashcardStateService);

  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  readonly domainCards = computed(() =>
    this.state.cardsByDomain()[this.domainId] ?? []);

  readonly domainStats = computed(() =>
    this.state.statsByDomain()[this.domainId] ?? { total: 0, due: 0, mastered: 0 });

  ngOnInit(): void {
    this.state.setActiveDomain(this.domainId);
    this.loadCards();
  }

  private loadCards(): void {
    this.isLoading.set(true);
    this.http
      .get<Flashcard[]>(`/assets/data/flashcards/${this.domainId}.json`)
      .subscribe({
        next: cards => {
          this.state.loadCards(cards);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set(`Could not load ${this.domainLabel} flashcards.`);
          this.isLoading.set(false);
        },
      });
  }

  startReview(): void { this.state.startSession(); }
}