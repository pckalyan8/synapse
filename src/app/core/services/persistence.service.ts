import { Injectable } from '@angular/core';
import { FlashcardProgress } from '../models/flashcard.model';

const PROGRESS_KEY = 'syn_progress_v1';
const THEME_KEY    = 'syn_theme_v1';

@Injectable({ providedIn: 'root' })
export class PersistenceService {

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