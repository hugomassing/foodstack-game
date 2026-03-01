import { useState } from 'react';
import { User } from 'lucide-react';
import { gameStore } from '../../store/gameStore';
import { useGameStore } from '../../App';
import { FONT_FAMILY } from '../../config';

export function ProfileBadge() {
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
