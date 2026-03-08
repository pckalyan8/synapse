/** Confidence level the user self-reports after reviewing a card (SM-2 scale). */
export enum ConfidenceRating {
  Blackout = 0,   // Complete blank
  Wrong    = 1,   // Wrong but recognised when shown
  Hard     = 2,   // Correct but significant struggle
  Good     = 3,   // Correct with some hesitation
  Easy     = 4,   // Correct with little effort
  Perfect  = 5,   // Perfect recall
}

export type DomainId =
  | 'java' | 'spring-boot' | 'python'
  | 'machine-learning' | 'generative-ai'
  | 'algorithms' | 'system-design';

export interface Flashcard {
  readonly id: string;
  readonly domainId: DomainId;
  readonly front: string;       // Markdown string
  readonly back: string;        // Markdown string
  readonly tags: readonly string[];
  readonly createdAt: string;   // ISO-8601
}

/** Mutable SRS metadata — separated from immutable card content. */
export interface FlashcardProgress {
  readonly cardId: string;
  repetitions: number;          // SM-2: n
  easeFactor: number;           // SM-2: EF (2.5 default)
  intervalDays: number;         // SM-2: I(n)
  nextReviewAt: string;         // ISO-8601
  lastReviewedAt: string | null;
  lastRating: ConfidenceRating | null;
}

/** Composite view-model used in templates. */
export interface FlashcardViewModel {
  card: Flashcard;
  progress: FlashcardProgress;
  isDue: boolean;
}