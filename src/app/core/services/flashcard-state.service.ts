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

interface FlashcardState {
  cards:           Record<string, Flashcard>;
  progress:        Record<string, FlashcardProgress>;
  activeDomainId:  DomainId | null;
  activeCardId:    string | null;
  isSessionActive: boolean;
}

const INITIAL_STATE: FlashcardState = {
  cards: {}, progress: {},
  activeDomainId: null, activeCardId: null, isSessionActive: false,
};

@Injectable({ providedIn: 'root' })
export class FlashcardStateService {
  private readonly persistence = inject(PersistenceService);
  private readonly state = signal<FlashcardState>(this.loadPersistedState());

  // ── Public computed signals ───────────────────────────────────────────────

  readonly allCards = computed<Flashcard[]>(() =>
    Object.values(this.state().cards));

  readonly allProgress = computed<FlashcardProgress[]>(() =>
    Object.values(this.state().progress));

  readonly dueCards = computed<FlashcardViewModel[]>(() => {
    const { cards, progress, activeDomainId } = this.state();
    return Object.values(cards)
      .filter(c => activeDomainId ? c.domainId === activeDomainId : true)
      .map<FlashcardViewModel>(card => {
        const prog = progress[card.id] ?? createInitialProgress(card.id);
        return { card, progress: prog, isDue: isDue(prog) };
      })
      .filter(vm => vm.isDue)
      .sort((a, b) =>
        new Date(a.progress.nextReviewAt).getTime() -
        new Date(b.progress.nextReviewAt).getTime());
  });

  readonly cardsByDomain = computed<Record<string, FlashcardViewModel[]>>(() => {
    const { cards, progress } = this.state();
    const result: Record<string, FlashcardViewModel[]> = {};
    for (const card of Object.values(cards)) {
      const prog = progress[card.id] ?? createInitialProgress(card.id);
      const vm: FlashcardViewModel = { card, progress: prog, isDue: isDue(prog) };
      if (!result[card.domainId]) result[card.domainId] = [];
      result[card.domainId].push(vm);
    }
    return result;
  });

  readonly activeCard = computed<FlashcardViewModel | null>(() => {
    const { activeCardId, cards, progress } = this.state();
    if (!activeCardId) return null;
    const card = cards[activeCardId];
    if (!card) return null;
    const prog = progress[activeCardId] ?? createInitialProgress(activeCardId);
    return { card, progress: prog, isDue: isDue(prog) };
  });

  readonly stats = computed(() => {
    const progressList = this.allProgress();
    const total    = this.allCards().length;
    const due      = this.dueCards().length;
    const mastered = progressList.filter(p => p.intervalDays >= 21).length;
    const avgEF    = progressList.length > 0
      ? progressList.reduce((s, p) => s + p.easeFactor, 0) / progressList.length
      : 2.5;
    return { total, due, mastered, averageEF: +avgEF.toFixed(2) };
  });

  readonly statsByDomain = computed(() => {
    const { cards, progress } = this.state();
    const result: Record<string, { total: number; due: number; mastered: number }> = {};
    for (const card of Object.values(cards)) {
      if (!result[card.domainId]) result[card.domainId] = { total: 0, due: 0, mastered: 0 };
      result[card.domainId].total++;
      const prog = progress[card.id] ?? createInitialProgress(card.id);
      if (isDue(prog)) result[card.domainId].due++;
      if (prog.intervalDays >= 21) result[card.domainId].mastered++;
    }
    return result;
  });

  readonly isSessionActive = computed(() => this.state().isSessionActive);
  readonly activeDomainId  = computed(() => this.state().activeDomainId);

  constructor() {
    effect(() => {
      const { progress } = this.state();
      untracked(() => this.persistence.saveProgress(progress));
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  loadCards(cards: Flashcard[]): void {
    this.state.update(s => {
      const cardMap = cards.reduce<Record<string, Flashcard>>((acc, c) => {
        acc[c.id] = c; return acc;
      }, {});
      const progressMap = { ...s.progress };
      for (const card of cards) {
        if (!progressMap[card.id]) progressMap[card.id] = createInitialProgress(card.id);
      }
      return { ...s, cards: { ...s.cards, ...cardMap }, progress: progressMap };
    });
  }

  setActiveDomain(domainId: DomainId | null): void {
    this.state.update(s => ({ ...s, activeDomainId: domainId }));
  }

  startSession(): void {
    const firstDue = this.dueCards()[0] ?? null;
    this.state.update(s => ({
      ...s, isSessionActive: true,
      activeCardId: firstDue?.card.id ?? null,
    }));
  }

  endSession(): void {
    this.state.update(s => ({ ...s, isSessionActive: false, activeCardId: null }));
  }

  rateCard(cardId: string, rating: ConfidenceRating): void {
    this.state.update(s => {
      const current    = s.progress[cardId] ?? createInitialProgress(cardId);
      const updated    = applyRating(current, rating);
      const newProgress = { ...s.progress, [cardId]: updated };

      const nextCard = Object.values(s.cards)
        .filter(c => c.id !== cardId &&
          isDue(newProgress[c.id] ?? createInitialProgress(c.id)))
        .sort((a, b) => {
          const pa = newProgress[a.id] ?? createInitialProgress(a.id);
          const pb = newProgress[b.id] ?? createInitialProgress(b.id);
          return new Date(pa.nextReviewAt).getTime() - new Date(pb.nextReviewAt).getTime();
        })[0] ?? null;

      return {
        ...s, progress: newProgress,
        activeCardId: nextCard?.id ?? null,
        isSessionActive: nextCard !== null,
      };
    });
  }

  resetCardProgress(cardId: string): void {
    this.state.update(s => ({
      ...s, progress: { ...s.progress, [cardId]: createInitialProgress(cardId) },
    }));
  }

  private loadPersistedState(): FlashcardState {
    return { ...INITIAL_STATE, progress: this.persistence.loadProgress() };
  }
}