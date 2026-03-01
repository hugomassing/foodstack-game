import { FONT_FAMILY } from '../../config';
import type { Difficulty } from '../../store/gameStore';
import { useTranslation } from '../../i18n';
import { CHILI_SRC, DIFFICULTIES } from './constants';

export function DifficultySelector({
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
              padding: '8px 6px',
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
