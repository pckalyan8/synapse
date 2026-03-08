// ─────────────────────────────────────────────────────────────────────────────
// src/app/core/services/flashcard-state.service.ts
// Singleton Signal-based state — no NgRx, no RxJS BehaviorSubject
// ─────────────────────────────────────────────────────────────────────────────

import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import {
  ConfidenceRating,
  DomainId,
  Flashcard,
  FlashcardProgress,
  FlashcardViewModel,
} from '../models/flashcard.model';
import { applyRating, createInitialProgress, isDue } from '../utils/srs.util';
import { PersistenceService } from './persistence.service';

// ─── Internal state shape ─────────────────────────────────────────────────────

interface FlashcardState {
  cards: Record<string, Flashcard>;           // id → card (immutable content)
  progress: Record<string, FlashcardProgress>; // id → SRS metadata
  activeDomainId: DomainId | null;
  activeCardId: string | null;
  isSessionActive: boolean;
}

const INITIAL_STATE: FlashcardState = {
  cards: {},
  progress: {},
  activeDomainId: null,
  activeCardId: null,
  isSessionActive: false,
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FlashcardStateService {
  private readonly persistence = inject(PersistenceService);

  // ── Root writable signal ───────────────────────────────────────────────────
  private readonly state = signal<FlashcardState>(this.loadPersistedState());

  // ── Public read-only computed signals ────────────────────────────────────

  /** All cards as an ordered array. */
  readonly allCards = computed<Flashcard[]>(() =>
    Object.values(this.state().cards),
  );

  /** All progress records. */
  readonly allProgress = computed<FlashcardProgress[]>(() =>
    Object.values(this.state().progress),
  );

  /** Cards due for review today, sorted oldest-due first. */
  readonly dueCards = computed<FlashcardViewModel[]>(() => {
    const { cards, progress, activeDomainId } = this.state();

    return Object.values(cards)
      .filter((card) =>
        activeDomainId ? card.domainId === activeDomainId : true,
      )
      .map<FlashcardViewModel>((card) => {
        const prog = progress[card.id] ?? createInitialProgress(card.id);
        return { card, progress: prog, isDue: isDue(prog) };
      })
      .filter((vm) => vm.isDue)
      .sort(
        (a, b) =>
          new Date(a.progress.nextReviewAt).getTime() -
          new Date(b.progress.nextReviewAt).getTime(),
      );
  });

  /** Currently active card view-model (during a session). */
  readonly activeCard = computed<FlashcardViewModel | null>(() => {
    const { activeCardId, cards, progress } = this.state();
    if (!activeCardId) return null;
    const card = cards[activeCardId];
    if (!card) return null;
    const prog = progress[activeCardId] ?? createInitialProgress(activeCardId);
    return { card, progress: prog, isDue: isDue(prog) };
  });

  /** Aggregate statistics for the dashboard. */
  readonly stats = computed(() => {
    const progressList = this.allProgress();
    const total = this.allCards().length;
    const due = this.dueCards().length;
    const mastered = progressList.filter((p) => p.intervalDays >= 21).length;
    const averageEF =
      progressList.length > 0
        ? progressList.reduce((sum, p) => sum + p.easeFactor, 0) /
          progressList.length
        : 2.5;

    return { total, due, mastered, averageEF: +averageEF.toFixed(2) };
  });

  readonly isSessionActive = computed(() => this.state().isSessionActive);
  readonly activeDomainId = computed(() => this.state().activeDomainId);

  // ── Persistence side-effect ───────────────────────────────────────────────

  constructor() {
    // Automatically sync progress (not immutable card content) to storage.
    effect(() => {
      const { progress } = this.state();
      // Use untracked so we don't accidentally re-run the effect on every read.
      untracked(() => this.persistence.saveProgress(progress));
    });
  }

  // ── Mutations (all return void — callers react via computed signals) ──────

  /** Bulk-load cards for a domain (from a JSON seed file or API). */
  loadCards(cards: Flashcard[]): void {
    this.state.update((s) => {
      const cardMap = cards.reduce<Record<string, Flashcard>>((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {});

      // Initialise progress for any card that doesn't have a record yet.
      const progressMap = { ...s.progress };
      for (const card of cards) {
        if (!progressMap[card.id]) {
          progressMap[card.id] = createInitialProgress(card.id);
        }
      }

      return { ...s, cards: { ...s.cards, ...cardMap }, progress: progressMap };
    });
  }

  setActiveDomain(domainId: DomainId | null): void {
    this.state.update((s) => ({ ...s, activeDomainId: domainId }));
  }

  startSession(): void {
    const firstDue = this.dueCards()[0] ?? null;
    this.state.update((s) => ({
      ...s,
      isSessionActive: true,
      activeCardId: firstDue?.card.id ?? null,
    }));
  }

  endSession(): void {
    this.state.update((s) => ({
      ...s,
      isSessionActive: false,
      activeCardId: null,
    }));
  }

  /** Record a rating and advance to the next due card. */
  rateCard(cardId: string, rating: ConfidenceRating): void {
    this.state.update((s) => {
      const current = s.progress[cardId] ?? createInitialProgress(cardId);
      const updated = applyRating(current, rating);

      const newProgress = { ...s.progress, [cardId]: updated };

      // Find next due card (excluding the just-rated one).
      const nextCard =
        Object.values(s.cards)
          .filter(
            (c) =>
              c.id !== cardId &&
              isDue(newProgress[c.id] ?? createInitialProgress(c.id)),
          )
          .sort((a, b) => {
            const pa = newProgress[a.id] ?? createInitialProgress(a.id);
            const pb = newProgress[b.id] ?? createInitialProgress(b.id);
            return (
              new Date(pa.nextReviewAt).getTime() -
              new Date(pb.nextReviewAt).getTime()
            );
          })[0] ?? null;

      return {
        ...s,
        progress: newProgress,
        activeCardId: nextCard?.id ?? null,
        isSessionActive: nextCard !== null,
      };
    });
  }

  /** Hard-reset progress for a single card (e.g. "start over"). */
  resetCardProgress(cardId: string): void {
    this.state.update((s) => ({
      ...s,
      progress: { ...s.progress, [cardId]: createInitialProgress(cardId) },
    }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private loadPersistedState(): FlashcardState {
    const persistedProgress = this.persistence.loadProgress();
    return { ...INITIAL_STATE, progress: persistedProgress };
  }
}