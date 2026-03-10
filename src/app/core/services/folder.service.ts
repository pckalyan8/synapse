// src/app/core/services/folder.service.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { Folder } from '../models/folder.model';
import { PersistenceService } from './persistence.service';

@Injectable({ providedIn: 'root' })
export class FolderService {
  private readonly persistence = inject(PersistenceService);
  private readonly _folders    = signal<Folder[]>(this.persistence.loadFolders());

  readonly allFolders = this._folders.asReadonly();

  // ── Queries ───────────────────────────────────────────────────────────────

  /** Direct children of a given parent (null = root level). */
  getChildren(domainId: string, parentId: string | null): Folder[] {
    return this._folders().filter(
      f => f.domainId === domainId && f.parentId === parentId
    );
  }

  getFolder(id: string): Folder | undefined {
    return this._folders().find(f => f.id === id);
  }

  /** Returns path from root to folder (not including root itself). */
  getBreadcrumb(folderId: string): Folder[] {
    const path: Folder[] = [];
    let current = this.getFolder(folderId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.getFolder(current.parentId) : undefined;
    }
    return path;
  }

  /** All descendant folder IDs (recursively). */
  getDescendantIds(folderId: string): string[] {
    const result: string[] = [];
    const children = this._folders().filter(f => f.parentId === folderId);
    for (const child of children) {
      result.push(child.id, ...this.getDescendantIds(child.id));
    }
    return result;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  addFolder(domainId: string, parentId: string | null, label: string): Folder {
    const folder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      domainId,
      parentId,
      label: label.trim(),
      createdAt: new Date().toISOString(),
    };
    this._folders.update(list => [...list, folder]);
    this.persist();
    return folder;
  }

  updateFolder(id: string, label: string): void {
    this._folders.update(list =>
      list.map(f => f.id === id ? { ...f, label: label.trim() } : f)
    );
    this.persist();
  }

  /**
   * Delete a folder and ALL its descendants.
   * Returns array of all deleted folder IDs so the caller
   * can also delete cards inside those folders.
   */
  deleteFolder(id: string): string[] {
    const descendantIds = this.getDescendantIds(id);
    const allIds = [id, ...descendantIds];
    this._folders.update(list => list.filter(f => !allIds.includes(f.id)));
    this.persist();
    return allIds;
  }

  private persist(): void {
    this.persistence.saveFolders(this._folders());
  }
}
