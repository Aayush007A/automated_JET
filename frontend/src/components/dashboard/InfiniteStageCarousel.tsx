import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useAnimationFrame, animate } from 'motion/react';
import {
  UploadCloud, Table, Sparkles, Sliders, Activity, BarChart3,
  CheckCircle2, ChevronLeft, ChevronRight, ArrowRight, LucideIcon
} from 'lucide-react';

interface StageItem {
  id: number;
  stageNumber: string;
  title: string;
  desc: string;
  capability: string;
  accent: string;
  chipBg: string;
  chipColor: string;
  icon: LucideIcon;
}

const STAGES_DATA: StageItem[] = [
  {
    id: 1,
    stageNumber: '01',
    title: 'Data Upload & Smart Ingestion',
    desc: 'Universal dropzone accepting CSVs or multi-sheet Excel workbooks with instant format detection.',
    capability: 'Automated Routing',
    accent: '#007680',
    chipBg: 'rgba(0, 163, 173, 0.10)',
    chipColor: '#007680',
    icon: UploadCloud,
  },
  {
    id: 2,
    stageNumber: '02',
    title: 'File Preparation & Sheets',
    desc: 'Automatic sheet extraction, dataset assignment (TB, GL / Population, COA), and raw row previews.',
    capability: 'Multi-Sheet Aware',
    accent: '#2563EB',
    chipBg: '#EFF6FF',
    chipColor: '#2563EB',
    icon: Table,
  },
  {
    id: 3,
    stageNumber: '03',
    title: 'Automated Data Cleansing',
    desc: 'High-speed Polars SIMD normalization, ISO-8601 date parsing, whitespace trimming, & validations.',
    capability: 'SIMD Vector Engine',
    accent: '#16A34A',
    chipBg: '#F0FDF4',
    chipColor: '#16A34A',
    icon: Sparkles,
  },
  {
    id: 4,
    stageNumber: '04',
    title: 'Pre-Integrity Constraint Checks',
    desc: 'Deloitte canonical 4-phase field mapping, required column validation, and auto-mapping accuracy scoring.',
    capability: 'Canonical Model',
    accent: '#D97706',
    chipBg: '#FFFBEB',
    chipColor: '#D97706',
    icon: Sliders,
  },
  {
    id: 5,
    stageNumber: '05',
    title: 'Integrity Testing & Execution',
    desc: 'Trial Balance vs GL zero-sum balancing, IR 1–4 integrity checks, and live SSE execution stream tracking.',
    capability: 'Real-time Streaming',
    accent: '#7C3AED',
    chipBg: '#F5F3FF',
    chipColor: '#7C3AED',
    icon: Activity,
  },
  {
    id: 6,
    stageNumber: '06',
    title: 'Summary & Reconciliation',
    desc: '12 Parameter Exceptions (Ex 1–12), 20 Golden DQCs, visual analytics, and one-click ZIP download.',
    capability: 'Audit Deliverables',
    accent: '#0D9488',
    chipBg: 'rgba(13, 148, 136, 0.10)',
    chipColor: '#0D9488',
    icon: BarChart3,
  },
];

const CARD_WIDTH = 320;
const CARD_GAP = 20;
const CARD_PITCH = CARD_WIDTH + CARD_GAP; // 340px
const STAGES_COUNT = STAGES_DATA.length; // 6
const REPETITIONS = 4; // 24 cards in track
const TOTAL_CARDS = STAGES_COUNT * REPETITIONS; // 24
const CYCLE_WIDTH = STAGES_COUNT * CARD_PITCH; // 6 * 340 = 2040px

interface InfiniteStageCarouselProps {
  onSelectStage?: (stageId: number) => void;
  onLaunchWorkflow?: () => void;
}

export const InfiniteStageCarousel: React.FC<InfiniteStageCarouselProps> = ({
  onSelectStage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const x = useMotionValue(-CYCLE_WIDTH);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Continuous conveyor animation loop (~30px/sec)
  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || isPaused || isDragging || isAnimatingRef.current) return;

    const speed = 0.48;
    const currentX = x.get();
    let newX = currentX - speed * (delta / 16);

    if (newX <= -CYCLE_WIDTH * 2.5) {
      newX += CYCLE_WIDTH;
    } else if (newX >= -CYCLE_WIDTH * 0.5) {
      newX -= CYCLE_WIDTH;
    }
    x.set(newX);

    const centerOffset = containerWidth / 2;
    const activeCardFloat = (centerOffset - newX - CARD_WIDTH / 2) / CARD_PITCH;
    const activeCardIdx = Math.round(activeCardFloat);
    const normalizedStageIdx = ((activeCardIdx % STAGES_COUNT) + STAGES_COUNT) % STAGES_COUNT;

    if (normalizedStageIdx !== activeStageIndex) {
      setActiveStageIndex(normalizedStageIdx);
    }
  });

  const centerStage = useCallback(
    (targetStageIdx: number) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const currentX = x.get();
      const centerOffset = containerWidth / 2;
      const currentFloat = (centerOffset - currentX - CARD_WIDTH / 2) / CARD_PITCH;
      const currentCardIdx = Math.round(currentFloat);
      const curNorm = ((currentCardIdx % STAGES_COUNT) + STAGES_COUNT) % STAGES_COUNT;
      let diff = targetStageIdx - curNorm;

      if (diff > 3) diff -= 6;
      if (diff < -3) diff += 6;

      const targetCardIdx = currentCardIdx + diff;
      const targetX = centerOffset - targetCardIdx * CARD_PITCH - CARD_WIDTH / 2;

      animate(x, targetX, {
        type: 'spring',
        stiffness: 210,
        damping: 26,
        onComplete: () => {
          let endX = x.get();
          while (endX <= -CYCLE_WIDTH * 2) endX += CYCLE_WIDTH;
          while (endX >= -CYCLE_WIDTH) endX -= CYCLE_WIDTH;
          x.set(endX);

          setActiveStageIndex(targetStageIdx);
          isAnimatingRef.current = false;
        },
      });
    },
    [containerWidth, x]
  );

  const handleNext = () => {
    const nextIdx = (activeStageIndex + 1) % STAGES_COUNT;
    centerStage(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (activeStageIndex - 1 + STAGES_COUNT) % STAGES_COUNT;
    centerStage(prevIdx);
  };

  // Static Fallback for Reduced Motion
  if (prefersReducedMotion) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '18px',
        width: '100%',
      }}>
        {STAGES_DATA.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              style={{
                borderRadius: '20px',
                background: '#FFFFFF',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.04)',
                position: 'relative',
                overflow: 'hidden',
                padding: '18px 20px 16px 20px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '200px',
              }}
            >
              {/* Delicate Top Color Accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stage.accent }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: stage.chipBg, color: stage.chipColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontSize: '0.70rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: '#F1F5F9', color: '#475569' }}>
                  Stage {stage.stageNumber}
                </span>
              </div>

              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 4px', lineHeight: 1.25 }}>
                {stage.title}
              </h3>
              <div style={{ width: '20px', height: '2px', borderRadius: '2px', background: stage.accent, marginBottom: '6px' }} />

              <p style={{ fontSize: '0.79rem', color: '#64748B', lineHeight: 1.48, margin: '0 0 12px', flex: 1 }}>
                {stage.desc}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stage.accent }}>{stage.capability}</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: stage.accent }}>{stage.stageNumber}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const repeatedCards = Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    ...STAGES_DATA[i % STAGES_COUNT],
    uniqueKey: `stage-conveyor-${i}`,
    indexInTrack: i,
    stageIndex: i % STAGES_COUNT,
  }));

  return (
    <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
      
      {/* ── Carousel Viewport with Soft Edge Fade Masks ── */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          overflow: 'hidden',
          padding: '14px 0 18px',
          maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, transparent 100%)',
        }}
      >
        {/* Continuous Horizontal Card Conveyor Track */}
        <motion.div
          style={{
            x,
            display: 'flex',
            gap: `${CARD_GAP}px`,
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {repeatedCards.map((card) => {
            const Icon = card.icon;
            const isCenterActive = card.stageIndex === activeStageIndex;

            return (
              <motion.div
                key={card.uniqueKey}
                onClick={(e) => {
                  e.stopPropagation();
                  centerStage(card.stageIndex);
                  if (onSelectStage) onSelectStage(card.id);
                }}
                animate={{
                  scale: isCenterActive ? 1.025 : 0.95,
                  opacity: isCenterActive ? 1 : 0.82,
                  y: isCenterActive ? -3 : 0,
                }}
                transition={{
                  duration: 0.32,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: `${CARD_WIDTH}px`,
                  minHeight: '202px',
                  maxHeight: '210px',
                  background: '#FFFFFF',
                  borderRadius: '22px',
                  border: isCenterActive
                    ? `1px solid ${card.accent}`
                    : '1px solid rgba(226, 232, 240, 0.85)',
                  padding: '18px 20px 15px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCenterActive
                    ? `0 14px 32px -6px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(0, 0, 0, 0.02)`
                    : '0 4px 16px -2px rgba(15, 23, 42, 0.03), 0 1px 4px rgba(0, 0, 0, 0.01)',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                }}
              >
                {/* Soft Top Color Line Accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: isCenterActive ? '3.5px' : '2.5px',
                    background: card.accent,
                    transition: 'height 0.25s ease',
                  }}
                />

                {/* Card Inner Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 1 }}>
                  
                  {/* Top Row: Icon Chip + Stage Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: card.chipBg,
                        color: card.chipColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isCenterActive ? `0 2px 6px ${card.chipBg}` : 'none',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: isCenterActive ? card.chipBg : '#F1F5F9',
                        color: isCenterActive ? card.accent : '#64748B',
                        letterSpacing: '0.03em',
                        fontFamily: 'var(--font-mono, monospace)',
                      }}
                    >
                      Stage {card.stageNumber}
                    </span>
                  </div>

                  {/* Stage Title */}
                  <h3
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      letterSpacing: '-0.02em',
                      margin: 0,
                      marginBottom: '3px',
                      lineHeight: 1.25,
                    }}
                  >
                    {card.title}
                  </h3>

                  {/* Soft Color Bar */}
                  <div
                    style={{
                      width: '20px',
                      height: '2px',
                      borderRadius: '2px',
                      background: card.accent,
                      marginBottom: '6px',
                    }}
                  />

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      lineHeight: 1.48,
                      margin: 0,
                      marginBottom: '10px',
                      flex: 1,
                      fontWeight: 400,
                    }}
                  >
                    {card.desc}
                  </p>

                  {/* Bottom Row: Capability + Stage Number & Arrow */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '7px',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: card.accent,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={12} color="#16A34A" />
                      {card.capability}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          color: card.accent,
                          letterSpacing: '0.02em',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {card.stageNumber}
                      </span>
                      <ArrowRight size={12} color="#94A3B8" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Subtle Floating Navigation Chevrons */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Previous Stage"
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0F172A',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.color = '#007680';
            e.currentTarget.style.borderColor = '#007680';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next Stage"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#0F172A',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.color = '#007680';
            e.currentTarget.style.borderColor = '#007680';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
};
