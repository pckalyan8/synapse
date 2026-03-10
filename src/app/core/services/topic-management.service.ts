// src/app/core/services/topic-management.service.ts
import { Injectable, computed, signal } from '@angular/core';

export interface ManagedTopic {
  id: string;
  label: string;
  description: string;
  icon: string;        // Material icon name
  accentColor: string; // hex colour e.g. "#e76f51"
  isBuiltIn: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'synapse_custom_topics_v2';

export const BUILT_IN_TOPICS: ManagedTopic[] = [
  {
    id: 'java', label: 'Java',
    description: 'Core Java, OOP, JVM internals, concurrency, and modern Java features.',
    icon: 'coffee', accentColor: '#e76f51', isBuiltIn: true, createdAt: '',
  },
  {
    id: 'spring-boot', label: 'Spring Boot',
    description: 'Spring ecosystem, IoC, REST, Security, Data, and testing.',
    icon: 'eco', accentColor: '#52b788', isBuiltIn: true, createdAt: '',
  },
  {
    id: 'python', label: 'Python',
    description: 'Python fundamentals, data structures, async, and the ecosystem.',
    icon: 'code', accentColor: '#4361ee', isBuiltIn: true, createdAt: '',
  },
  {
    id: 'machine-learning', label: 'Machine Learning',
    description: 'ML algorithms, model evaluation, feature engineering, and frameworks.',
    icon: 'psychology', accentColor: '#9b5de5', isBuiltIn: true, createdAt: '',
  },
  {
    id: 'generative-ai', label: 'Generative AI',
    description: 'LLMs, transformers, RAG, prompt engineering, and evaluation.',
    icon: 'auto_awesome', accentColor: '#f72585', isBuiltIn: true, createdAt: '',
  },
];

@Injectable({ providedIn: 'root' })
export class TopicManagementService {
  private readonly customTopics = signal<ManagedTopic[]>(this.load());

  readonly allTopics = computed<ManagedTopic[]>(() => [
    ...BUILT_IN_TOPICS,
    ...this.customTopics(),
  ]);

  findTopic(id: string): ManagedTopic | undefined {
    return this.allTopics().find(t => t.id === id);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addTopic(partial: Omit<ManagedTopic, 'id' | 'isBuiltIn' | 'createdAt'>): ManagedTopic {
    const topic: ManagedTopic = {
      ...partial,
      id: `custom-${Date.now()}`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    this.customTopics.update(list => [...list, topic]);
    this.persist();
    return topic;
  }

  updateTopic(
    id: string,
    patch: Partial<Pick<ManagedTopic, 'label' | 'description' | 'icon' | 'accentColor'>>,
  ): void {
    this.customTopics.update(list =>
      list.map(t => t.id === id ? { ...t, ...patch } : t)
    );
    this.persist();
  }

  deleteTopic(id: string): void {
    this.customTopics.update(list => list.filter(t => t.id !== id));
    this.persist();
  }

  private load(): ManagedTopic[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ManagedTopic[]) : [];
    } catch { return []; }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customTopics()));
  }
}
