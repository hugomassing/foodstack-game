import { useState } from 'react';
import { useQuery } from 'convex/react';
import { Trophy } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { CHILI_SRC, DIFFICULTY_COLORS, DIFFICULTY_CHILIS, MODE_COLORS } from './constants';
import { playTapSound } from './sounds';

export type TrophyEntry = {
  dishName: string;
  totalCompletions: number;
  acquired: boolean;
  modes: string[];
  difficulties: string[];
  victoryCardUrl: string | null;
};

function TrophyDetail({ entry, onBack }: { entry: TrophyEntry; onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Back button */}
      <div
        onClick={() => { playTapSound(); onBack(); }}
        style={{
          alignSelf: 'flex-start',
          fontSize: 11,
          fontWeight: 900,
          color: '#8d6e63',
          cursor: 'pointer',
          letterSpacing: '0.06em',
          userSelect: 'none',
        }}
      >
        {'\u2190'} {t('modes.back')}
      </div>

      {/* Horizontal layout: image left, info right */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Trophy image */}
        {entry.victoryCardUrl ? (
          <img
            src={entry.victoryCardUrl}
            alt=""
            style={{
              width: 100,
              height: 100,
              borderRadius: 14,
              objectFit: 'cover',
              border: '3px solid #3e2723',
              boxShadow: '0 4px 0 #3e2723',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 14,
              background: '#f5f0e8',
              border: '3px solid #3e2723',
              boxShadow: '0 4px 0 #3e2723',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Trophy size={40} color="#d7ccc8" strokeWidth={2} />
          </div>
        )}

        {/* Info column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Dish name */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#3e2723',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {entry.dishName}
          </div>

          {/* Mode badges */}
          {entry.modes.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entry.modes.map((mode) => (
                <div
                  key={mode}
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: '#ffffff',
                    background: MODE_COLORS[mode] ?? '#9e9e9e',
                    borderRadius: 6,
                    padding: '3px 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {mode}
                </div>
              ))}
            </div>
          )}

          {/* Difficulty badges */}
          {entry.difficulties.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {entry.difficulties.map((diff) => (
                <div
                  key={diff}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: DIFFICULTY_COLORS[diff] ?? '#9e9e9e',
                    borderRadius: 6,
                    padding: '3px 8px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: DIFFICULTY_CHILIS[diff] ?? 1 }).map((_, i) => (
                      <img key={i} src={CHILI_SRC} alt="" style={{ width: 12, height: 12 }} />
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t(`menu.difficulty.${diff}` as TranslationKeys)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Chef count */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8d6e63' }}>
            {t('menu.trophies.chefs' as TranslationKeys, { count: entry.totalCompletions })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrophyDexPanel() {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.trophyDex);
  const [selected, setSelected] = useState<TrophyEntry | null>(null);

  if (data === undefined) {
    return (
      <div
        style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {t('menu.trophies.loading' as TranslationKeys)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          color: '#8d6e63',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.5,
        }}
      >
        {t('menu.trophies.empty' as TranslationKeys)}
      </div>
    );
  }

  if (selected) {
    return <TrophyDetail entry={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 300,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
      }}
    >
      {data.map((entry) => (
        <div
          key={entry.dishName}
          onClick={entry.acquired ? () => { playTapSound(); setSelected(entry); } : undefined}
          style={{
            background: '#ffffff',
            borderRadius: 10,
            border: '2px solid #e0e0e0',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            overflow: 'hidden',
            opacity: entry.acquired ? 1 : 0.3,
            filter: entry.acquired ? 'none' : 'grayscale(1)',
            cursor: entry.acquired ? 'pointer' : 'default',
            transition: 'opacity 0.2s, filter 0.2s',
          }}
        >
          {entry.victoryCardUrl ? (
            <img
              src={entry.victoryCardUrl}
              alt=""
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                objectFit: 'cover',
                border: '2px solid #e0e0e0',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: '#f5f0e8',
                border: '2px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trophy size={16} color="#d7ccc8" strokeWidth={2.5} />
            </div>
          )}
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#3e2723',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {entry.acquired ? entry.dishName : t('menu.trophies.notAcquired' as TranslationKeys)}
          </div>
        </div>
      ))}
    </div>
  );
}
