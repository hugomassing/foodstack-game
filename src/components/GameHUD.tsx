import { FONT_FAMILY } from '../config';
import { useGameStore } from '../App';

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
        background: '#fffaf0',
        border: '4px solid #3e2723',
        boxShadow: '6px 6px 0 #3e2723',
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: FONT_FAMILY,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: dish name + step counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 'bold', color: '#3e2723' }}>
          {puzzleData.dishName.toUpperCase()}
        </span>
        <span style={{ fontSize: 11, color: '#8d6e63' }}>
          {stepCount}/{totalSteps} STEPS
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: 4,
          height: 10,
          borderRadius: 5,
          background: '#e5e7eb',
          border: '2px solid #3e2723',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fraction * 100}%`,
            height: '100%',
            borderRadius: 5,
            background: '#4caf50',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>
    </div>
  );
}
