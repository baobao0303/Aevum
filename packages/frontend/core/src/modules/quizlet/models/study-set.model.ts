/**
 * Quizlet Phase 1 Core Domain Models (Aevum Frontend)
 * Implements SPEC-QUIZLET-RE-2026-V1 Section 8.3
 */

export interface DiagramCoordinates {
  xPercent: number; // 0.0 - 100.0% relative to image width
  yPercent: number; // 0.0 - 100.0% relative to image height
}

export interface TermCardModel {
  id: string;
  setId: string;
  term: string;
  definition: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  isStarred?: boolean;
  displayOrder: number;
  diagramCoordinates?: DiagramCoordinates | null;
  tags?: string[];
}

export interface StudySetModel {
  id: string; // UUID v4
  title: string;
  description: string;
  termLanguage: string; // ISO 639-1 (e.g. 'en', 'vi', 'ja')
  definitionLanguage: string;
  isDiagram: boolean;
  diagramImageUrl?: string | null;
  cards: TermCardModel[];
  createdAt: string;
  updatedAt: string;

  // 4 Core Workspace Mappings (Favorites, Organize/Folders, Tags, Collections)
  isFavorite?: boolean;
  folderId?: string | null;
  folderName?: string | null;
  tags?: string[];
  collectionId?: string | null;
  collectionName?: string | null;
}

export interface CreateStudySetInput {
  title: string;
  description?: string;
  termLanguage?: string;
  definitionLanguage?: string;
  isDiagram?: boolean;
  diagramImageUrl?: string | null;
  cards: Array<Omit<TermCardModel, 'id' | 'setId'>>;

  // 4 Core Workspace Mappings (Favorites, Organize/Folders, Tags, Collections)
  isFavorite?: boolean;
  folderId?: string | null;
  folderName?: string | null;
  tags?: string[];
  collectionId?: string | null;
  collectionName?: string | null;
}
