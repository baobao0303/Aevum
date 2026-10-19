/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FlashcardPlayer } from '../components/flashcard-player';
import type { TermCardModel } from '../models/study-set.model';
import { TtsSpeechService } from '../services/tts-speech.service';

describe('FlashcardPlayer Component (Aevum React 3D Flip)', () => {
  const mockCards: TermCardModel[] = [
    {
      id: 'card-1',
      setId: 'set-1',
      term: 'Photosynthesis',
      definition:
        'Quá trình quang hợp chuyển đổi ánh sáng thành năng lượng hóa học',
      isStarred: false,
      displayOrder: 0,
    },
    {
      id: 'card-2',
      setId: 'set-1',
      term: 'Mitochondria',
      definition: 'Ty thể - nhà máy sản xuất năng lượng ATP của tế bào',
      isStarred: true,
      displayOrder: 1,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('AC-FC-01: 3D Flip Animation & State', () => {
    it('should render front card term initially', () => {
      render(<FlashcardPlayer cards={mockCards} />);

      expect(screen.getByText('Photosynthesis')).toBeDefined();
      expect(screen.getByText('Thẻ 1 / 2')).toBeDefined();
    });

    it('should flip card to definition upon container click', () => {
      render(<FlashcardPlayer cards={mockCards} />);

      const flipContainer = screen.getByTestId('flip-card-container');
      const innerCard = screen.getByTestId('flip-card-inner');

      expect(innerCard.style.transform).toBe('rotateY(0deg)');

      // Click to flip
      fireEvent.click(flipContainer);
      expect(innerCard.style.transform).toBe('rotateY(180deg)');

      // Click again to flip back
      fireEvent.click(flipContainer);
      expect(innerCard.style.transform).toBe('rotateY(0deg)');
    });

    it('should have 3D perspective and backface-visibility hidden configured', () => {
      render(<FlashcardPlayer cards={mockCards} />);

      const container = screen.getByTestId('flip-card-container');
      expect(container.style.perspective).toBe('1000px');

      const frontFace = screen.getByTestId('card-front');
      expect(frontFace.style.backfaceVisibility).toBe('hidden');
    });
  });

  describe('AC-FC-02: Keyboard Navigation & Hotkeys', () => {
    it('should flip card when Space key is pressed', () => {
      render(<FlashcardPlayer cards={mockCards} />);
      const innerCard = screen.getByTestId('flip-card-inner');

      expect(innerCard.style.transform).toBe('rotateY(0deg)');
      fireEvent.keyDown(window, { code: 'Space' });
      expect(innerCard.style.transform).toBe('rotateY(180deg)');
    });

    it('should navigate to next card with ArrowRight and previous with ArrowLeft', () => {
      render(<FlashcardPlayer cards={mockCards} />);

      expect(screen.getByText('Photosynthesis')).toBeDefined();

      fireEvent.keyDown(window, { code: 'ArrowRight' });
      expect(screen.getByText('Mitochondria')).toBeDefined();
      expect(screen.getByText('Thẻ 2 / 2')).toBeDefined();

      fireEvent.keyDown(window, { code: 'ArrowLeft' });
      expect(screen.getByText('Photosynthesis')).toBeDefined();
    });

    it('should trigger onStarToggle when KeyS is pressed', () => {
      const onStarToggle = vi.fn();
      render(<FlashcardPlayer cards={mockCards} onStarToggle={onStarToggle} />);

      fireEvent.keyDown(window, { code: 'KeyS' });
      expect(onStarToggle).toHaveBeenCalledWith('card-1');
    });

    it('should invoke TTS speak method when audio button is clicked', () => {
      const speakSpy = vi
        .spyOn(TtsSpeechService, 'speak')
        .mockResolvedValue(true);
      render(<FlashcardPlayer cards={mockCards} termLang="en" defLang="vi" />);

      const speakBtn = screen.getByTestId('tts-speak-button');
      fireEvent.click(speakBtn);

      expect(speakSpy).toHaveBeenCalledWith('Photosynthesis', 'en');
    });
  });
});
