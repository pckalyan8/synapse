// src/app/core/services/flashcard-state.service.ts
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
  Flashcard,
  FlashcardProgress,
  FlashcardViewModel,
} from '../models/flashcard.model';
import { applyRating, createInitialProgress, isDue } from '../utils/srs.util';
import { PersistenceService } from './persistence.service';
import { FolderService }      from './folder.service';

interface FlashcardState {
  cards:           Record<string, Flashcard>;
  customCardIds:   string[];
  progress:        Record<string, FlashcardProgress>;
  activeDomainId:  string | null;
  activeCardId:    string | null;
  isSessionActive: boolean;
}

const INITIAL_STATE: FlashcardState = {
  cards: {}, customCardIds: [], progress: {},
  activeDomainId: null, activeCardId: null, isSessionActive: false,
};

@Injectable({ providedIn: 'root' })
export class FlashcardStateService {
  private readonly persistence   = inject(PersistenceService);
  private readonly folderService = inject(FolderService);
  private readonly state         = signal<FlashcardState>(this.loadPersistedState());

  // ── Public computed signals ───────────────────────────────────────────────

  readonly allCards = computed<Flashcard[]>(() => Object.values(this.state().cards));

  readonly allProgress = computed<FlashcardProgress[]>(() => Object.values(this.state().progress));

  readonly customCards = computed<Flashcard[]>(() => {
    const { cards, customCardIds } = this.state();
    return customCardIds.map(id => cards[id]).filter(Boolean);
  });

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
      ? progressList.reduce((s, p) => s + p.easeFactor, 0) / progressList.length : 2.5;
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
    effect(() => {
      const custom = this.customCards();
      untracked(() => this.persistence.saveCustomCards(custom));
    });
  }

  // ── Seed cards from JSON asset ────────────────────────────────────────────

  loadCards(cards: Flashcard[]): void {
    this.state.update(s => {
      const cardMap    = cards.reduce<Record<string, Flashcard>>((acc, c) => { acc[c.id] = c; return acc; }, {});
      const progressMap = { ...s.progress };
      for (const card of cards) {
        if (!progressMap[card.id]) progressMap[card.id] = createInitialProgress(card.id);
      }
      return { ...s, cards: { ...s.cards, ...cardMap }, progress: progressMap };
    });
  }

  // ── Custom card CRUD ──────────────────────────────────────────────────────

  addCard(
    domainId: string,
    front: string,
    back: string,
    tags: string[],
    folderId?: string,
  ): Flashcard {
    const card: Flashcard = {
      id: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      domainId,
      folderId: folderId || undefined,
      front:  front.trim(),
      back:   back.trim(),
      tags,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };
    this.state.update(s => ({
      ...s,
      cards:         { ...s.cards, [card.id]: card },
      customCardIds: [...s.customCardIds, card.id],
      progress:      { ...s.progress, [card.id]: createInitialProgress(card.id) },
    }));
    return card;
  }

  updateCard(
    cardId: string,
    front: string,
    back: string,
    tags: string[],
    folderId?: string,
  ): void {
    this.state.update(s => {
      const existing = s.cards[cardId];
      if (!existing) return s;
      const updated: Flashcard = {
        ...existing,
        front: front.trim(),
        back:  back.trim(),
        tags,
        folderId: folderId || undefined,
      };
      return { ...s, cards: { ...s.cards, [cardId]: updated } };
    });
  }

  deleteCard(cardId: string): void {
    this.state.update(s => {
      const { [cardId]: _c, ...remainingCards }    = s.cards;
      const { [cardId]: _p, ...remainingProgress } = s.progress;
      return {
        ...s,
        cards:         remainingCards,
        progress:      remainingProgress,
        customCardIds: s.customCardIds.filter(id => id !== cardId),
        activeCardId:  s.activeCardId === cardId ? null : s.activeCardId,
      };
    });
  }

  /** Delete all custom cards that belong to any of the given folder IDs. */
  deleteCardsInFolders(folderIds: string[]): void {
    const toDelete = this.customCards()
      .filter(c => c.folderId && folderIds.includes(c.folderId))
      .map(c => c.id);
    for (const id of toDelete) this.deleteCard(id);
  }

  isCustomCard(cardId: string): boolean {
    return this.state().customCardIds.includes(cardId);
  }

  // ── Domain / session ──────────────────────────────────────────────────────

  setActiveDomain(domainId: string | null): void {
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
      const current     = s.progress[cardId] ?? createInitialProgress(cardId);
      const updated     = applyRating(current, rating);
      const newProgress = { ...s.progress, [cardId]: updated };
      const nextCard    = Object.values(s.cards)
        .filter(c => c.id !== cardId && isDue(newProgress[c.id] ?? createInitialProgress(c.id)))
        .sort((a, b) => {
          const pa = newProgress[a.id] ?? createInitialProgress(a.id);
          const pb = newProgress[b.id] ?? createInitialProgress(b.id);
          return new Date(pa.nextReviewAt).getTime() - new Date(pb.nextReviewAt).getTime();
        })[0] ?? null;
      return {
        ...s, progress: newProgress,
        activeCardId:   nextCard?.id ?? null,
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
    const progress    = this.persistence.loadProgress();
    const customCards = this.persistence.loadCustomCards();
    const cardMap: Record<string, Flashcard> = {};
    const customCardIds: string[] = [];
    for (const card of customCards) {
      cardMap[card.id] = card;
      customCardIds.push(card.id);
      if (!progress[card.id]) progress[card.id] = createInitialProgress(card.id);
    }
    return { ...INITIAL_STATE, cards: cardMap, customCardIds, progress };
  }
}
