import { FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { ChefHat } from 'lucide-react';

const TB_X = 248;
const TB_Y = 8;
const TB_W = 704;
const TB_H = 62;

export function GameHUD() {
  const puzzleData = useGameStore((s) => s.puzzleData);
  const stepCount = useGameStore((s) => s.stepCount);
  const totalSteps = useGameStore((s) => s.totalSteps);

  if (!puzzleData) return null;

  const fraction = totalSteps > 0 ? stepCount / totalSteps : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: TB_X,
        top: TB_Y,
        width: TB_W,
        height: TB_H,
        borderRadius: 14,
        background: '#3e2723',
        border: '4px solid #3e2723',
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 10,
          background: '#fffaf0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top row: dish name + step counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChefHat size={16} strokeWidth={2.5} color="#d84315" />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#3e2723', letterSpacing: '-0.01em' }}>
              {puzzleData.dishName.toUpperCase()}
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#3e2723',
              background: '#f5f0e8',
              borderRadius: 6,
              padding: '2px 8px',
              border: '1.5px solid #e0d6c8',
              letterSpacing: '0.04em',
            }}
          >
            {stepCount}/{totalSteps} STEPS
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 6,
            height: 10,
            borderRadius: 5,
            background: '#ede7dd',
            border: '2px solid #3e2723',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${fraction * 100}%`,
              height: '100%',
              borderRadius: 5,
              background: fraction >= 1 ? '#4caf50' : '#4caf50',
              transition: 'width 0.5s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}
