import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { gameStore } from '../store/gameStore';
import { RotateCcw, Flame, Home } from 'lucide-react';
import { useTranslation } from '../i18n';

export function GameOverOverlay() {
  const errorCount = useGameStore((s) => s.errorCount);
  const maxErrors = useGameStore((s) => s.maxErrors);
  const gameMode = useGameStore((s) => s.gameMode);
  const survivalRound = useGameStore((s) => s.survivalRound);
  const survivalHistory = useGameStore((s) => s.survivalHistory);
  const difficulty = useGameStore((s) => s.difficulty);
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [showBtn, setShowBtn] = useState(false);
  const saveSurvivalSession = useMutation(api.gameResults.saveSurvivalSession);
  const savedRef = useRef(false);

  useEffect(() => {
    if (gameMode === 'survival' && !savedRef.current) {
      savedRef.current = true;
      saveSurvivalSession({ roundsCompleted: survivalRound });
    }
  }, [gameMode, survivalRound, saveSurvivalSession]);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setShowBtn(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleRetry = () => {
    if (gameMode === 'daily') {
      // Retry same daily recipe
      const data = gameStore.getState().puzzleData;
      if (data) {
        gameStore.setState({ gameMode: 'daily' });
        gameStore.getState().startGame(data, difficulty);
      }
    } else {
      gameStore.getState().resetGameplay();
    }
  };

  const handleBackToMenu = () => {
    gameStore.getState().resetGameplay();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GAME_W,
        height: GAME_H,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          background: '#2c1010',
          borderRadius: 24,
          border: '4px solid #8b0000',
          boxShadow: '0 10px 0 #3e2723',
          padding: '32px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 420,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(-100px) scale(0.8)',
          opacity: show ? 1 : 0,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
        }}
      >
        <Flame size={36} strokeWidth={2.5} color="#e74c3c" style={{ marginBottom: 8 }} />

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#e74c3c',
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}
        >
          {t('gameOver.title')}
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#ff6b6b',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {gameMode === 'survival'
            ? t('gameOver.survivalEnd', { rounds: survivalRound })
            : t('gameOver.tooManyErrors', { count: errorCount, max: maxErrors })}
        </div>

        {/* Survival history */}
        {gameMode === 'survival' && survivalHistory.length > 0 && (
          <div
            style={{
              marginTop: 12,
              width: '100%',
              maxHeight: 120,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {survivalHistory.map((result, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ff9e9e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 6,
                }}
              >
                <span>{result.dishName}</span>
                <span>
                  {result.errorsUsed} {t('survival.errorsShort')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 20,
            opacity: showBtn ? 1 : 0,
            transition: 'opacity 0.5s',
          }}
        >
          {gameMode !== 'survival' && (
            <button
              onClick={handleRetry}
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: '#ffffff',
                background: '#e74c3c',
                border: '3px solid #8b0000',
                borderRadius: 12,
                padding: '10px 24px',
                cursor: 'pointer',
                fontFamily: FONT_FAMILY,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                letterSpacing: '0.04em',
              }}
            >
              <RotateCcw size={16} strokeWidth={3} />
              {t('gameOver.tryAgain')}
            </button>
          )}
          <button
            onClick={handleBackToMenu}
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#ffffff',
              background: gameMode === 'survival' ? '#e74c3c' : '#8d6e63',
              border: `3px solid ${gameMode === 'survival' ? '#8b0000' : '#3e2723'}`,
              borderRadius: 12,
              padding: '10px 24px',
              cursor: 'pointer',
              fontFamily: FONT_FAMILY,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              letterSpacing: '0.04em',
            }}
          >
            <Home size={16} strokeWidth={3} />
            {t('gameOver.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}