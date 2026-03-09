// src/app/core/services/persistence.service.ts
import { Injectable } from '@angular/core';
import { Flashcard, FlashcardProgress } from '../models/flashcard.model';

const PROGRESS_KEY     = 'syn_progress_v1';
const THEME_KEY        = 'syn_theme_v1';
const CUSTOM_CARDS_KEY = 'syn_custom_cards_v1';

@Injectable({ providedIn: 'root' })
export class PersistenceService {

  // ── Progress ──────────────────────────────────────────────────────────────

  saveProgress(progress: Record<string, FlashcardProgress>): void {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      console.warn('[PersistenceService] Could not persist progress.');
    }
  }

  loadProgress(): Record<string, FlashcardProgress> {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, FlashcardProgress>) : {};
    } catch {
      return {};
    }
  }

  // ── Custom cards ──────────────────────────────────────────────────────────

  saveCustomCards(cards: Flashcard[]): void {
    try {
      localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
    } catch {
      console.warn('[PersistenceService] Could not persist custom cards.');
    }
  }

  loadCustomCards(): Flashcard[] {
    try {
      const raw = localStorage.getItem(CUSTOM_CARDS_KEY);
      return raw ? (JSON.parse(raw) as Flashcard[]) : [];
    } catch {
      return [];
    }
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  saveTheme(isDark: boolean): void {
    localStorage.setItem(THEME_KEY, JSON.stringify(isDark));
  }

  loadTheme(): boolean {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw !== null) return JSON.parse(raw) as boolean;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }
}