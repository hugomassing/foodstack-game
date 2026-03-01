import { useEffect, useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useMutation } from 'convex/react';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { gameStore } from '../store/gameStore';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { Trophy, RotateCcw, Download, ArrowRight, Heart, Home } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { TranslationKeys } from '../i18n/types';
import { setDailyBestScore } from '../lib/daily';

const TROPHY_EMOJIS = ['\u{1F3C6}', '\u{1F3A8}', '\u2728', '\u{1F37D}\uFE0F', '\u{1F4F8}', '\u{1F947}'];

const DIFFICULTY_LABELS = {
  easy: {
    labelKey: 'menu.difficulty.easy' as TranslationKeys,
    icon: '\u{1F336}\uFE0F',
    color: '#4caf50',
  },
  medium: {
    labelKey: 'menu.difficulty.medium' as TranslationKeys,
    icon: '\u{1F336}\uFE0F\u{1F336}\uFE0F',
    color: '#ff9800',
  },
  hard: {
    labelKey: 'menu.difficulty.hard' as TranslationKeys,
    icon: '\u{1F336}\uFE0F\u{1F336}\uFE0F\u{1F336}\uFE0F',
    color: '#e53935',
  },
} as const;

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const { t } = useTranslation();

  const cardRef = useRef<HTMLDivElement>(null);

  // Save daily best score
  useEffect(() => {
    if (gameMode === 'daily' && dailyDate) {
      setDailyBestScore(dailyDate, errorCount);
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

  // Rotating loading messages
  useEffect(() => {
    if (!victoryImageLoading) return;
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % TROPHY_EMOJIS.length);
        setFading(false);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, [victoryImageLoading]);

  // Request victory card image on mount
  useEffect(() => {
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
      // Retry same daily - re-start game with same puzzle
      const data = gameStore.getState().puzzleData;
      if (data) {
        gameStore.getState().startGame(data, difficulty);
      }
    } else {
      gameStore.getState().resetGameplay();
    }
  };
  const diffConfig = DIFFICULTY_LABELS[difficulty];
  const trophyText = t(`victory.trophyMessages.${msgIndex}` as TranslationKeys);
  const trophyEmoji = TROPHY_EMOJIS[msgIndex];
  const hasImage = !!victoryImageUrl;
  const showFallback = !victoryImageLoading && !hasImage;

  const playAgainLabel =
    gameMode === 'survival'
      ? t('survival.continue')
      : gameMode === 'daily'
        ? t('victory.playAgain')
        : t('victory.playAgain');

  const PlayAgainIcon = gameMode === 'survival' ? ArrowRight : RotateCcw;
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
        {/* Capturable card — horizontal 16:9 layout */}
        <div
          ref={cardRef}
          style={{
            width: 580,
            height: 326,
            background: '#fffaf0',
            borderRadius: 24,
            border: '4px solid #3e2723',
            boxShadow: '0 10px 0 #3e2723',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {/* Image area (square, left side) */}
          <div
            style={{
              width: 318,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
              background: '#f5f0e8',
            }}
          >
            {/* Loading shimmer */}
            {victoryImageLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  background: 'linear-gradient(90deg, #f5f0e8 25%, #faf5ed 50%, #f5f0e8 75%)',
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
                    fontSize: 14,
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
                        background: '#ffca28',
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
                src={victoryImageUrl}
                crossOrigin="anonymous"
                alt="Victory trophy"
                onLoad={() => setImageLoaded(true)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.6s ease-in',
                }}
              />
            )}

            {/* Fallback: static trophy icon */}
            {showFallback && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Trophy size={64} strokeWidth={1.5} color="#f1c40f" />
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: '#4caf50',
                    letterSpacing: '0.06em',
                  }}
                >
                  {t('victory.youWin')}
                </div>
              </div>
            )}
          </div>

          {/* Info panel (right side) */}
          <div
            style={{
              flex: 1,
              borderLeft: '3px solid #3e2723',
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {/* Dish name */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#3e2723',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {victoryDish}
            </div>

            {/* Difficulty badge + stats */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: '#ffffff',
                  background: diffConfig.color,
                  borderRadius: 6,
                  padding: '3px 8px',
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{diffConfig.icon}</span>
                <span>{t(diffConfig.labelKey)}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#8d6e63',
                }}
              >
                {t('victory.steps', { current: stepCount, total: totalSteps })}
              </div>
            </div>
            {/* Error count */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: errorCount > 0 ? '#e74c3c' : '#4caf50',
              }}
            >
              {t('victory.errors', { count: errorCount })}
            </div>

            {/* Survival-specific info */}
            {gameMode === 'survival' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#3e2723' }}>
                  {t('survival.round', { round: survivalRound })}
                </div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {Array.from({ length: Math.min(survivalLives, 10) }).map((_, i) => (
                    <Heart key={i} size={12} strokeWidth={2} fill="#e53935" color="#e53935" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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