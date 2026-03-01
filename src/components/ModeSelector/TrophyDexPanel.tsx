import { useQuery } from 'convex/react';
import { Trophy } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { playTapSound } from './sounds';

export type TrophyEntry = {
  dishName: string;
  totalCompletions: number;
  acquired: boolean;
  modes: string[];
  difficulties: string[];
  victoryCardUrl: string | null;
  bestResult: {
    stepCount: number;
    totalSteps: number;
    errorCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    gameMode?: 'daily' | 'survival' | 'normal' | 'seeded';
  } | null;
};

export function TrophyDexPanel({ onSelectEntry }: { onSelectEntry: (entry: TrophyEntry) => void }) {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.trophyDex);

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
          onClick={entry.acquired ? () => { playTapSound(); onSelectEntry(entry); } : undefined}
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
