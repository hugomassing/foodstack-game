import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { gameStore } from '../store/gameStore';
import type { Difficulty } from '../store/gameStore';
import { useGameStore } from '../App';
import { FONT_FAMILY, TITLE_FONT_FAMILY } from '../config';
import type { PuzzleData, GameMode } from '../types';
import { Calendar, Skull, Zap, Settings, Play, User, Trophy, Clock } from 'lucide-react';
import { useTranslation, loadLocale } from '../i18n';
import { getDailyDishName, getDailyDate, getDailyBestScore } from '../lib/daily';
import { randomDishName } from '../lib/dishName';
import { getWordlists } from '../data/wordlists/index';
import type { TranslationKeys } from '../i18n/types';

const LOCALES = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'it', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ko', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'zh', flag: '\u{1F1E8}\u{1F1F3}' },
];

const FOOD_ICONS = [
  '/assets/sprites/food/protein/steak.png',
  '/assets/sprites/food/protein/ham.png',
  '/assets/sprites/food/prepared/pizza.png',
  '/assets/sprites/food/prepared/sandwich.png',
  '/assets/sprites/food/vegetable/carrot.png',
  '/assets/sprites/food/utensil/fork_knife.png',
  '/assets/sprites/food/utensil/fire.png',
  '/assets/sprites/food/utensil/pouring_liquid.png',
  '/assets/sprites/food/drink/hot_beverage.png',
];

const LOADING_ASSETS = [
  '/assets/sprites/food/vegetable/carrot.png',
  '/assets/sprites/food/utensil/knife.png',
  '/assets/sprites/food/utensil/frying_pan.png',
  '/assets/sprites/food/utensil/salt_shaker.png',
  '/assets/sprites/food/utensil/fork_knife.png',
  '/assets/sprites/food/utensil/plate.png',
  '/assets/sprites/food/utensil/bowl_spoon.png',
  '/assets/sprites/food/utensil/fire.png',
  '/assets/sprites/food/dairy/butter.png',
  '/assets/sprites/food/utensil/pouring_liquid.png',
];

const CHILI_SRC = '/assets/sprites/food/vegetable/chili.png';

const DIFFICULTIES = [
  { value: 'easy' as const, labelKey: 'menu.difficulty.easy' as TranslationKeys, count: 1 },
  { value: 'medium' as const, labelKey: 'menu.difficulty.medium' as TranslationKeys, count: 2 },
  { value: 'hard' as const, labelKey: 'menu.difficulty.hard' as TranslationKeys, count: 3 },
];

function LoadingCard({ dishName, cookingUpLabel }: { dishName: string; cookingUpLabel: string }) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_ASSETS.length);
        setFading(false);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes loadingSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.15); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-10deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes loadingDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: 380,
          padding: '36px 28px 32px',
          background: '#fffaf0',
          borderRadius: 28,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: '#ff5252',
              borderRadius: '50%',
              border: '3px solid #3e2723',
              boxShadow: '0 2px 0 #3e2723',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: '#d84315',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: FONT_FAMILY,
          }}
        >
          {cookingUpLabel}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#3e2723',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            fontFamily: FONT_FAMILY,
            textAlign: 'center',
          }}
        >
          {dishName}
        </div>
        <div
          style={{
            animation: 'loadingSpin 1.6s ease-in-out infinite',
            margin: '8px 0',
            transition: 'opacity 0.3s',
            opacity: fading ? 0 : 1,
          }}
        >
          <img src={LOADING_ASSETS[msgIndex]} alt="" style={{ width: 64, height: 64 }} />
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#5d4037',
            fontFamily: FONT_FAMILY,
            textAlign: 'center',
            transition: 'opacity 0.3s',
            opacity: fading ? 0 : 1,
            minHeight: 28,
          }}
        >
          {t(`menu.loadingMessages.${msgIndex}` as TranslationKeys)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ffca28',
                border: '2px solid #3e2723',
                animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function DifficultySelector({
  value,
  onChange,
  disabled,
}: {
  value: Difficulty;
  onChange: (v: Difficulty) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ width: '100%', display: 'flex', gap: 6, marginBottom: 4 }}>
      {DIFFICULTIES.map((d) => {
        const active = value === d.value;
        return (
          <div
            key={d.value}
            onClick={disabled ? undefined : () => onChange(d.value)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
              background: active ? '#3e2723' : '#ffffff',
              color: active ? '#ffffff' : '#3e2723',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              cursor: disabled ? 'default' : 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s',
              boxShadow: active ? '0 3px 0 #2a1a12' : '0 3px 0 #e0e0e0',
            }}
          >
            <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {Array.from({ length: d.count }).map((_, i) => (
                <img key={i} src={CHILI_SRC} alt="" style={{ width: 16, height: 16 }} />
              ))}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.08em',
                fontFamily: FONT_FAMILY,
              }}
            >
              {t(d.labelKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PushButton({
  icon,
  label,
  color,
  hoverColor,
  height,
  shadowDepth,
  onClick,
  disabled,
  style,
}: {
  icon?: React.ReactNode;
  label: string;
  color: string;
  hoverColor: string;
  height: number;
  shadowDepth: number;
  onClick: () => void;
  disabled: boolean;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);

  const borderWidth = 3;
  const outerRadius = 14;
  const innerRadius = outerRadius - borderWidth;

  return (
    <div
      style={{
        borderRadius: outerRadius,
        border: `${borderWidth}px solid #3e2723`,
        background: '#3e2723',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => {
        if (!disabled) setPressed(true);
      }}
      onMouseUp={() => {
        if (pressed) {
          setPressed(false);
          onClick();
        }
      }}
    >
      <div
        style={{
          height,
          borderRadius: innerRadius,
          background: hover && !disabled && !pressed ? hoverColor : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: pressed ? 0 : shadowDepth,
          marginTop: pressed ? shadowDepth : 0,
          transition: 'margin 0.08s, background 0.15s',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: FONT_FAMILY,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function LanguageSwitcher() {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const saveLocale = useMutation(api.users.setLocale);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          borderRadius: 12,
          background: '#fffaf0',
          border: '2px solid #3e2723',
          boxShadow: '0 3px 0 #3e2723',
          cursor: 'pointer',
          fontSize: 22,
          lineHeight: 1,
          height: 36,
          boxSizing: 'border-box',
          padding: '0 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          transition: 'transform 0.1s',
          transform: open ? 'translateY(2px)' : 'none',
        }}
      >
        {current.flag}
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            right: 0,
            background: '#fffaf0',
            border: '3px solid #3e2723',
            borderRadius: 14,
            boxShadow: '0 6px 0 #3e2723',
            padding: 6,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 4,
          }}
        >
          {LOCALES.map((l) => (
            <div
              key={l.code}
              onClick={() => {
                loadLocale(l.code);
                saveLocale({ locale: l.code }).catch(() => { });
                setOpen(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
                background: l.code === locale ? '#ffca28' : 'transparent',
                border: l.code === locale ? '2px solid #3e2723' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              {l.flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function ModeCard({ icon, title, description, accent, extra, children }: ModeCardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 14,
        border: '2px solid #e0e0e0',
        boxShadow: '0 3px 0 #e0e0e0',
        padding: '12px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#3e2723',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 10, color: '#8d6e63', fontWeight: 700, lineHeight: 1.3 }}>
            {description}
          </div>
        </div>
      </div>
      {extra}
      <div style={{ marginTop: 'auto' }}>{children}</div>
    </div>
  );
}

type MainTab = 'modes' | 'rankings' | 'history' | 'trophies';
type ModeWithDifficulty = 'daily' | 'survival' | 'normal';

export function ModeSelector() {
  const [mainTab, setMainTab] = useState<MainTab>('modes');
  const { t, locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDishName, setLoadingDishName] = useState('');
  const [error, setError] = useState('');
  const [difficultyFor, setDifficultyFor] = useState<ModeWithDifficulty | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const dailyDate = getDailyDate();
  const dailyBest = getDailyBestScore(dailyDate);

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
        // Initialize survival state then start
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

  const font = FONT_FAMILY;

  if (isLoading) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font,
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.12,
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={FOOD_ICONS[i % FOOD_ICONS.length]}
                  alt=""
                  style={{ width: 32, height: 32 }}
                />
              </div>
            ))}
          </div>
        </div>
        <LoadingCard dishName={loadingDishName} cookingUpLabel={t('menu.cookingUp')} />
      </div>
    );
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
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Background food pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.12,
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

      {/* Card */}
      <div
        style={{
          width: 520,
          padding: '20px 24px 16px',
          background: '#fffaf0',
          borderRadius: 28,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          position: 'relative',
          marginTop: 8,
          zIndex: 10,
        }}
      >
        {/* Top pin */}
        <div
          style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: '#ff5252',
              borderRadius: '50%',
              border: '3px solid #3e2723',
              boxShadow: '0 2px 0 #3e2723',
            }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            fontFamily: TITLE_FONT_FAMILY,
            color: '#ffffff',
            margin: '2px 0 4px',
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            WebkitTextStroke: '6px #3e2723',
            paintOrder: 'stroke fill',
          }}
        >
          {t('modes.title')}
        </h1>

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
              >
                <PushButton
                  icon={<Play size={14} fill="currentColor" strokeWidth={0} />}
                  label={t('modes.start')}
                  color="#e53935"
                  hoverColor="#c62828"
                  height={32}
                  shadowDepth={4}
                  onClick={() => onModeWithDifficulty('survival')}
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
              >
                <PushButton
                  icon={<Play size={14} fill="currentColor" strokeWidth={0} />}
                  label={t('modes.play')}
                  color="#29b6f6"
                  hoverColor="#03a9f4"
                  height={32}
                  shadowDepth={4}
                  onClick={() => onModeWithDifficulty('normal')}
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
              >
                <PushButton
                  icon={<Settings size={14} strokeWidth={2.5} />}
                  label={t('modes.configure')}
                  color="#7e57c2"
                  hoverColor="#5e35b1"
                  height={32}
                  shadowDepth={4}
                  onClick={onSeeded}
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
      </div>
    </div>
  );
}

const MAIN_TAB_ITEMS: { value: MainTab; labelKey: TranslationKeys; icon: typeof Trophy }[] = [
  { value: 'modes', labelKey: 'menu.tabs.cook', icon: Play },
  { value: 'trophies', labelKey: 'menu.tabs.trophies' as TranslationKeys, icon: Trophy },
  { value: 'rankings', labelKey: 'menu.tabs.leaderboard', icon: Trophy },
  { value: 'history', labelKey: 'menu.tabs.history', icon: Clock },
];

function MainTabBar({ value, onChange }: { value: MainTab; onChange: (tab: MainTab) => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ width: '100%', display: 'flex', gap: 4, marginBottom: 4 }}>
      {MAIN_TAB_ITEMS.map((item) => {
        const active = value === item.value;
        const Icon = item.icon;
        return (
          <div
            key={item.value}
            onClick={() => onChange(item.value)}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 10,
              border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
              background: active ? '#3e2723' : '#ffffff',
              color: active ? '#ffffff' : '#8d6e63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s',
              boxShadow: active ? '0 3px 0 #2a1a12' : '0 2px 0 #e0e0e0',
            }}
          >
            <Icon size={13} strokeWidth={3} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.08em',
                fontFamily: FONT_FAMILY,
              }}
            >
              {t(item.labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ProfileBadge() {
  const displayName = useGameStore((s) => s.displayName);
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={() => gameStore.getState().setShowAuthModal(true)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: 12,
        right: 56,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 36,
        boxSizing: 'border-box',
        padding: '0 12px 0 8px',
        borderRadius: 12,
        background: hover ? '#3e2723' : '#fffaf0',
        border: '2px solid #3e2723',
        boxShadow: '0 3px 0 #3e2723',
        cursor: 'pointer',
        transition: 'all 0.15s',
        color: hover ? '#ffffff' : '#3e2723',
      }}
    >
      <User size={14} strokeWidth={3} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.04em',
          fontFamily: FONT_FAMILY,
          textTransform: 'uppercase',
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName ?? 'Chef'}
      </span>
    </div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4caf50',
  medium: '#ff9800',
  hard: '#e53935',
};

const MODE_COLORS: Record<string, string> = {
  daily: '#ff9800',
  survival: '#e53935',
  normal: '#29b6f6',
  seeded: '#7e57c2',
};

const DIFFICULTY_CHILIS: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

type TrophyEntry = {
  dishName: string;
  totalCompletions: number;
  acquired: boolean;
  modes: string[];
  difficulties: string[];
  victoryCardUrl: string | null;
};

function TrophyDetail({ entry, onBack }: { entry: TrophyEntry; onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Back button */}
      <div
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          fontSize: 11,
          fontWeight: 900,
          color: '#8d6e63',
          cursor: 'pointer',
          letterSpacing: '0.06em',
          userSelect: 'none',
        }}
      >
        {'\u2190'} {t('modes.back')}
      </div>

      {/* Trophy image */}
      {entry.victoryCardUrl ? (
        <img
          src={entry.victoryCardUrl}
          alt=""
          style={{
            width: 120,
            height: 120,
            borderRadius: 14,
            objectFit: 'cover',
            border: '3px solid #3e2723',
            boxShadow: '0 4px 0 #3e2723',
          }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 14,
            background: '#f5f0e8',
            border: '3px solid #3e2723',
            boxShadow: '0 4px 0 #3e2723',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trophy size={48} color="#d7ccc8" strokeWidth={2} />
        </div>
      )}

      {/* Dish name */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: '#3e2723',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        {entry.dishName}
      </div>

      {/* Chef count */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#8d6e63' }}>
        {t('menu.trophies.chefs' as TranslationKeys, { count: entry.totalCompletions })}
      </div>

      {/* Mode badges */}
      {entry.modes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {entry.modes.map((mode) => (
            <div
              key={mode}
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: '#ffffff',
                background: MODE_COLORS[mode] ?? '#9e9e9e',
                borderRadius: 6,
                padding: '3px 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {mode}
            </div>
          ))}
        </div>
      )}

      {/* Difficulty badges */}
      {entry.difficulties.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {entry.difficulties.map((diff) => (
            <div
              key={diff}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: DIFFICULTY_COLORS[diff] ?? '#9e9e9e',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              <div style={{ display: 'flex', gap: 1 }}>
                {Array.from({ length: DIFFICULTY_CHILIS[diff] ?? 1 }).map((_, i) => (
                  <img key={i} src={CHILI_SRC} alt="" style={{ width: 12, height: 12 }} />
                ))}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {t(`menu.difficulty.${diff}` as TranslationKeys)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrophyDexPanel() {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.trophyDex);
  const [selected, setSelected] = useState<TrophyEntry | null>(null);

  if (data === undefined) {
    return (
      <div
        style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {t('menu.trophies.loading' as TranslationKeys)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {t('menu.trophies.empty' as TranslationKeys)}
      </div>
    );
  }

  if (selected) {
    return <TrophyDetail entry={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 300,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
      }}
    >
      {data.map((entry) => (
        <div
          key={entry.dishName}
          onClick={entry.acquired ? () => setSelected(entry) : undefined}
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '2px solid #e0e0e0',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: entry.acquired ? 1 : 0.3,
            filter: entry.acquired ? 'none' : 'grayscale(1)',
            cursor: entry.acquired ? 'pointer' : 'default',
            transition: 'opacity 0.2s, filter 0.2s',
          }}
        >
          {entry.victoryCardUrl ? (
            <img
              src={entry.victoryCardUrl}
              alt=""
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                objectFit: 'cover',
                border: '2px solid #e0e0e0',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: '#f5f0e8',
                border: '2px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trophy size={16} color="#d7ccc8" strokeWidth={2.5} />
            </div>
          )}
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#3e2723',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {entry.acquired ? entry.dishName : t('menu.trophies.notAcquired' as TranslationKeys)}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardPanel() {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.leaderboard);

  if (data === undefined) {
    return (
      <div
        style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {t('menu.leaderboard.loading' as TranslationKeys)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {t('menu.leaderboard.empty' as TranslationKeys)}
      </div>
    );
  }

  const RANK_BADGES = ['#ffd700', '#c0c0c0', '#cd7f32'];

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 300,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {data.map((entry) => (
        <div
          key={entry.rank}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: entry.rank <= 3 ? `${RANK_BADGES[entry.rank - 1]}18` : '#ffffff',
            borderRadius: 10,
            border: `2px solid ${entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : '#e0e0e0'}`,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 900,
              color: entry.rank <= 3 ? '#3e2723' : '#8d6e63',
              flexShrink: 0,
            }}
          >
            {entry.rank}
          </div>
          <div
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 900,
              color: '#3e2723',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.displayName}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#8d6e63',
              flexShrink: 0,
            }}
          >
            {entry.dishCount} {t('menu.leaderboard.dishes' as TranslationKeys)}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryPanel() {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.history);

  if (data === undefined) {
    return (
      <div
        style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {t('menu.history.loading' as TranslationKeys)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {t('menu.history.empty' as TranslationKeys)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 300,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {data.map((entry) => (
        <div
          key={entry._id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#ffffff',
            borderRadius: 10,
            border: '2px solid #e0e0e0',
          }}
        >
          {entry.victoryCardUrl ? (
            <img
              src={entry.victoryCardUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: 'cover',
                flexShrink: 0,
                border: '2px solid #e0e0e0',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: '#f5f0e8',
                flexShrink: 0,
                border: '2px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={16} color="#d7ccc8" strokeWidth={2.5} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#3e2723',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              {entry.dishName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#ffffff',
                  background: DIFFICULTY_COLORS[entry.difficulty] ?? '#9e9e9e',
                  borderRadius: 5,
                  padding: '1px 5px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t(`menu.difficulty.${entry.difficulty}` as TranslationKeys)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8d6e63' }}>
                {entry.stepCount}/{entry.totalSteps}
              </div>
              <div style={{ fontSize: 10, color: '#bdbdbd' }}>
                {new Date(entry.completedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}