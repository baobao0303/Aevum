/**
 * StudySet Repository for Aevum Quizlet Integration
 * Guest/Local workspace mode with LocalStorage persistence
 */

import type {
  CreateStudySetInput,
  DiagramCoordinates,
  StudySetModel,
  TermCardModel,
} from '../models/study-set.model';
import { parseCsvCards, serializeCardsToCsv } from './csv-parser.util';

const STORAGE_KEY = 'aevum_quizlet_study_sets';

export class StudySetRepository {
  private readonly memoryCache: Map<string, StudySetModel> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private generateId(): string {
    return (
      'set_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
    );
  }

  private generateCardId(): string {
    return (
      'card_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now()
    );
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StudySetModel[] = JSON.parse(raw);
        this.memoryCache.clear();
        parsed.forEach(item => this.memoryCache.set(item.id, item));
      }
    } catch {
      // Graceful fallback to memoryCache
    }
  }

  private persist(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const all = Array.from(this.memoryCache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Storage full or unavailable
    }
  }

  public validateDiagramPin(coords?: DiagramCoordinates | null): boolean {
    if (!coords) return true;
    return (
      coords.xPercent >= 0 &&
      coords.xPercent <= 100 &&
      coords.yPercent >= 0 &&
      coords.yPercent <= 100
    );
  }

  public listSets(): StudySetModel[] {
    return Array.from(this.memoryCache.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getSet(id: string): StudySetModel | null {
    return this.memoryCache.get(id) || null;
  }

  public createSet(input: CreateStudySetInput): StudySetModel {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Study set title is required');
    }
    if (!input.cards || input.cards.length < 2) {
      throw new Error('Study set must contain at least 2 cards (AC-SET-01)');
    }

    const setId = this.generateId();
    const now = new Date().toISOString();

    const cards: TermCardModel[] = input.cards.map((c, index) => {
      if (
        c.diagramCoordinates &&
        !this.validateDiagramPin(c.diagramCoordinates)
      ) {
        throw new Error(
          `Invalid diagram pin coordinates on card #${index + 1}: bounds must be 0-100%`
        );
      }
      return {
        id: this.generateCardId(),
        setId,
        term: c.term.trim(),
        definition: c.definition.trim(),
        imageUrl: c.imageUrl || null,
        audioUrl: c.audioUrl || null,
        isStarred: c.isStarred || false,
        displayOrder: index,
        diagramCoordinates: c.diagramCoordinates || null,
      };
    });

    const newSet: StudySetModel = {
      id: setId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      termLanguage: input.termLanguage || 'en',
      definitionLanguage: input.definitionLanguage || 'vi',
      isDiagram: input.isDiagram || false,
      diagramImageUrl: input.diagramImageUrl || null,
      cards,
      isFavorite: input.isFavorite || false,
      folderId: input.folderId || null,
      folderName: input.folderName || null,
      tags: input.tags || [],
      collectionId: input.collectionId || null,
      collectionName: input.collectionName || null,
      createdAt: now,
      updatedAt: now,
    };

    this.memoryCache.set(setId, newSet);
    this.persist();
    return newSet;
  }

  public updateSet(
    id: string,
    input: Partial<CreateStudySetInput>
  ): StudySetModel {
    const existing = this.getSet(id);
    if (!existing) {
      throw new Error(`Study set not found with id: ${id}`);
    }

    if (input.cards && input.cards.length < 2) {
      throw new Error('Study set must contain at least 2 cards (AC-SET-01)');
    }

    let updatedCards = existing.cards;
    if (input.cards) {
      updatedCards = input.cards.map((c, index) => {
        if (
          c.diagramCoordinates &&
          !this.validateDiagramPin(c.diagramCoordinates)
        ) {
          throw new Error(
            `Invalid diagram pin coordinates on card #${index + 1}`
          );
        }
        return {
          id: this.generateCardId(),
          setId: id,
          term: c.term.trim(),
          definition: c.definition.trim(),
          imageUrl: c.imageUrl || null,
          audioUrl: c.audioUrl || null,
          isStarred: c.isStarred || false,
          displayOrder: index,
          diagramCoordinates: c.diagramCoordinates || null,
          tags: c.tags || [],
        };
      });
    }

    const updated: StudySetModel = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description:
        input.description !== undefined
          ? input.description.trim()
          : existing.description,
      termLanguage: input.termLanguage || existing.termLanguage,
      definitionLanguage:
        input.definitionLanguage || existing.definitionLanguage,
      isDiagram:
        input.isDiagram !== undefined ? input.isDiagram : existing.isDiagram,
      diagramImageUrl:
        input.diagramImageUrl !== undefined
          ? input.diagramImageUrl
          : existing.diagramImageUrl,
      isFavorite:
        input.isFavorite !== undefined ? input.isFavorite : existing.isFavorite,
      folderId:
        input.folderId !== undefined ? input.folderId : existing.folderId,
      folderName:
        input.folderName !== undefined ? input.folderName : existing.folderName,
      tags: input.tags !== undefined ? input.tags : existing.tags,
      collectionId:
        input.collectionId !== undefined
          ? input.collectionId
          : existing.collectionId,
      collectionName:
        input.collectionName !== undefined
          ? input.collectionName
          : existing.collectionName,
      cards: updatedCards,
      updatedAt: new Date().toISOString(),
    };

    this.memoryCache.set(id, updated);
    this.persist();
    return updated;
  }

  public deleteSet(id: string): boolean {
    const existed = this.memoryCache.delete(id);
    if (existed) {
      this.persist();
    }
    return existed;
  }

  public importFromCsv(
    title: string,
    rawText: string,
    options?: { termLang?: string; defLang?: string }
  ): StudySetModel {
    const parsed = parseCsvCards(rawText);
    if (parsed.length < 2) {
      throw new Error(
        'Import failed: CSV/TSV must produce at least 2 valid cards'
      );
    }

    return this.createSet({
      title,
      termLanguage: options?.termLang || 'en',
      definitionLanguage: options?.defLang || 'vi',
      cards: parsed.map(item => ({
        term: item.term,
        definition: item.definition,
        displayOrder: 0,
      })),
    });
  }

  public exportToCsv(id: string, delimiter: '\t' | ',' = '\t'): string {
    const set = this.getSet(id);
    if (!set) {
      throw new Error(`Study set not found: ${id}`);
    }
    return serializeCardsToCsv(
      set.cards.map(c => ({ term: c.term, definition: c.definition })),
      delimiter
    );
  }

  public toggleCardStar(setId: string, cardId: string): boolean {
    const set = this.getSet(setId);
    if (!set) return false;

    const card = set.cards.find(c => c.id === cardId);
    if (!card) return false;

    card.isStarred = !card.isStarred;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return card.isStarred;
  }

  public addCardToSet(
    setId: string,
    card: { term: string; definition: string; isStarred?: boolean }
  ): TermCardModel | null {
    const set = this.getSet(setId);
    if (!set) return null;
    const newCard: TermCardModel = {
      id: this.generateCardId(),
      setId,
      term: card.term.trim(),
      definition: card.definition.trim(),
      imageUrl: null,
      audioUrl: null,
      isStarred: card.isStarred || false,
      displayOrder: set.cards.length,
      diagramCoordinates: null,
    };
    set.cards.push(newCard);
    set.updatedAt = new Date().toISOString();
    this.persist();
    return newCard;
  }

  public deleteCard(setId: string, cardId: string): boolean {
    const set = this.getSet(setId);
    if (!set) return false;
    const initialLen = set.cards.length;
    set.cards = set.cards.filter(c => c.id !== cardId);
    if (set.cards.length !== initialLen) {
      set.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  public updateCard(
    setId: string,
    cardId: string,
    input: Partial<TermCardModel>
  ): TermCardModel | null {
    const set = this.getSet(setId);
    if (!set) return null;
    const card = set.cards.find(c => c.id === cardId);
    if (!card) return null;
    if (input.term !== undefined) card.term = input.term.trim();
    if (input.definition !== undefined)
      card.definition = input.definition.trim();
    if (input.isStarred !== undefined) card.isStarred = input.isStarred;
    if (input.tags !== undefined) card.tags = input.tags;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return card;
  }

  public toggleSetFavorite(setId: string): boolean {
    const set = this.getSet(setId);
    if (!set) return false;
    set.isFavorite = !set.isFavorite;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return set.isFavorite;
  }

  public updateSetMapping(
    setId: string,
    mapping: {
      isFavorite?: boolean;
      folderId?: string | null;
      folderName?: string | null;
      tags?: string[];
      collectionId?: string | null;
      collectionName?: string | null;
    }
  ): StudySetModel | null {
    const set = this.getSet(setId);
    if (!set) return null;
    if (mapping.isFavorite !== undefined) set.isFavorite = mapping.isFavorite;
    if (mapping.folderId !== undefined) set.folderId = mapping.folderId;
    if (mapping.folderName !== undefined) set.folderName = mapping.folderName;
    if (mapping.tags !== undefined) set.tags = mapping.tags;
    if (mapping.collectionId !== undefined)
      set.collectionId = mapping.collectionId;
    if (mapping.collectionName !== undefined)
      set.collectionName = mapping.collectionName;
    set.updatedAt = new Date().toISOString();
    this.persist();
    return set;
  }
}
