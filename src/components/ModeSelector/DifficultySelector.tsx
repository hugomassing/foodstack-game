import type { Difficulty } from '../../store/gameStore';
import { CHILI_SRC, DIFFICULTIES } from './constants';
import { playTapSound } from './sounds';

export function DifficultySelector({
  value,
  onChange,
  disabled,
}: {
  value: Difficulty;
  onChange: (v: Difficulty) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ width: '100%', display: 'flex', gap: 6, marginBottom: 4 }}>
      {DIFFICULTIES.map((d) => {
        const active = value === d.value;
        return (
          <div
            key={d.value}
            onClick={
              disabled
                ? undefined
                : () => {
                    playTapSound();
                    onChange(d.value);
                  }
            }
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 10,
              border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
              background: active ? '#3e2723' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
          </div>
        );
      })}
    </div>
  );
}