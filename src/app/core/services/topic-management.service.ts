// src/app/core/services/topic-management.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface Subtopic {
  id: string;
  label: string;
  description?: string;
}

export interface ManagedTopic {
  id: string;
  label: string;
  description: string;
  icon: string;
  accentColor: string;   // hex colour stored directly
  subtopics: Subtopic[];
  isBuiltIn: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'synapse_custom_topics';

const BUILT_IN_TOPICS: ManagedTopic[] = [
  {
    id: 'java', label: 'Java',
    description: 'Core Java, OOP, JVM internals, concurrency, and modern Java features.',
    icon: 'coffee', accentColor: '#e76f51', subtopics: [], isBuiltIn: true, createdAt: '',
  },
  {
    id: 'spring-boot', label: 'Spring Boot',
    description: 'Spring ecosystem, IoC, REST, Security, Data, and testing.',
    icon: 'eco', accentColor: '#52b788', subtopics: [], isBuiltIn: true, createdAt: '',
  },
  {
    id: 'python', label: 'Python',
    description: 'Python fundamentals, data structures, async, and the ecosystem.',
    icon: 'code', accentColor: '#4361ee', subtopics: [], isBuiltIn: true, createdAt: '',
  },
  {
    id: 'machine-learning', label: 'Machine Learning',
    description: 'ML algorithms, model evaluation, feature engineering, and frameworks.',
    icon: 'psychology', accentColor: '#9b5de5', subtopics: [], isBuiltIn: true, createdAt: '',
  },
  {
    id: 'generative-ai', label: 'Generative AI',
    description: 'LLMs, transformers, RAG, prompt engineering, and evaluation.',
    icon: 'auto_awesome', accentColor: '#f72585', subtopics: [], isBuiltIn: true, createdAt: '',
  },
];

@Injectable({ providedIn: 'root' })
export class TopicManagementService {
  private readonly customTopics = signal<ManagedTopic[]>(this.loadFromStorage());

  /** All topics: built-ins first, then custom */
  readonly allTopics = computed<ManagedTopic[]>(() => [
    ...BUILT_IN_TOPICS,
    ...this.customTopics(),
  ]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addTopic(partial: Omit<ManagedTopic, 'id' | 'isBuiltIn' | 'subtopics' | 'createdAt'>): ManagedTopic {
    const topic: ManagedTopic = {
      ...partial,
      id: `custom-${Date.now()}`,
      isBuiltIn: false,
      subtopics: [],
      createdAt: new Date().toISOString(),
    };
    this.customTopics.update(list => [...list, topic]);
    this.persist();
    return topic;
  }

  updateTopic(id: string, patch: Partial<Pick<ManagedTopic, 'label' | 'description' | 'icon' | 'accentColor'>>): void {
    this.customTopics.update(list =>
      list.map(t => t.id === id ? { ...t, ...patch } : t)
    );
    this.persist();
  }

  deleteTopic(id: string): void {
    this.customTopics.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  // ── Subtopics ─────────────────────────────────────────────────────────────

  addSubtopic(topicId: string, label: string, description?: string): void {
    const subtopic: Subtopic = {
      id: `sub-${Date.now()}`,
      label,
      description,
    };
    this.customTopics.update(list =>
      list.map(t => t.id === topicId
        ? { ...t, subtopics: [...t.subtopics, subtopic] }
        : t
      )
    );
    this.persist();
  }

  updateSubtopic(topicId: string, subtopicId: string, label: string, description?: string): void {
    this.customTopics.update(list =>
      list.map(t => t.id === topicId
        ? {
            ...t,
            subtopics: t.subtopics.map(s =>
              s.id === subtopicId ? { ...s, label, description } : s
            ),
          }
        : t
      )
    );
    this.persist();
  }

  deleteSubtopic(topicId: string, subtopicId: string): void {
    this.customTopics.update(list =>
      list.map(t => t.id === topicId
        ? { ...t, subtopics: t.subtopics.filter(s => s.id !== subtopicId) }
        : t
      )
    );
    this.persist();
  }

  // ── Built-in subtopics (persisted separately) ─────────────────────────────

  addBuiltInSubtopic(topicId: string, label: string, description?: string): void {
    const subtopicKey = `synapse_subtopics_${topicId}`;
    const existing: Subtopic[] = JSON.parse(localStorage.getItem(subtopicKey) ?? '[]');
    const subtopic: Subtopic = { id: `sub-${Date.now()}`, label, description };
    localStorage.setItem(subtopicKey, JSON.stringify([...existing, subtopic]));
  }

  getBuiltInSubtopics(topicId: string): Subtopic[] {
    const subtopicKey = `synapse_subtopics_${topicId}`;
    return JSON.parse(localStorage.getItem(subtopicKey) ?? '[]');
  }

  deleteBuiltInSubtopic(topicId: string, subtopicId: string): void {
    const subtopicKey = `synapse_subtopics_${topicId}`;
    const existing: Subtopic[] = JSON.parse(localStorage.getItem(subtopicKey) ?? '[]');
    localStorage.setItem(subtopicKey, JSON.stringify(existing.filter(s => s.id !== subtopicId)));
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private loadFromStorage(): ManagedTopic[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customTopics()));
  }
}