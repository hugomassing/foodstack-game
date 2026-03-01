import { useState, useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { gameStore } from '../store/gameStore';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import type { PuzzleData } from '../types';
import { useGameStore } from '../App';
import { useTranslation } from '../i18n';
import { randomDishName } from '../lib/dishName';
import { getWordlists } from '../data/wordlists/index';
import { Heart } from 'lucide-react';

export function RecipePickOverlay() {
  const { t } = useTranslation();
  const survivalLives = useGameStore((s) => s.survivalLives);
  const survivalRound = useGameStore((s) => s.survivalRound);
  const survivalHistory = useGameStore((s) => s.survivalHistory);
  const difficulty = useGameStore((s) => s.difficulty);

  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const wl = getWordlists('en');
    const names = [randomDishName(wl, 'en'), randomDishName(wl, 'en'), randomDishName(wl, 'en')];
    setOptions(names);
    setTimeout(() => setShow(true), 100);
  }, []);

  const lastResult = survivalHistory[survivalHistory.length - 1];

  const onPick = async (index: number) => {
    if (loading !== null) return;
    setLoading(index);
    setError('');
    const dishName = options[index];
    try {
      const puzzleData = await convex.action(api.generator.generateOrGetRecipe, {
        dishName,
        difficulty,
        locale: 'en',
      });
      gameStore.getState().startSurvivalRound(puzzleData as PuzzleData, difficulty);
    } catch (err) {
      setLoading(null);
      setError((err as Error).message);
    }
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
        @keyframes loadingSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.15); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-10deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>

      <div
        style={{
          transform: show ? 'translateY(0) scale(1)' : 'translateY(-50px) scale(0.9)',
          opacity: show ? 1 : 0,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* Completed dish summary */}
        {lastResult && (
          <div
            style={{
              fontSize: 12,
              color: '#a5d6a7',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {lastResult.dishName} - {lastResult.errorsUsed} {t('survival.errors')}
          </div>
        )}

        {/* Status bar: round + lives */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em' }}>
            {t('survival.round', { round: survivalRound + 1 })}
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                strokeWidth={2}
                fill={i < survivalLives ? '#e53935' : 'transparent'}
                color={i < survivalLives ? '#e53935' : '#666'}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t('survival.chooseNext')}
        </div>

        {/* 3 recipe cards */}
        <div style={{ display: 'flex', gap: 12 }}>
          {options.map((name, i) => {
            const isLoading = loading === i;
            return (
              <div
                key={i}
                onClick={() => onPick(i)}
                style={{
                  width: 200,
                  padding: '20px 16px',
                  background: '#fffaf0',
                  borderRadius: 18,
                  border: '3px solid #3e2723',
                  boxShadow: '0 6px 0 #3e2723',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  cursor: loading !== null ? 'default' : 'pointer',
                  opacity: loading !== null && !isLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s, transform 0.2s',
                  transform: isLoading ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: '#3e2723',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    minHeight: 40,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {name}
                </div>
                {isLoading ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      animation: 'loadingSpin 1.2s ease-in-out infinite',
                    }}
                  >
                    <img
                      src="/assets/sprites/food/utensil/frying_pan.png"
                      alt=""
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: '#ffffff',
                      background: '#4caf50',
                      borderRadius: 8,
                      padding: '6px 16px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('modes.play')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#e74c3c', textAlign: 'center', marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}