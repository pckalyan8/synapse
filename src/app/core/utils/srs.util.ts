// Pure, side-effect-free SM-2 implementation
// Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

import { ConfidenceRating, FlashcardProgress } from '../models/flashcard.model';

const MIN_EASE_FACTOR  = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MS_PER_DAY = 86_400_000;

export function createInitialProgress(cardId: string): FlashcardProgress {
  return {
    cardId,
    repetitions: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    nextReviewAt: new Date().toISOString(),
    lastReviewedAt: null,
    lastRating: null,
  };
}

/**
 * Pure SM-2 step: given current progress + a confidence rating,
 * returns the NEXT progress state.
 */
export function applyRating(
  current: FlashcardProgress,
  rating: ConfidenceRating,
): FlashcardProgress {
  const now = new Date();

  // Cards rated below Good restart the repetition counter
  if (rating < ConfidenceRating.Good) {
    return {
      ...current,
      repetitions: 0,
      intervalDays: 1,
      lastRating: rating,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: addDays(now, 1).toISOString(),
    };
  }

  const nextRepetitions = current.repetitions + 1;
  const nextInterval    = calcNextInterval(current.repetitions, current.intervalDays);
  const nextEF          = calcNextEF(current.easeFactor, rating);

  return {
    ...current,
    repetitions: nextRepetitions,
    easeFactor: nextEF,
    intervalDays: nextInterval,
    lastRating: rating,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: addDays(now, nextInterval).toISOString(),
  };
}

export function isDue(progress: FlashcardProgress): boolean {
  return new Date(progress.nextReviewAt).getTime() <= Date.now();
}

function calcNextInterval(repetitions: number, currentInterval: number): number {
  if (repetitions === 0) return 1;
  if (repetitions === 1) return 6;
  return Math.round(currentInterval * 2.5);
}

function calcNextEF(ef: number, rating: ConfidenceRating): number {
  const next = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  return Math.max(MIN_EASE_FACTOR, next);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}