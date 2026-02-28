import { useEffect, useState } from 'react';
import { GAME_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { gameStore } from '../store/gameStore';

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
        background: 'rgba(0,0,0,0.6)',
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
          fontSize: 32,
          fontWeight: 'bold',
          color: '#f1c40f',
          textShadow: '0 0 4px #000, 2px 2px 0 #000',
          transform: show ? 'translateY(0)' : 'translateY(-200px)',
          transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center',
        }}
      >
        {victoryDish}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: '#16a34a',
          textShadow: '0 0 3px #000, 2px 2px 0 #000',
          marginTop: 12,
          transform: show ? 'translateY(0)' : 'translateY(-200px)',
          transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s',
        }}
      >
        YOU WIN!
      </div>

      <button
        onClick={() => gameStore.getState().resetGameplay()}
        style={{
          marginTop: 24,
          fontSize: 16,
          fontWeight: 'bold',
          color: '#ffffff',
          background: '#2ecc71',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          cursor: 'pointer',
          fontFamily: FONT_FAMILY,
          opacity: showBtn ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      >
        Play Again
      </button>
    </div>
  );
}
