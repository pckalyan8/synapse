// src/app/core/models/folder.model.ts
// A Folder represents one level in the topic hierarchy tree.
// Example path: Java (domainId) > Spring Boot (folder) > Spring JPA (folder) > cards

export interface Folder {
  id: string;
  domainId: string;        // which root topic this belongs to
  parentId: string | null; // null = directly under the root topic
  label: string;
  createdAt: string;
}
