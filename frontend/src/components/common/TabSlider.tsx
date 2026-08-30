import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabSliderProps {
  children: React.ReactNode;
  scrollStep?: number;
  gap?: number;
  className?: string;
  containerStyle?: React.CSSProperties;
  trackStyle?: React.CSSProperties;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  activeId?: string | number;
}

/**
 * Premium horizontal TabSlider that switches active tabs on Prev/Next
 * and provides smooth centered scrolling with edge fade masks.
 */
export const TabSlider: React.FC<TabSliderProps> = ({
  children,
  scrollStep = 260,
  gap = 6,
  className = '',
  containerStyle = {},
  trackStyle = {},
  onPrev,
  onNext,
  canPrev,
  canNext,
  activeId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isControlledNavigation = Boolean(onPrev && onNext);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => checkScrollability();
    el.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkScrollability, children]);

  // Auto-scroll active item into center view whenever activeId changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId, children]);

  const handlePrevClick = () => {
    if (onPrev) {
      onPrev();
    } else if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    }
  };

  const handleNextClick = () => {
    if (onNext) {
      onNext();
    } else if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  };

  const prevDisabled = isControlledNavigation ? (canPrev === false) : !canScrollLeft;
  const nextDisabled = isControlledNavigation ? (canNext === false) : !canScrollRight;

  return (
    <div
      className={`tab-slider-wrapper ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        position: 'relative',
        ...containerStyle,
      }}
    >
      {/* PREVIOUS BUTTON */}
      <button
        type="button"
        onClick={handlePrevClick}
        disabled={prevDisabled}
        aria-label="Previous Tab"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          color: !prevDisabled ? '#0F172A' : '#CBD5E1',
          opacity: !prevDisabled ? 1 : 0.45,
          cursor: !prevDisabled ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: !prevDisabled ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
          transition: 'all 0.18s ease',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          if (!prevDisabled) {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.transform = 'scale(1.04)';
          }
        }}
        onMouseLeave={(e) => {
          if (!prevDisabled) {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {/* TRACK VIEWPORT CONTAINER WITH FADE MASKS */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        {/* Left Fade Mask */}
        {canScrollLeft && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '28px',
              background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0))',
              zIndex: 1,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease',
            }}
          />
        )}

        {/* Right Fade Mask */}
        {canScrollRight && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '28px',
              background: 'linear-gradient(to left, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0))',
              zIndex: 1,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease',
            }}
          />
        )}

        {/* SCROLLING TRACK */}
        <div
          ref={scrollRef}
          className="no-scrollbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${gap}px`,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            padding: '4px 2px',
            width: '100%',
            ...trackStyle,
          }}
        >
          {children}
        </div>
      </div>

      {/* NEXT BUTTON */}
      <button
        type="button"
        onClick={handleNextClick}
        disabled={nextDisabled}
        aria-label="Next Tab"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          color: !nextDisabled ? '#0F172A' : '#CBD5E1',
          opacity: !nextDisabled ? 1 : 0.45,
          cursor: !nextDisabled ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: !nextDisabled ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none',
          transition: 'all 0.18s ease',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          if (!nextDisabled) {
            e.currentTarget.style.background = '#F8FAFC';
            e.currentTarget.style.borderColor = '#94A3B8';
            e.currentTarget.style.transform = 'scale(1.04)';
          }
        }}
        onMouseLeave={(e) => {
          if (!nextDisabled) {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
