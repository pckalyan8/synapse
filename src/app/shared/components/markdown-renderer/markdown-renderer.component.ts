// npm install marked dompurify && npm install -D @types/dompurify

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Renderer as MarkedRenderer } from 'marked';
import DOMPurify from 'dompurify';
import type { Config as DOMPurifyConfig } from 'dompurify';

function buildRenderer(): MarkedRenderer {
  const r = new MarkedRenderer();
  r.link = ({ href, title, text }) => {
    const h = href ?? '';
    const ext = h.startsWith('http') || h.startsWith('//');
    return `<a href="${h}"${title ? ` title="${title}"` : ''}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
  };
  r.code = ({ text, lang }) =>
    `<pre><code${lang ? ` class="language-${lang}"` : ''}>${text}</code></pre>`;
  return r;
}

marked.use({ renderer: buildRenderer(), gfm: true, breaks: false });

const PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS: [
    'h1','h2','h3','h4','h5','h6',
    'p','br','hr','strong','em','del','s','sub','sup',
    'ul','ol','li','blockquote','pre','code',
    'table','thead','tbody','tr','th','td',
    'a','img','span','div',
  ],
  ALLOWED_ATTR: ['href','title','target','rel','src','alt','width','height','class','id'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

@Component({
  selector: 'app-markdown-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="markdown-body"
      [class.markdown-body--compact]="compact()"
      [innerHTML]="safeHtml()"
      aria-live="polite">
    </article>
  `,
  styleUrl: './markdown-renderer.component.scss',
})
export class MarkdownRendererComponent {
  readonly content = input.required<string>();
  readonly compact = input<boolean>(false);

  private readonly sanitizer = inject(DomSanitizer);

  readonly safeHtml = computed<SafeHtml>(() => {
    const raw = this.content();
    if (!raw?.trim()) return '';
    const html  = marked.parse(raw, { async: false }) as string;
    const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  });
}