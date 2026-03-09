// src/app/core/services/note-management.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface ManagedNote {
  id: string;
  title: string;
  domain: string;
  content: string;   // raw Markdown
  updatedAt: string;
  isBuiltIn: boolean;
  builtInPath?: string;  // only for built-in notes that fetch from assets
}

const STORAGE_KEY = 'synapse_custom_notes';

const BUILT_IN_NOTE_META: Omit<ManagedNote, 'content'>[] = [
  { id: 'java-concurrency',       title: 'Java Concurrency Deep Dive', domain: 'Java',          updatedAt: '2024-01-15T00:00:00.000Z', isBuiltIn: true, builtInPath: '/data/notes/java-concurrency.md' },
  { id: 'spring-data-jpa',        title: 'Spring Data JPA Reference',  domain: 'Spring Boot',   updatedAt: '2024-02-01T00:00:00.000Z', isBuiltIn: true, builtInPath: '/data/notes/spring-data-jpa.md' },
  { id: 'transformer-architecture', title: 'Transformer Architecture', domain: 'Generative AI', updatedAt: '2024-03-01T00:00:00.000Z', isBuiltIn: true, builtInPath: '/data/notes/transformer-architecture.md' },
];

@Injectable({ providedIn: 'root' })
export class NoteManagementService {
  private readonly customNotes = signal<ManagedNote[]>(this.loadFromStorage());

  /** Metadata list for all notes (built-ins + custom). */
  readonly allNoteMeta = computed(() => [
    ...BUILT_IN_NOTE_META.map(n => ({ ...n, content: '' })),
    ...this.customNotes(),
  ]);

  readonly customNotesList = computed(() => this.customNotes());

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addNote(title: string, domain: string, content: string): ManagedNote {
    const note: ManagedNote = {
      id: `note-${Date.now()}`,
      title,
      domain,
      content,
      updatedAt: new Date().toISOString(),
      isBuiltIn: false,
    };
    this.customNotes.update(list => [...list, note]);
    this.persist();
    return note;
  }

  updateNote(id: string, title: string, domain: string, content: string): void {
    this.customNotes.update(list =>
      list.map(n => n.id === id
        ? { ...n, title, domain, content, updatedAt: new Date().toISOString() }
        : n
      )
    );
    this.persist();
  }

  deleteNote(id: string): void {
    this.customNotes.update(list => list.filter(n => n.id !== id));
    this.persist();
  }

  getCustomNote(id: string): ManagedNote | undefined {
    return this.customNotes().find(n => n.id === id);
  }

  isCustomNote(id: string): boolean {
    return this.customNotes().some(n => n.id === id);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private loadFromStorage(): ManagedNote[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customNotes()));
  }
}