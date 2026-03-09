// src/app/core/models/flashcard.model.ts
export enum ConfidenceRating {
  Blackout = 0,
  Wrong    = 1,
  Hard     = 2,
  Good     = 3,
  Easy     = 4,
  Perfect  = 5,
}

export type DomainId =
  | 'java'
  | 'spring-boot'
  | 'python'
  | 'machine-learning'
  | 'generative-ai'
  | 'algorithms'
  | 'system-design'
  | (string & {}); // allow any custom domain id while keeping autocomplete for built-ins

export interface Flashcard {
  readonly id: string;
  readonly domainId: string;   // string so custom topics work freely
  readonly subtopicId?: string; // optional subtopic grouping
  readonly front: string;        // Markdown
  readonly back: string;         // Markdown
  readonly tags: readonly string[];
  readonly createdAt: string;    // ISO-8601
  readonly isCustom?: boolean;   // true for user-created cards
}

export interface FlashcardProgress {
  readonly cardId: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  lastRating: ConfidenceRating | null;
}

export interface FlashcardViewModel {
  card: Flashcard;
  progress: FlashcardProgress;
  isDue: boolean;
}
