// ─────────────────────────────────────────────────────────────────────────────
// src/app/shared/components/markdown-renderer/markdown-renderer.component.ts
//
// Security pipeline:  raw markdown  →  marked (HTML)  →  DOMPurify  →  SafeHtml
// DOMPurify is the gold-standard, battle-tested sanitisation library used by
// Google, Mozilla, and major enterprises. It has zero runtime dependencies.
// Install:  npm install dompurify && npm install -D @types/dompurify
// ─────────────────────────────────────────────────────────────────────────────

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnChanges,
  Renderer2,
  SecurityContext,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Stable, widely adopted markdown parser (standard, not experimental)
import { marked, Renderer as MarkedRenderer } from 'marked';

// Gold-standard XSS sanitiser — deterministic, no eval(), CSP-compatible
import DOMPurify from 'dompurify';
import type { Config as DOMPurifyConfig } from 'dompurify';

// ── One-time marked configuration (call once at app startup if preferred) ─────
function buildMarkedRenderer(): MarkedRenderer {
  const renderer = new MarkedRenderer();

  // Open external links in a new tab with security attributes
  renderer.link = ({ href, title, text }) => {
    const safeHref = href ?? '';
    const isExternal = safeHref.startsWith('http') || safeHref.startsWith('//');
    const rel = isExternal ? ' rel="noopener noreferrer"' : '';
    const target = isExternal ? ' target="_blank"' : '';
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${safeHref}"${titleAttr}${target}${rel}>${text}</a>`;
  };

  // Add language class to code blocks for syntax highlighting hooks
  renderer.code = ({ text, lang }) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${text}</code></pre>`;
  };

  return renderer;
}

marked.use({
  renderer: buildMarkedRenderer(),
  gfm: true,       // GitHub Flavoured Markdown (tables, strikethrough, etc.)
  breaks: false,   // Don't convert single newlines to <br>
});

// ── DOMPurify configuration ───────────────────────────────────────────────────
const PURIFY_CONFIG: DOMPurifyConfig = {
  // Allow the tags produced by marked's standard output
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 's', 'sub', 'sup',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img',
    'span', 'div',         // Needed for some GFM extensions
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',  // <a>
    'src', 'alt', 'width', 'height',   // <img>
    'class',                            // For syntax highlighting hooks
    'id',                               // For anchor links
  ],
  // Never allow javascript: URIs
  ALLOW_DATA_ATTR: false,
  // Force relative URLs to be safe
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-markdown-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      #contentHost
      class="markdown-body"
      [class.markdown-body--compact]="compact()"
      [innerHTML]="safeHtml()"
      aria-live="polite">
    </article>
  `,
  styleUrl: './markdown-renderer.component.scss',
})
export class MarkdownRendererComponent {
  // ── Signal inputs (Angular 17+ syntax) ──────────────────────────────────
  readonly content = input.required<string>();
  readonly compact = input<boolean>(false);

  // ── Dependencies ─────────────────────────────────────────────────────────
  private readonly domSanitizer = inject(DomSanitizer);

  // ── Derived signal: markdown → sanitised SafeHtml ────────────────────────
  readonly safeHtml = computed<SafeHtml>(() => {
    const raw = this.content();
    if (!raw?.trim()) return '';

    // Step 1: Parse markdown to HTML string (synchronous overload)
    const htmlString = marked.parse(raw, { async: false }) as string;

    // Step 2: Sanitise with DOMPurify — strips all XSS vectors
    const cleanHtml = DOMPurify.sanitize(htmlString, PURIFY_CONFIG);

    // Step 3: Tell Angular this specific string is already sanitised.
    // We bypass Angular's own sanitiser because DOMPurify has already done
    // a more thorough job. This is the correct and safe pattern.
    return this.domSanitizer.bypassSecurityTrustHtml(cleanHtml);
  });
}