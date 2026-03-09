import { ConfidenceRating, DomainId } from './flashcard.model';

export interface ReviewSession {
  readonly id: string;
  readonly startedAt: string;
  readonly domainId: DomainId | null;
  endedAt: string | null;
  totalCards: number;
  ratedCards: RatedCard[];
}

export interface RatedCard {
  readonly cardId: string;
  readonly rating: ConfidenceRating;
  readonly ratedAt: string;
  readonly timeSpentMs: number;
}