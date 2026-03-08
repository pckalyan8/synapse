// src/app/app.ts
// Angular CLI 21 names the root component "App" (not "AppComponent").
// This replaces the default scaffold with the full shell.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbar }                   from '@angular/material/toolbar';
import { MatButton, MatAnchor,
         MatIconButton }                from '@angular/material/button';
import { MatIcon }                      from '@angular/material/icon';
import { MatBadgeModule }               from '@angular/material/badge';    // directive → Module
import { MatTooltipModule }             from '@angular/material/tooltip';  // directive → Module

import { ThemeService }          from './core/services/theme.service';
import { FlashcardStateService } from './core/services/flashcard-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    // Angular Material — components as classes, directives as Modules
    MatToolbar,
    MatButton,
    MatAnchor,
    MatIconButton,
    MatIcon,
    MatBadgeModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar class="app-toolbar">
      <a class="app-toolbar__brand" routerLink="/dashboard">
        <mat-icon>bolt</mat-icon>
        <span>Synapse</span>
      </a>

      <nav class="app-nav" aria-label="Main navigation">
        <a mat-button routerLink="/dashboard" routerLinkActive="nav-link--active">
          Dashboard
        </a>
        <a mat-button routerLink="/topics" routerLinkActive="nav-link--active">
          Topics
        </a>
        <a mat-button routerLink="/notes" routerLinkActive="nav-link--active">
          Notes
        </a>
        <a mat-button routerLink="/review"
           routerLinkActive="nav-link--active"
           [matBadge]="dueCount() > 0 ? dueCount() : null"
           matBadgeColor="warn"
           [matBadgeHidden]="dueCount() === 0">
          Review
        </a>
      </nav>

      <div class="app-toolbar__actions">
        <button mat-icon-button
                (click)="themeService.toggle()"
                [matTooltip]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
                aria-label="Toggle colour theme">
          <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </div>
    </mat-toolbar>

    <main class="app-content" id="main-content" role="main">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly themeService  = inject(ThemeService);
  private  readonly flashcardState = inject(FlashcardStateService);

  readonly dueCount = computed(() => this.flashcardState.dueCards().length);
}