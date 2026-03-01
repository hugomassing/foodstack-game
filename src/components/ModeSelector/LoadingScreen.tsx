import { useState, useEffect } from 'react';
import { FONT_FAMILY, TITLE_FONT_FAMILY } from '../../config';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { FOOD_ICONS, LOADING_ASSETS } from './constants';

export function LoadingScreen({ dishName }: { dishName: string }) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_ASSETS.length);
        setFading(false);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: '#2d1b14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes waveFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-14px) scale(1.1); }
        }
        @keyframes titlePulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px #ffca28); }
          50% { opacity: 0.88; filter: drop-shadow(0 0 18px #ffca2888); }
        }
        @keyframes loadingDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes bgDrift {
          0% { transform: rotate(-5deg) scale(1.4) translate(0, 0); }
          100% { transform: rotate(-5deg) scale(1.4) translate(-30px, -10px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Drifting background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 40,
            padding: 24,
            height: '150%',
            width: '150%',
            animation: 'bgDrift 10s ease-in-out infinite alternate',
          }}
        >
          {Array.from({ length: 64 }).map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <img
                src={FOOD_ICONS[i % FOOD_ICONS.length]}
                alt=""
                style={{ width: 32, height: 32 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Game title */}
      <h1
        style={{
          fontSize: 52,
          fontWeight: 900,
          fontFamily: TITLE_FONT_FAMILY,
          color: '#ffca28',
          margin: '0 0 32px',
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          WebkitTextStroke: '5px #e53935',
          paintOrder: 'stroke fill',
          animation: 'titlePulse 2.5s ease-in-out infinite',
        }}
      >
        Foodstack
      </h1>

      {/* Wave of food icons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
        {LOADING_ASSETS.slice(0, 7).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              width: 36,
              height: 36,
              animation: `waveFloat 1.5s ease-in-out ${(i * 0.15).toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 180,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #ffca2855, transparent)',
          borderRadius: 1,
          marginBottom: 24,
        }}
      />

      {/* "Cooking up" label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: '#ff9800',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          marginBottom: 10,
          animation: 'fadeInUp 0.5s ease-out',
        }}
      >
        {t('menu.cookingUp')}
      </div>

      {/* Dish name */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#ffffff',
          fontFamily: FONT_FAMILY,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          textAlign: 'center',
          maxWidth: 340,
          lineHeight: 1.2,
          animation: 'fadeInUp 0.65s ease-out',
          marginBottom: 20,
        }}
      >
        {dishName}
      </div>

      {/* Cycling tip */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#a1887f',
          textAlign: 'center',
          maxWidth: 300,
          lineHeight: 1.4,
          minHeight: 20,
          transition: 'opacity 0.3s',
          opacity: fading ? 0 : 0.85,
        }}
      >
        {t(`menu.loadingMessages.${msgIndex}` as TranslationKeys)}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ffca28',
              animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}