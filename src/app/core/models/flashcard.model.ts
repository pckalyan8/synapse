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
  | 'system-design';

export interface Flashcard {
  readonly id: string;
  readonly domainId: DomainId;
  readonly front: string;        // Markdown
  readonly back: string;         // Markdown
  readonly tags: readonly string[];
  readonly createdAt: string;    // ISO-8601
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