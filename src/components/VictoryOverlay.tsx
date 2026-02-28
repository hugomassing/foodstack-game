import { useEffect, useState } from 'react';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { gameStore } from '../store/gameStore';
import { Trophy, RotateCcw } from 'lucide-react';

export function VictoryOverlay() {
  const victoryDish = useGameStore((s) => s.victoryDish);
  const [show, setShow] = useState(false);
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 100);
    const t2 = setTimeout(() => setShowBtn(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
      {/* Victory card */}
      <div
        style={{
          background: '#fffaf0',
          borderRadius: 24,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          padding: '32px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: show ? 'translateY(0) scale(1)' : 'translateY(-100px) scale(0.8)',
          opacity: show ? 1 : 0,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out',
        }}
      >
        <Trophy size={36} strokeWidth={2.5} color="#f1c40f" style={{ marginBottom: 8 }} />

        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#3e2723',
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}
        >
          {victoryDish}
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#4caf50',
            marginTop: 4,
            letterSpacing: '0.06em',
          }}
        >
          YOU WIN!
        </div>

        <button
          onClick={() => gameStore.getState().resetGameplay()}
          style={{
            marginTop: 20,
            fontSize: 15,
            fontWeight: 900,
            color: '#ffffff',
            background: '#4caf50',
            border: '3px solid #3e2723',
            borderRadius: 12,
            padding: '10px 24px',
            cursor: 'pointer',
            fontFamily: FONT_FAMILY,
            opacity: showBtn ? 1 : 0,
            transition: 'opacity 0.5s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.04em',
          }}
        >
          <RotateCcw size={16} strokeWidth={3} />
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
