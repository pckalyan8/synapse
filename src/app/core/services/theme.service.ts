import {
  effect, inject, Injectable, Renderer2, RendererFactory2, signal, computed,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PersistenceService } from './persistence.service';

export type ColorScheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly persistence = inject(PersistenceService);
  private readonly document    = inject(DOCUMENT);
  private readonly renderer: Renderer2;

  readonly isDark  = signal<boolean>(this.persistence.loadTheme());
  readonly scheme  = computed<ColorScheme>(() => this.isDark() ? 'dark' : 'light');

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.applyThemeClass(this.isDark());

    effect(() => {
      const dark = this.isDark();
      this.applyThemeClass(dark);
      this.persistence.saveTheme(dark);
    });
  }

  toggle(): void { this.isDark.update((v) => !v); }

  setScheme(scheme: ColorScheme): void { this.isDark.set(scheme === 'dark'); }

  private applyThemeClass(isDark: boolean): void {
    const html = this.document.documentElement;
    if (isDark) {
      this.renderer.addClass(html, 'dark-theme');
      this.renderer.removeClass(html, 'light-theme');
    } else {
      this.renderer.addClass(html, 'light-theme');
      this.renderer.removeClass(html, 'dark-theme');
    }
  }
}