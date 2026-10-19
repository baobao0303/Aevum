import {
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  StarIcon,
  VolumePanelIcon,
} from '@blocksuite/icons/rc';
import { cssVarV2 } from '@toeverything/theme/v2';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { TermCardModel } from '../models/study-set.model';
import { TtsSpeechService } from '../services/tts-speech.service';

export interface FlashcardPlayerProps {
  cards: TermCardModel[];
  termLang?: string;
  defLang?: string;
  onStarToggle?: (cardId: string) => void;
  className?: string;
}

export const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({
  cards,
  termLang = 'en',
  defLang = 'vi',
  onStarToggle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);

  const displayCards = useMemo(() => {
    if (!filterStarredOnly) return cards;
    const starred = cards.filter(c => c.isStarred);
    return starred.length > 0 ? starred : cards;
  }, [cards, filterStarredOnly]);

  const currentCard = displayCards[currentIndex] || displayCards[0];

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < displayCards.length - 1 ? prev + 1 : 0));
  }, [displayCards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : displayCards.length - 1));
  }, [displayCards.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleStar = useCallback(() => {
    if (!currentCard) return;
    onStarToggle?.(currentCard.id);
  }, [currentCard, onStarToggle]);

  const handleSpeak = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!currentCard) return;
      const text = isFlipped ? currentCard.definition : currentCard.term;
      const lang = isFlipped ? defLang : termLang;
      TtsSpeechService.speak(text, lang).catch(() => {});
    },
    [currentCard, isFlipped, termLang, defLang]
  );

  // Global hotkeys listener (Space, Arrows, KeyS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown'
      ) {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleStar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleStar]);

  if (!displayCards || displayCards.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          background: cssVarV2('layer/background/secondary'),
          borderRadius: '8px',
          border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
        }}
      >
        <p
          style={{
            color: cssVarV2('text/secondary'),
            fontWeight: 500,
            margin: 0,
            fontSize: '13px',
          }}
        >
          Không có thẻ ghi nhớ nào trong học phần này.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        userSelect: 'none',
      }}
      data-testid="flashcard-player"
    >
      {/* Top toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '14px',
          padding: '0 4px',
          fontSize: '14px',
          color: cssVarV2('text/secondary'),
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: '18px',
            color: cssVarV2('text/primary'),
          }}
        >
          Thẻ {currentIndex + 1} / {displayCards.length}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setFilterStarredOnly(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              background: filterStarredOnly
                ? 'rgba(245, 158, 11, 0.12)'
                : cssVarV2('layer/background/secondary'),
              color: filterStarredOnly ? '#f59e0b' : cssVarV2('text/secondary'),
              border: filterStarredOnly
                ? '1px solid rgba(245, 158, 11, 0.3)'
                : `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <StarIcon
              width={16}
              height={16}
              style={{
                color: filterStarredOnly
                  ? '#f59e0b'
                  : cssVarV2('text/secondary'),
              }}
            />
            <span>Chỉ thẻ gắn sao</span>
          </button>
          <button
            type="button"
            onClick={handleSpeak}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px 12px',
              borderRadius: '8px',
              background: cssVarV2('layer/background/secondary'),
              border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              color: cssVarV2('text/secondary'),
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Phát âm (TTS)"
            data-testid="tts-speak-button"
          >
            <VolumePanelIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        style={{
          perspective: '1000px',
          width: '100%',
          height: '460px',
          cursor: 'pointer',
        }}
        onClick={handleFlip}
        data-testid="flip-card-container"
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            boxShadow:
              '0 12px 36px -4px rgba(0, 0, 0, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.06)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          data-testid="flip-card-inner"
        >
          {/* Mặt trước: Thuật ngữ (Term) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '36px 48px',
              backgroundColor: cssVarV2('layer/background/primary'),
              border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              borderRadius: '16px',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxSizing: 'border-box',
            }}
            data-testid="card-front"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                color: cssVarV2('text/primary'),
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              <span>Thuật ngữ ({termLang.toUpperCase()})</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleStar();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: currentCard.isStarred
                    ? '#f59e0b'
                    : cssVarV2('text/disable'),
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'color 0.15s',
                }}
                data-testid="star-toggle-button"
              >
                <StarIcon width={26} height={26} />
              </button>
            </div>

            <div
              style={{
                margin: 'auto 0',
                textAlign: 'center',
                padding: '0 24px',
              }}
            >
              <h2
                style={{
                  fontSize: '52px',
                  fontWeight: 700,
                  color: cssVarV2('text/primary'),
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}
              >
                {currentCard.term}
              </h2>
              {currentCard.imageUrl && (
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.term}
                  style={{
                    marginTop: '20px',
                    maxHeight: '160px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              )}
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: '15px',
                color: cssVarV2('text/secondary'),
                fontWeight: 500,
              }}
            >
              Nhấn phím Cách hoặc nhấp chuột để lật thẻ
            </div>
          </div>

          {/* Mặt sau: Định nghĩa (Definition) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '36px 48px',
              backgroundColor: cssVarV2('layer/background/secondary'),
              border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              borderRadius: '16px',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxSizing: 'border-box',
            }}
            data-testid="card-back"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '15px',
                color: '#3b82f6',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              <span>Định nghĩa ({defLang.toUpperCase()})</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleStar();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: currentCard.isStarred
                    ? '#f59e0b'
                    : cssVarV2('text/disable'),
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'color 0.15s',
                }}
              >
                <StarIcon width={26} height={26} />
              </button>
            </div>

            <div
              style={{
                margin: 'auto 0',
                textAlign: 'center',
                padding: '0 24px',
              }}
            >
              <p
                style={{
                  fontSize: '36px',
                  color: cssVarV2('text/primary'),
                  lineHeight: 1.4,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {currentCard.definition}
              </p>
            </div>

            <div
              style={{
                textAlign: 'center',
                fontSize: '15px',
                color: cssVarV2('text/secondary'),
                fontWeight: 500,
              }}
            >
              Nhấn phím Cách hoặc nhấp chuột để lật lại
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '22px',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              background: cssVarV2('layer/background/secondary'),
              color: cssVarV2('text/primary'),
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.12s',
            }}
            title="Thẻ trước (Mũi tên Trái)"
            data-testid="prev-card-button"
          >
            <ArrowLeftSmallIcon width={26} height={26} />
          </button>

          <button
            type="button"
            onClick={handleFlip}
            style={{
              height: '48px',
              padding: '0 36px',
              borderRadius: '8px',
              backgroundColor: cssVarV2('button/primary'),
              color: cssVarV2('button/pureWhiteText'),
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.12s',
            }}
            data-testid="flip-button"
          >
            {isFlipped ? 'Xem thuật ngữ' : 'Xem định nghĩa'}
          </button>

          <button
            type="button"
            onClick={handleNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              background: cssVarV2('layer/background/secondary'),
              color: cssVarV2('text/primary'),
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.12s',
            }}
            title="Thẻ tiếp theo (Mũi tên Phải)"
            data-testid="next-card-button"
          >
            <ArrowRightSmallIcon width={26} height={26} />
          </button>
        </div>

        <div
          style={{
            fontSize: '13.5px',
            color: cssVarV2('text/secondary'),
            fontWeight: 500,
          }}
        >
          Phím tắt: [Space] Lật thẻ • [← / →] Chuyển thẻ • [S] Gắn sao
        </div>
      </div>
    </div>
  );
};
