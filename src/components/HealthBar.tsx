import { ChefHat } from 'lucide-react';
import { BD_X, BD_W, HEALTH_BAR_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import { useTranslation } from '../i18n';

const HAT_SIZE = 20;

export function HealthBar() {
  const errorCount = useGameStore((s) => s.errorCount);
  const maxErrors = useGameStore((s) => s.maxErrors);
  const { t } = useTranslation();

  // Hide for infinite mode (seeded with no error limit)
  if (!Number.isFinite(maxErrors)) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: BD_X,
        top: 10,
        width: BD_W,
        height: HEALTH_BAR_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        paddingRight: 14,
        paddingLeft: 14,
        pointerEvents: 'none',
        zIndex: 20,
        background: 'linear-gradient(135deg, #5C2D0A 0%, #8B4513 100%)',
        borderRadius: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        boxSizing: 'border-box',
      }}
    >
      {/* Label */}
      <span
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 11,
          color: '#fde8c8',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginRight: 'auto',
          opacity: 0.9,
        }}
      >
        {t('game.lives')}
      </span>
      {Array.from({ length: maxErrors }, (_, i) => {
        const isLost = i < errorCount;
        return (
          <ChefHat
            key={i}
            size={HAT_SIZE}
            fill={isLost ? 'transparent' : '#fff8e7'}
            stroke={isLost ? 'rgba(255,248,231,0.45)' : '#fff8e7'}
            strokeWidth={1.5}
            style={{
              opacity: 1,
              transform: isLost ? 'scale(0.85)' : 'scale(1)',
              transition: 'opacity 300ms ease, transform 300ms ease',
              flexShrink: 0,
              filter: isLost ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          />
        );
      })}
    </div>
  );
}