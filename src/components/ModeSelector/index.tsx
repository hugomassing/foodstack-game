import { useState, useEffect, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  Calendar,
  Skull,
  Zap,
  Settings,
  Play,
  Lock as LockIcon,
  UtensilsCrossed,
  ChefHat,
  Flame,
  Pizza,
  Fish,
  Sandwich,
  Apple,
  Beef,
  Egg,
  Cherry,
  Cookie,
  IceCream2,
  Utensils,
  Wine,
  Coffee,
  Croissant,
  Carrot,
  Soup,
  Cake,
  Candy,
  Popcorn,
  Wheat,
  CupSoda,
  Drumstick,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { convex } from '../../lib/convex';
import { gameStore } from '../../store/gameStore';
import type { Difficulty } from '../../store/gameStore';
import { useGameStore } from '../../App';
import { FONT_FAMILY, TITLE_FONT_FAMILY } from '../../config';
import type { PuzzleData, GameMode } from '../../types';
import { useTranslation } from '../../i18n';
import {
  getDailyDishName,
  getDailyDate,
  getDailyBestScore,
  getDailyAttempts,
} from '../../lib/daily';
import { randomDishName } from '../../lib/dishName';
import { getWordlists } from '../../data/wordlists/index';
import { SPLASH_TEXTS } from './constants';
import { LoadingScreen } from './LoadingScreen';
import { DifficultySelector } from './DifficultySelector';
import { PushButton } from './PushButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ModeCard } from './ModeCard';
import { MainTabBar } from './MainTabBar';
import type { MainTab } from './MainTabBar';
import { ProfileBadge } from './ProfileBadge';
import { TrophyDexPanel } from './TrophyDexPanel';
import type { TrophyEntry } from './TrophyDexPanel';
import { LeaderboardPanel } from './LeaderboardPanel';
import { HistoryPanel } from './HistoryPanel';
import { VictoryCard } from '../VictoryOverlay';
import type { VictoryCardData } from '../VictoryOverlay';
import { Download, X, AlertTriangle, RotateCcw } from 'lucide-react';
import type { RealRecipe } from '../../../convex/realRecipeSchema';

const BG_ICONS = [
  UtensilsCrossed,
  ChefHat,
  Flame,
  Pizza,
  Fish,
  Sandwich,
  Apple,
  Beef,
  Egg,
  Cherry,
  Cookie,
  IceCream2,
  Utensils,
  Wine,
  Coffee,
  Croissant,
  Carrot,
  Soup,
  Cake,
  Candy,
  Popcorn,
  Wheat,
  CupSoda,
  Drumstick,
];

type ModeWithDifficulty = 'daily' | 'survival' | 'normal';

export function ModeSelector() {
  const [mainTab, setMainTab] = useState<MainTab>('modes');
  const { locale } = useTranslation();
  const isAnonymous = useGameStore((s) => s.isAnonymous);
  const setShowAuthModal = useGameStore((s) => s.setShowAuthModal);
  const [splashIdx, setSplashIdx] = useState(() => Math.floor(Math.random() * SPLASH_TEXTS.length));
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSplashFading(true);
      setTimeout(() => {
        setSplashIdx((i) => (i + 1) % SPLASH_TEXTS.length);
        setSplashFading(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingDishName, setLoadingDishName] = useState('');
  const [error, setError] = useState('');
  const [difficultyFor, setDifficultyFor] = useState<ModeWithDifficulty | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [trophyEntry, setTrophyEntry] = useState<TrophyEntry | null>(null);
  const trophyCardRef = useRef<HTMLDivElement>(null);
  const [realRecipe, setRealRecipe] = useState<RealRecipe | null>(null);
  const [realRecipeLoading, setRealRecipeLoading] = useState(false);
  const [realRecipeError, setRealRecipeError] = useState(false);
  const [showRecipeOverlay, setShowRecipeOverlay] = useState(false);

  const onSelectEntry = useCallback((entry: TrophyEntry) => setTrophyEntry(entry), []);

  const handleTrophyDownload = useCallback(async () => {
    if (!trophyCardRef.current || !trophyEntry) return;
    try {
      const dataUrl = await toPng(trophyCardRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${trophyEntry.dishName}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silent fail
    }
  }, [trophyEntry]);

  const handleGenerateRecipe = useCallback(async () => {
    if (!trophyEntry || realRecipeLoading) return;
    setRealRecipeLoading(true);
    setRealRecipeError(false);
    setShowRecipeOverlay(true);
    try {
      const recipe = await convex.action(api.generator.generateRealRecipe, {
        dishName: trophyEntry.dishName,
        locale,
      });
      setRealRecipe(recipe as RealRecipe);
    } catch {
      setRealRecipeError(true);
    } finally {
      setRealRecipeLoading(false);
    }
  }, [trophyEntry, realRecipeLoading, locale]);

  const dailyDate = getDailyDate();
  const dailyBest = getDailyBestScore(dailyDate);
  const dailyAttempts = getDailyAttempts(dailyDate);

  const { t } = useTranslation();

  const handleDownloadRecipe = useCallback(() => {
    if (!realRecipe || !trophyEntry) return;
    const lines: string[] = [];
    lines.push(`# ${realRecipe.title}`);
    lines.push('');
    lines.push(`> ${realRecipe.disclaimer}`);
    lines.push('');
    lines.push(realRecipe.description);
    lines.push('');
    lines.push(`- **${t('realRecipe.servings')}:** ${realRecipe.servings}`);
    lines.push(`- **${t('realRecipe.prepTime')}:** ${realRecipe.prepTime}`);
    lines.push(`- **${t('realRecipe.cookTime')}:** ${realRecipe.cookTime}`);
    lines.push('');
    lines.push(`## ${t('realRecipe.ingredients')}`);
    lines.push('');
    for (const ing of realRecipe.ingredients) {
      lines.push(`- ${ing.amount} ${ing.item}`);
    }
    lines.push('');
    lines.push(`## ${t('realRecipe.steps')}`);
    lines.push('');
    realRecipe.steps.forEach((step, i) => {
      const dur = step.duration ? ` *(${step.duration})*` : '';
      lines.push(`${i + 1}. ${step.instruction}${dur}`);
    });
    if (realRecipe.tips) {
      lines.push('');
      lines.push(`> **${t('realRecipe.tip')}:** ${realRecipe.tips}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${trophyEntry.dishName}-recipe.md`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [realRecipe, trophyEntry, t]);

  const startWithRecipe = async (dishName: string, diff: Difficulty, mode: GameMode) => {
    setIsLoading(true);
    setLoadingDishName(dishName);
    setError('');
    try {
      const puzzleData = await convex.action(api.generator.generateOrGetRecipe, {
        dishName,
        difficulty: diff,
        locale,
      });
      setIsLoading(false);
      gameStore.getState().selectMode(mode);
      if (mode === 'survival') {
        gameStore.setState({
          gameMode: 'survival',
          survivalLives: 10,
          survivalRound: 0,
          survivalHistory: [],
          difficulty: diff,
        });
        gameStore.getState().startSurvivalRound(puzzleData as PuzzleData, diff);
      } else {
        if (mode === 'daily') {
          gameStore.setState({ dailyDate });
        }
        gameStore.getState().startGame(puzzleData as PuzzleData, diff);
      }
    } catch (err) {
      setIsLoading(false);
      setError((err as Error).message);
    }
  };

  const onModeWithDifficulty = (mode: ModeWithDifficulty) => {
    if (isLoading) return;
    setDifficultyFor(mode);
  };

  const onConfirmDifficulty = () => {
    if (!difficultyFor || isLoading) return;
    if (difficultyFor === 'daily') {
      const dishName = getDailyDishName();
      gameStore.setState({ gameMode: 'daily', dailyDate });
      startWithRecipe(dishName, difficulty, 'daily');
    } else {
      const wl = getWordlists('en');
      const dishName = randomDishName(wl, 'en');
      gameStore.setState({ gameMode: difficultyFor });
      startWithRecipe(dishName, difficulty, difficultyFor);
    }
    setDifficultyFor(null);
  };

  const onSeeded = () => {
    if (isLoading) return;
    gameStore.getState().selectMode('seeded');
  };

  if (isLoading) {
    return <LoadingScreen dishName={loadingDishName} />;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontFamily: FONT_FAMILY,
        zIndex: 10,
        overflow: 'hidden',
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E") repeat, linear-gradient(145deg, #ff5252 0%, #c62828 55%, #7f0000 100%)`,
      }}
    >
      {/* Background food pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.18,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 40,
            padding: 24,
            height: '100%',
            width: '100%',
            transform: 'rotate(-5deg) scale(1.3)',
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const Icon = BG_ICONS[i % BG_ICONS.length];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={32} color="#ffffff" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Trophy card viewer overlay */}
      {trophyEntry &&
        (() => {
          const best = trophyEntry.bestResult;
          const cardData: VictoryCardData = {
            dishName: trophyEntry.dishName,
            difficulty: best?.difficulty ?? (trophyEntry.difficulties[0] as Difficulty) ?? 'medium',
            stepCount: best?.stepCount ?? 0,
            totalSteps: best?.totalSteps ?? 0,
            errorCount: best?.errorCount ?? 0,
            gameMode: (best?.gameMode ?? 'normal') as GameMode,
            victoryImageUrl: trophyEntry.victoryCardUrl,
            victoryImageLoading: false,
          };
          return (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.72)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
              <VictoryCard data={cardData} cardRef={trophyCardRef} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleTrophyDownload}
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
                  onClick={handleGenerateRecipe}
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
                  <ChefHat size={16} strokeWidth={3} />
                  {t('realRecipe.generate')}
                </button>
                <button
                  onClick={() => {
                    setTrophyEntry(null);
                    setRealRecipe(null);
                    setRealRecipeLoading(false);
                    setRealRecipeError(false);
                    setShowRecipeOverlay(false);
                  }}
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
                  <X size={16} strokeWidth={3} />
                  {t('modes.back')}
                </button>
              </div>

              {/* Real recipe overlay */}
              {showRecipeOverlay && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                  }}
                >
                  <style>{`
                    @keyframes recipeDots {
                      0%, 20% { opacity: 0; }
                      50% { opacity: 1; }
                      80%, 100% { opacity: 0; }
                    }
                  `}</style>
                  <div
                    style={{
                      background: '#fffaf0',
                      borderRadius: 20,
                      border: '4px solid #3e2723',
                      boxShadow: '0 8px 0 #3e2723',
                      maxWidth: 420,
                      width: '100%',
                      maxHeight: '100%',
                      fontFamily: FONT_FAMILY,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Scrollable content area */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px 24px 12px',
                        minHeight: 0,
                      }}
                    >
                      {/* Loading state */}
                      {realRecipeLoading && (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🍳</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#5d4037' }}>
                            {t('realRecipe.loading')}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: 4,
                              marginTop: 8,
                            }}
                          >
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: '#4caf50',
                                  animation: `recipeDots 1.4s ease-in-out ${i * 0.2}s infinite`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error state */}
                      {realRecipeError && !realRecipeLoading && (
                        <div
                          style={{ textAlign: 'center', padding: '48px 0', cursor: 'pointer' }}
                          onClick={handleGenerateRecipe}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#e53935',
                              marginBottom: 12,
                            }}
                          >
                            {t('realRecipe.error')}
                          </div>
                          <RotateCcw size={24} color="#e53935" />
                        </div>
                      )}

                      {/* Recipe content */}
                      {realRecipe && !realRecipeLoading && (
                        <>
                          {/* Disclaimer banner */}
                          <div
                            style={{
                              background: '#fff3e0',
                              border: '2px solid #ff9800',
                              borderRadius: 12,
                              padding: '10px 14px',
                              marginBottom: 16,
                              display: 'flex',
                              gap: 8,
                              alignItems: 'flex-start',
                            }}
                          >
                            <AlertTriangle
                              size={18}
                              color="#e65100"
                              style={{ flexShrink: 0, marginTop: 1 }}
                            />
                            <div
                              style={{
                                fontSize: 11,
                                color: '#e65100',
                                fontWeight: 600,
                                lineHeight: 1.4,
                              }}
                            >
                              {realRecipe.disclaimer}
                            </div>
                          </div>

                          {/* Title */}
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 900,
                              color: '#3e2723',
                              textAlign: 'center',
                              marginBottom: 4,
                            }}
                          >
                            {realRecipe.title}
                          </div>

                          {/* Description */}
                          <div
                            style={{
                              fontSize: 13,
                              color: '#5d4037',
                              textAlign: 'center',
                              marginBottom: 12,
                              lineHeight: 1.4,
                            }}
                          >
                            {realRecipe.description}
                          </div>

                          {/* Meta row */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: 16,
                              marginBottom: 16,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#8d6e63',
                            }}
                          >
                            <span>
                              🍽 {t('realRecipe.servings')}: {realRecipe.servings}
                            </span>
                            <span>
                              ⏱ {t('realRecipe.prepTime')}: {realRecipe.prepTime}
                            </span>
                            <span>
                              🔥 {t('realRecipe.cookTime')}: {realRecipe.cookTime}
                            </span>
                          </div>

                          {/* Ingredients */}
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: '#3e2723',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                marginBottom: 8,
                              }}
                            >
                              {t('realRecipe.ingredients')}
                            </div>
                            {realRecipe.ingredients.map((ing, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '4px 0',
                                  borderBottom:
                                    i < realRecipe.ingredients.length - 1
                                      ? '1px solid #efebe9'
                                      : 'none',
                                  fontSize: 13,
                                  color: '#5d4037',
                                }}
                              >
                                <span>{ing.item}</span>
                                <span style={{ fontWeight: 700, color: '#3e2723' }}>
                                  {ing.amount}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Steps */}
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: '#3e2723',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                marginBottom: 8,
                              }}
                            >
                              {t('realRecipe.steps')}
                            </div>
                            {realRecipe.steps.map((step, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  gap: 10,
                                  marginBottom: 10,
                                }}
                              >
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: '#4caf50',
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 900,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, color: '#5d4037', lineHeight: 1.4 }}>
                                    {step.instruction}
                                  </div>
                                  {step.duration && (
                                    <div style={{ fontSize: 11, color: '#8d6e63', marginTop: 2 }}>
                                      ⏱ {step.duration}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Chef's tip */}
                          {realRecipe.tips && (
                            <div
                              style={{
                                background: '#e8f5e9',
                                borderRadius: 12,
                                padding: '10px 14px',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: '#2e7d32',
                                  marginBottom: 4,
                                }}
                              >
                                💡 {t('realRecipe.tip')}
                              </div>
                              <div style={{ fontSize: 12, color: '#33691e', lineHeight: 1.4 }}>
                                {realRecipe.tips}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Fixed bottom buttons */}
                    <div
                      style={{
                        padding: '12px 24px 16px',
                        borderTop: '2px solid #efebe9',
                        display: 'flex',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {realRecipe && !realRecipeLoading && (
                        <button
                          onClick={handleDownloadRecipe}
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 900,
                            color: '#ffffff',
                            background: '#29b6f6',
                            border: '3px solid #3e2723',
                            borderRadius: 12,
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontFamily: FONT_FAMILY,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            letterSpacing: '0.04em',
                          }}
                        >
                          <Download size={15} strokeWidth={3} />
                          {t('realRecipe.download')}
                        </button>
                      )}
                      <button
                        onClick={() => setShowRecipeOverlay(false)}
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 900,
                          color: '#ffffff',
                          background: '#8d6e63',
                          border: '3px solid #3e2723',
                          borderRadius: 12,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontFamily: FONT_FAMILY,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <X size={15} strokeWidth={3} />
                        {t('realRecipe.close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      <LanguageSwitcher />
      <ProfileBadge />

      {/* Logo */}
      <div
        style={{
          position: 'relative',
          width: 490,
          userSelect: 'none',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            fontFamily: TITLE_FONT_FAMILY,
            color: '#ffffff',
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            WebkitTextStroke: '7px #3e2723',
            paintOrder: 'stroke fill',
          }}
        >
          Foodstack
        </h1>
        <div
          style={{
            position: 'absolute',
            bottom: -14,
            right: 36,
            transform: 'rotate(-10deg)',
            background: '#ffca28',
            borderRadius: 5,
            padding: '3px 10px',
            boxShadow: '0 3px 0 #b8860b',
            transition: 'opacity 0.3s',
            opacity: splashFading ? 0 : 1,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#3e2723',
              fontFamily: FONT_FAMILY,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {SPLASH_TEXTS[splashIdx]}
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          width: 520,
          padding: '14px 24px 16px',
          background: '#fffaf0',
          borderRadius: 28,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Main tab bar */}
        <MainTabBar value={mainTab} onChange={setMainTab} />

        {/* Difficulty picker overlay */}
        {difficultyFor && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,250,240,0.97)',
              borderRadius: 24,
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#3e2723',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('modes.chooseDifficulty')}
            </div>
            <div style={{ width: 300 }}>
              <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={false} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <PushButton
                label={t('modes.back')}
                color="#9e9e9e"
                hoverColor="#757575"
                height={38}
                shadowDepth={5}
                onClick={() => setDifficultyFor(null)}
                disabled={false}
                style={{ width: 120 }}
              />
              <PushButton
                icon={<Play size={16} fill="currentColor" strokeWidth={0} />}
                label={t('modes.play')}
                color="#4caf50"
                hoverColor="#43a047"
                height={38}
                shadowDepth={5}
                onClick={onConfirmDifficulty}
                disabled={false}
                style={{ width: 160 }}
              />
            </div>
          </div>
        )}

        {/* Tab content — fixed min height so card doesn't resize between tabs */}
        <div
          style={{
            width: '100%',
            minHeight: 256,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          {/* Modes tab */}
          {mainTab === 'modes' && (
            <>
              {/* 2x2 mode grid */}
              <div
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {/* Daily */}
                <ModeCard
                  icon={<Calendar size={16} strokeWidth={2.5} color="#fff" />}
                  title={t('modes.daily.title')}
                  description={t('modes.daily.description')}
                  accent="#ff9800"
                  extra={
                    <div
                      style={{
                        fontSize: 10,
                        color: '#8d6e63',
                        fontWeight: 700,
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <span>{dailyDate}</span>
                      {dailyBest !== null && (
                        <span style={{ color: '#4caf50' }}>
                          {t('modes.daily.best', { count: dailyBest })}
                        </span>
                      )}
                      {dailyAttempts > 0 && (
                        <span style={{ color: '#9e9e9e' }}>
                          {t('modes.daily.attempts', { count: dailyAttempts })}
                        </span>
                      )}
                    </div>
                  }
                >
                  <PushButton
                    icon={<Play size={14} fill="currentColor" strokeWidth={0} />}
                    label={t('modes.play')}
                    color="#ff9800"
                    hoverColor="#f57c00"
                    height={32}
                    shadowDepth={4}
                    onClick={() => onModeWithDifficulty('daily')}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  />
                </ModeCard>

                {/* Survival */}
                <ModeCard
                  icon={<Skull size={16} strokeWidth={2.5} color="#fff" />}
                  title={t('modes.survival.title')}
                  description={t('modes.survival.description')}
                  accent="#e53935"
                  locked={isAnonymous}
                >
                  <PushButton
                    icon={
                      isAnonymous ? (
                        <LockIcon size={14} strokeWidth={2.5} />
                      ) : (
                        <Play size={14} fill="currentColor" strokeWidth={0} />
                      )
                    }
                    label={isAnonymous ? t('auth.signIn') : t('modes.start')}
                    color={isAnonymous ? '#8d6e63' : '#e53935'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#c62828'}
                    height={32}
                    shadowDepth={4}
                    onClick={() =>
                      isAnonymous ? setShowAuthModal(true) : onModeWithDifficulty('survival')
                    }
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  />
                </ModeCard>

                {/* Normal (Quick Play) */}
                <ModeCard
                  icon={<Zap size={16} strokeWidth={2.5} color="#fff" />}
                  title={t('modes.normal.title')}
                  description={t('modes.normal.description')}
                  accent="#29b6f6"
                  locked={isAnonymous}
                >
                  <PushButton
                    icon={
                      isAnonymous ? (
                        <LockIcon size={14} strokeWidth={2.5} />
                      ) : (
                        <Play size={14} fill="currentColor" strokeWidth={0} />
                      )
                    }
                    label={isAnonymous ? t('auth.signIn') : t('modes.play')}
                    color={isAnonymous ? '#8d6e63' : '#29b6f6'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#03a9f4'}
                    height={32}
                    shadowDepth={4}
                    onClick={() =>
                      isAnonymous ? setShowAuthModal(true) : onModeWithDifficulty('normal')
                    }
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  />
                </ModeCard>

                {/* Seeded (Custom) */}
                <ModeCard
                  icon={<Settings size={16} strokeWidth={2.5} color="#fff" />}
                  title={t('modes.seeded.title')}
                  description={t('modes.seeded.description')}
                  accent="#7e57c2"
                  locked={isAnonymous}
                >
                  <PushButton
                    icon={
                      isAnonymous ? (
                        <LockIcon size={14} strokeWidth={2.5} />
                      ) : (
                        <Settings size={14} strokeWidth={2.5} />
                      )
                    }
                    label={isAnonymous ? t('auth.signIn') : t('modes.configure')}
                    color={isAnonymous ? '#8d6e63' : '#7e57c2'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#5e35b1'}
                    height={32}
                    shadowDepth={4}
                    onClick={() => (isAnonymous ? setShowAuthModal(true) : onSeeded())}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  />
                </ModeCard>
              </div>

              {/* Error */}
              {error && (
                <div style={{ fontSize: 13, color: '#e74c3c', textAlign: 'center', marginTop: 4 }}>
                  {error}
                </div>
              )}
            </>
          )}

          {/* Trophies tab */}
          {mainTab === 'trophies' && <TrophyDexPanel onSelectEntry={onSelectEntry} />}

          {/* Rankings tab */}
          {mainTab === 'rankings' && <LeaderboardPanel />}

          {/* History tab */}
          {mainTab === 'history' && <HistoryPanel />}
        </div>
        {/* end tab content */}
      </div>
    </div>
  );
}