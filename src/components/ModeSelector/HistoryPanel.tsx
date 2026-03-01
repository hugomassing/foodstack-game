import { useQuery } from 'convex/react';
import { Trophy } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { DIFFICULTY_COLORS } from './constants';

export function HistoryPanel() {
  const { t } = useTranslation();
  const data = useQuery(api.gameResults.history);

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
        {t('menu.history.loading' as TranslationKeys)}
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
        {t('menu.history.empty' as TranslationKeys)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight: 300,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {data.map((entry) => (
        <div
          key={entry._id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#ffffff',
            borderRadius: 10,
            border: '2px solid #e0e0e0',
          }}
        >
          {entry.victoryCardUrl ? (
            <img
              src={entry.victoryCardUrl}
              alt=""
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                objectFit: 'cover',
                flexShrink: 0,
                border: '2px solid #e0e0e0',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: '#f5f0e8',
                flexShrink: 0,
                border: '2px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={16} color="#d7ccc8" strokeWidth={2.5} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#3e2723',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              {entry.dishName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  color: '#ffffff',
                  background: DIFFICULTY_COLORS[entry.difficulty] ?? '#9e9e9e',
                  borderRadius: 5,
                  padding: '1px 5px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t(`menu.difficulty.${entry.difficulty}` as TranslationKeys)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8d6e63' }}>
                {entry.stepCount}/{entry.totalSteps}
              </div>
              <div style={{ fontSize: 10, color: '#bdbdbd' }}>
                {new Date(entry.completedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}