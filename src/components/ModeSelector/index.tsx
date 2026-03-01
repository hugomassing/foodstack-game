import { useState, useEffect } from 'react';
import { Calendar, Skull, Zap, Settings, Play, Lock as LockIcon } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { convex } from '../../lib/convex';
import { gameStore } from '../../store/gameStore';
import type { Difficulty } from '../../store/gameStore';
import { useGameStore } from '../../App';
import { FONT_FAMILY, TITLE_FONT_FAMILY } from '../../config';
import type { PuzzleData, GameMode } from '../../types';
import { useTranslation } from '../../i18n';
import { getDailyDishName, getDailyDate, getDailyBestScore } from '../../lib/daily';
import { randomDishName } from '../../lib/dishName';
import { getWordlists } from '../../data/wordlists/index';
import { SPLASH_TEXTS, FOOD_ICONS } from './constants';
import { LoadingScreen } from './LoadingScreen';
import { DifficultySelector } from './DifficultySelector';
import { PushButton } from './PushButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ModeCard } from './ModeCard';
import { MainTabBar } from './MainTabBar';
import type { MainTab } from './MainTabBar';
import { ProfileBadge } from './ProfileBadge';
import { TrophyDexPanel } from './TrophyDexPanel';
import { LeaderboardPanel } from './LeaderboardPanel';
import { HistoryPanel } from './HistoryPanel';

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

  const dailyDate = getDailyDate();
  const dailyBest = getDailyBestScore(dailyDate);

  const { t } = useTranslation();

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
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={FOOD_ICONS[i % FOOD_ICONS.length]} alt="" style={{ width: 32, height: 32 }} />
            </div>
          ))}
        </div>
      </div>

      <LanguageSwitcher />
      <ProfileBadge />

      {/* Logo */}
      <div style={{ position: 'relative', width: 490, userSelect: 'none', textAlign: 'center', zIndex: 20 }}>
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
        <div style={{ width: '100%', minHeight: 256, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

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
                    icon={isAnonymous ? <LockIcon size={14} strokeWidth={2.5} /> : <Play size={14} fill="currentColor" strokeWidth={0} />}
                    label={isAnonymous ? 'Sign in' : t('modes.start')}
                    color={isAnonymous ? '#8d6e63' : '#e53935'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#c62828'}
                    height={32}
                    shadowDepth={4}
                    onClick={() => isAnonymous ? setShowAuthModal(true) : onModeWithDifficulty('survival')}
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
                    icon={isAnonymous ? <LockIcon size={14} strokeWidth={2.5} /> : <Play size={14} fill="currentColor" strokeWidth={0} />}
                    label={isAnonymous ? 'Sign in' : t('modes.play')}
                    color={isAnonymous ? '#8d6e63' : '#29b6f6'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#03a9f4'}
                    height={32}
                    shadowDepth={4}
                    onClick={() => isAnonymous ? setShowAuthModal(true) : onModeWithDifficulty('normal')}
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
                    icon={isAnonymous ? <LockIcon size={14} strokeWidth={2.5} /> : <Settings size={14} strokeWidth={2.5} />}
                    label={isAnonymous ? 'Sign in' : t('modes.configure')}
                    color={isAnonymous ? '#8d6e63' : '#7e57c2'}
                    hoverColor={isAnonymous ? '#6d4c41' : '#5e35b1'}
                    height={32}
                    shadowDepth={4}
                    onClick={() => isAnonymous ? setShowAuthModal(true) : onSeeded()}
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
          {mainTab === 'trophies' && <TrophyDexPanel />}

          {/* Rankings tab */}
          {mainTab === 'rankings' && <LeaderboardPanel />}

          {/* History tab */}
          {mainTab === 'history' && <HistoryPanel />}

        </div>{/* end tab content */}
      </div>
    </div>
  );
}
