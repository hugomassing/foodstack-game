import { useEffect, useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useMutation } from 'convex/react';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { gameStore } from '../store/gameStore';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { Trophy, RotateCcw, Download, ArrowRight, Heart, Home, ClipboardList, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { TranslationKeys } from '../i18n/types';
import { setDailyBestScore, incrementDailyAttempts } from '../lib/daily';
import type { Difficulty } from '../store/gameStore';
import type { GameMode } from '../types';

const TROPHY_EMOJIS = ['\u{1F3C6}', '\u{1F3A8}', '\u2728', '\u{1F37D}\uFE0F', '\u{1F4F8}', '\u{1F947}'];

export const DIFFICULTY_LABELS = {
  easy: {
    labelKey: 'menu.difficulty.easy' as TranslationKeys,
    color: '#4caf50',
  },
  medium: {
    labelKey: 'menu.difficulty.medium' as TranslationKeys,
    color: '#ff9800',
  },
  hard: {
    labelKey: 'menu.difficulty.hard' as TranslationKeys,
    color: '#e53935',
  },
} as const;

function StatRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#e8d5b4',
        borderRadius: 10,
        padding: '7px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          background: '#cbb48a',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#8d6040',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: FONT_FAMILY,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: '#3e2723',
            lineHeight: 1.2,
            fontFamily: FONT_FAMILY,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export interface VictoryCardData {
  dishName: string;
  difficulty: Difficulty;
  stepCount: number;
  totalSteps: number;
  errorCount: number;
  gameMode: GameMode;
  victoryImageUrl: string | null;
  victoryImageLoading?: boolean;
  survivalRound?: number;
  survivalLives?: number;
  onRetry?: () => void;
}

/** The sharable card visual — no buttons, no store coupling. */
export function VictoryCard({
  data,
  cardRef,
}: {
  data: VictoryCardData;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const loading = data.victoryImageLoading ?? false;
  const hasImage = !!data.victoryImageUrl;
  const showFallback = !loading && !hasImage;
  const diffConfig = DIFFICULTY_LABELS[data.difficulty];
  const trophyText = t(`victory.trophyMessages.${msgIndex}` as TranslationKeys);
  const trophyEmoji = TROPHY_EMOJIS[msgIndex];

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % TROPHY_EMOJIS.length);
        setFading(false);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div
      ref={cardRef}
      style={{
        width: 580,
        height: 326,
        background: '#f5edd8',
        borderRadius: 20,
        border: '3px solid #5d3a1a',
        boxShadow: '0 8px 0 #3e2723',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
      }}
    >
      {/* Decorative inner frame */}
      <div
        style={{
          position: 'absolute',
          inset: 7,
          border: '1px solid rgba(93, 58, 26, 0.28)',
          borderRadius: 14,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {/* Corner ornaments */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
        <div
          key={pos}
          style={{
            position: 'absolute',
            fontSize: 13,
            color: '#5d3a1a',
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 11,
            lineHeight: 1,
            ...(pos === 'tl'
              ? { top: 4, left: 6 }
              : pos === 'tr'
                ? { top: 4, right: 6 }
                : pos === 'bl'
                  ? { bottom: 4, left: 6 }
                  : { bottom: 4, right: 6 }),
          }}
        >
          ✦
        </div>
      ))}

      {/* Image area (left side) */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background: '#f5edd8',
        }}
      >
        {/* Loading shimmer */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              background:
                'linear-gradient(90deg, #f5edd8 25%, #fdf5e4 50%, #f5edd8 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s ease-in-out infinite',
            }}
          >
            <div
              style={{
                fontSize: 48,
                animation: 'trophySpin 1.6s ease-in-out infinite',
                transition: 'opacity 0.3s',
                opacity: fading ? 0 : 1,
              }}
            >
              {trophyEmoji}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#5d4037',
                fontFamily: FONT_FAMILY,
                transition: 'opacity 0.3s',
                opacity: fading ? 0 : 1,
              }}
            >
              {trophyText}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#c8a265',
                    border: '2px solid #3e2723',
                    animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI-generated image */}
        {hasImage && (
          <img
            src={data.victoryImageUrl!}
            crossOrigin="anonymous"
            alt="Victory trophy"
            onLoad={() => setImageLoaded(true)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.6s ease-in',
            }}
          />
        )}

        {/* Fallback */}
        {showFallback && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {data.onRetry ? (
              <>
                <div style={{ fontSize: 36, lineHeight: 1 }}>⚠️</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#8d6e63',
                    textAlign: 'center',
                    padding: '0 20px',
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  Image generation failed
                </div>
                <button
                  onClick={data.onRetry}
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: '#ffffff',
                    background: '#ff9800',
                    border: '2px solid #3e2723',
                    borderRadius: 10,
                    padding: '6px 16px',
                    cursor: 'pointer',
                    fontFamily: FONT_FAMILY,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    letterSpacing: '0.04em',
                  }}
                >
                  <RotateCcw size={13} strokeWidth={3} />
                  RETRY
                </button>
              </>
            ) : (
              <>
                <Trophy size={64} strokeWidth={1.5} color="#c8a265" />
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: '#4caf50',
                    letterSpacing: '0.06em',
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  {t('victory.youWin')}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info panel (right side) */}
      <div
        style={{
          flex: 1,
          padding: '18px 16px 18px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 7,
        }}
      >
        {/* Dish name */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: '#3e2723',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            marginBottom: 2,
            fontFamily: FONT_FAMILY,
          }}
        >
          {data.dishName}
        </div>

        {/* Completion */}
        <StatRow
          icon={<ClipboardList size={20} strokeWidth={2} color="#5d3a1a" />}
          label="COMPLETION"
        >
          {t('victory.steps', { current: data.stepCount, total: data.totalSteps }).toUpperCase()}
        </StatRow>

        {/* Difficulty */}
        <StatRow
          icon={<span style={{ fontSize: 18, lineHeight: 1 }}>🌶️</span>}
          label="DIFFICULTY"
        >
          <span
            style={{
              display: 'inline-block',
              background: diffConfig.color,
              color: '#fff',
              borderRadius: 20,
              padding: '1px 10px',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '0.06em',
              fontFamily: FONT_FAMILY,
            }}
          >
            {t(diffConfig.labelKey).toUpperCase()}
          </span>
        </StatRow>

        {/* Errors */}
        <StatRow
          icon={<X size={20} strokeWidth={3} color="#5d3a1a" />}
          label="ERRORS"
        >
          {t('victory.errors', { count: data.errorCount }).toUpperCase()}
        </StatRow>

        {/* Survival-specific row */}
        {data.gameMode === 'survival' && data.survivalRound !== undefined && (
          <StatRow
            icon={<Heart size={18} strokeWidth={2} fill="#e53935" color="#e53935" />}
            label="SURVIVAL"
          >
            {t('survival.round', { round: data.survivalRound })}
            {data.survivalLives !== undefined && ` · ${data.survivalLives}♥`}
          </StatRow>
        )}
      </div>
    </div>
  );
}

export function VictoryOverlay() {
  const victoryDish = useGameStore((s) => s.victoryDish);
  const difficulty = useGameStore((s) => s.difficulty);
  const puzzleData = useGameStore((s) => s.puzzleData);
  const stepCount = useGameStore((s) => s.stepCount);
  const totalSteps = useGameStore((s) => s.totalSteps);
  const victoryImageUrl = useGameStore((s) => s.victoryImageUrl);
  const victoryImageLoading = useGameStore((s) => s.victoryImageLoading);
  const errorCount = useGameStore((s) => s.errorCount);
  const gameMode = useGameStore((s) => s.gameMode);
  const survivalLives = useGameStore((s) => s.survivalLives);
  const survivalRound = useGameStore((s) => s.survivalRound);
  const dailyDate = useGameStore((s) => s.dailyDate);

  const [show, setShow] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const { t } = useTranslation();

  const cardRef = useRef<HTMLDivElement>(null);

  // Save daily best score
  useEffect(() => {
    if (gameMode === 'daily' && dailyDate) {
      setDailyBestScore(dailyDate, errorCount);
      incrementDailyAttempts(dailyDate);
    }
  }, [gameMode, dailyDate, errorCount]);
  const savedRef = useRef(false);
  const saveResult = useMutation(api.gameResults.saveResult);

  // Save game result on mount (once)
  useEffect(() => {
    if (savedRef.current || !victoryDish) return;
    savedRef.current = true;
    saveResult({
      dishName: victoryDish,
      difficulty,
      gameMode,
      stepCount,
      totalSteps,
      errorCount,
    }).catch(() => {
      // Silent — don't block the victory experience
    });
  }, [victoryDish, difficulty, stepCount, totalSteps, errorCount, saveResult]);

  // Animate in
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setShowBtn(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Image generation — extracted so it can be called on initial mount and on retry
  const generateImage = useCallback(() => {
    if (!victoryDish || !puzzleData) return;

    const ingredients = puzzleData.ingredients.map((i) => i.name);
    gameStore.getState().setVictoryImage(null, true);

    convex
      .action(api.generator.generateVictoryCard, {
        dishName: victoryDish,
        difficulty,
        ingredients,
      })
      .then((url) => {
        gameStore.getState().setVictoryImage(url as string | null, false);
      })
      .catch(() => {
        gameStore.getState().setVictoryImage(null, false);
      });
  }, [victoryDish, difficulty, puzzleData]);

  // Generate on mount
  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${victoryDish || 'victory'}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silent fail
    }
  }, [victoryDish]);

  const handlePlayAgain = () => {
    if (gameMode === 'survival') {
      gameStore.getState().completeSurvivalRecipe();
    } else if (gameMode === 'daily') {
      const data = gameStore.getState().puzzleData;
      if (data) {
        gameStore.getState().startGame(data, difficulty);
      }
    } else {
      gameStore.getState().resetGameplay();
    }
  };

  const playAgainLabel =
    gameMode === 'survival'
      ? t('survival.continue')
      : t('victory.playAgain');

  const PlayAgainIcon = gameMode === 'survival' ? ArrowRight : RotateCcw;

  if (!victoryDish) return null;

  const cardData: VictoryCardData = {
    dishName: victoryDish,
    difficulty,
    stepCount,
    totalSteps,
    errorCount,
    gameMode,
    victoryImageUrl,
    victoryImageLoading,
    survivalRound,
    survivalLives,
    onRetry: generateImage,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GAME_W,
        height: GAME_H,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes trophySpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(8deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-8deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes loadingDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          transform: show ? 'translateY(0) scale(1)' : 'translateY(-100px) scale(0.8)',
          opacity: show ? 1 : 0,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <VictoryCard data={cardData} cardRef={cardRef} />

        {/* Buttons (below card, not captured) */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            opacity: showBtn ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          <button
            onClick={handleDownload}
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#ffffff',
              background: '#29b6f6',
              border: '3px solid #3e2723',
              borderRadius: 12,
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: FONT_FAMILY,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              letterSpacing: '0.04em',
            }}
          >
            <Download size={16} strokeWidth={3} />
            {t('victory.saveCard')}
          </button>
          <button
            onClick={handlePlayAgain}
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#ffffff',
              background: '#4caf50',
              border: '3px solid #3e2723',
              borderRadius: 12,
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: FONT_FAMILY,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              letterSpacing: '0.04em',
            }}
          >
            <PlayAgainIcon size={16} strokeWidth={3} />
            {playAgainLabel}
          </button>
          {gameMode !== 'survival' && (
            <button
              onClick={() => gameStore.getState().resetGameplay()}
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#ffffff',
                background: '#8d6e63',
                border: '3px solid #3e2723',
                borderRadius: 12,
                padding: '10px 20px',
                cursor: 'pointer',
                fontFamily: FONT_FAMILY,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '0.04em',
              }}
            >
              <Home size={16} strokeWidth={3} />
              {t('gameOver.backToMenu')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
