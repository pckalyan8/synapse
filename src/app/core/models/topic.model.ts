import { DomainId } from './flashcard.model';

export interface Topic {
  readonly id: DomainId;
  readonly label: string;
  readonly description: string;
  readonly icon: string;           // Material icon name
  readonly accentToken: string;    // CSS custom property name e.g. --color-domain-java
  readonly totalCards: number;
}

export const TOPICS: Topic[] = [
  {
    id: 'java',
    label: 'Java',
    description: 'Core Java, OOP, JVM internals, concurrency, and modern Java features.',
    icon: 'coffee',
    accentToken: '--color-domain-java',
    totalCards: 0,
  },
  {
    id: 'spring-boot',
    label: 'Spring Boot',
    description: 'Spring ecosystem, IoC, REST, Security, Data, and testing.',
    icon: 'eco',
    accentToken: '--color-domain-spring-boot',
    totalCards: 0,
  },
  {
    id: 'python',
    label: 'Python',
    description: 'Python fundamentals, data structures, async, and the ecosystem.',
    icon: 'code',
    accentToken: '--color-domain-python',
    totalCards: 0,
  },
  {
    id: 'machine-learning',
    label: 'Machine Learning',
    description: 'ML algorithms, model evaluation, feature engineering, and frameworks.',
    icon: 'psychology',
    accentToken: '--color-domain-ml',
    totalCards: 0,
  },
  {
    id: 'generative-ai',
    label: 'Generative AI',
    description: 'LLMs, transformers, RAG, prompt engineering, and evaluation.',
    icon: 'auto_awesome',
    accentToken: '--color-domain-gen-ai',
    totalCards: 0,
  },
];