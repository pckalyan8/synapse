// src/app/features/domains/_shared/domain-overview.base.ts
import {
  computed,
  inject,
  signal,
  OnInit,
  Component,
} from '@angular/core';
import { FormsModule }           from '@angular/forms';
import { RouterLink }            from '@angular/router';
import { HttpClient }            from '@angular/common/http';
import { Flashcard }             from '../../../core/models/flashcard.model';
import { FlashcardStateService } from '../../../core/services/flashcard-state.service';
import { TopicManagementService } from '../../../core/services/topic-management.service';
import { ProgressRingComponent } from '@shared/components/progress-ring/progress-ring.component';
import { MatProgressSpinner }    from '@angular/material/progress-spinner';
import { MatIcon }               from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { FlashcardComponent }    from '@shared/components/flashcard/flashcard.component';

export interface CardEditorState {
  open: boolean;
  mode: 'add' | 'edit';
  cardId: string | null;
  front: string;
  back: string;
  tags: string;           // comma-separated input
  subtopicId: string;
  tab: 'front' | 'back';
}

@Component({
  styleUrl: './domain-overview.template.scss',
  templateUrl: '../_shared/domain-overview.template.html',
  imports: [
    RouterLink, FormsModule,
    ProgressRingComponent, MatProgressSpinner,
    MatIcon, MatButton, MatTooltipModule, FlashcardComponent,
  ],
})
export abstract class DomainOverviewBase implements OnInit {
  protected abstract readonly domainId: string;
  protected abstract readonly domainLabel: string;

  protected readonly http         = inject(HttpClient);
  protected readonly state        = inject(FlashcardStateService);
  protected readonly topicService = inject(TopicManagementService);

  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  readonly domainCards = computed(() =>
    this.state.cardsByDomain()[this.domainId] ?? []);

  readonly domainStats = computed(() =>
    this.state.statsByDomain()[this.domainId] ?? { total: 0, due: 0, mastered: 0 });

  /** Subtopics for this domain, for the editor dropdown */
  readonly subtopics = computed(() => {
    const topic = this.topicService.allTopics().find(t => t.id === this.domainId);
    if (!topic) return [];
    if (topic.isBuiltIn) return this.topicService.getBuiltInSubtopics(this.domainId);
    return topic.subtopics;
  });

  // ── Card editor state ─────────────────────────────────────────────────────

  readonly editor = signal<CardEditorState>({
    open: false, mode: 'add', cardId: null,
    front: '', back: '', tags: '', subtopicId: '', tab: 'front',
  });

  readonly editorPreviewFront = computed(() => this.renderMd(this.editor().front));
  readonly editorPreviewBack  = computed(() => this.renderMd(this.editor().back));

  ngOnInit(): void {
    this.state.setActiveDomain(this.domainId);
    this.loadCards();
  }

  private loadCards(): void {
    this.isLoading.set(true);
    this.http
      .get<Flashcard[]>(`/data/flashcards/${this.domainId}.json`)
      .subscribe({
        next: cards => {
          this.state.loadCards(cards);
          this.isLoading.set(false);
        },
        error: () => {
          // Built-in cards may not exist for custom domains — that's fine
          this.isLoading.set(false);
        },
      });
  }

  // ── Card CRUD ─────────────────────────────────────────────────────────────

  openAddCard(): void {
    this.editor.set({ open: true, mode: 'add', cardId: null, front: '', back: '', tags: '', subtopicId: '', tab: 'front' });
  }

  openEditCard(card: Flashcard): void {
    this.editor.set({
      open: true, mode: 'edit', cardId: card.id,
      front: card.front, back: card.back,
      tags: card.tags.join(', '),
      subtopicId: card.subtopicId ?? '',
      tab: 'front',
    });
  }

  closeEditor(): void {
    this.editor.update(e => ({ ...e, open: false }));
  }

  setEditorTab(tab: 'front' | 'back'): void {
    this.editor.update(e => ({ ...e, tab }));
  }

  saveCard(): void {
    const e = this.editor();
    if (!e.front.trim() || !e.back.trim()) return;
    const tags = e.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (e.mode === 'add') {
      this.state.addCard(this.domainId, e.front, e.back, tags, e.subtopicId || undefined);
    } else if (e.cardId) {
      this.state.updateCard(e.cardId, e.front, e.back, tags, e.subtopicId || undefined);
    }
    this.closeEditor();
  }

  deleteCard(cardId: string): void {
    if (confirm('Delete this flashcard? This cannot be undone.')) {
      this.state.deleteCard(cardId);
    }
  }

  isCustomCard(cardId: string): boolean {
    return this.state.isCustomCard(cardId);
  }

  updateEditorField(field: 'front' | 'back' | 'tags' | 'subtopicId', value: string): void {
    this.editor.update(e => ({ ...e, [field]: value }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  startReview(): void { this.state.startSession(); }

  private renderMd(md: string): string {
    if (!md.trim()) return '<p style="color:var(--color-on-surface-variant);font-style:italic">Nothing to preview.</p>';
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--color-surface-2);padding:1px 5px;border-radius:4px;font-size:0.9em">$1</code>')
      .replace(/^- (.+)$/gm, '<li style="margin-left:1.2em">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin-top:0.75em">')
      .replace(/\n/g, '<br>');
  }
}
