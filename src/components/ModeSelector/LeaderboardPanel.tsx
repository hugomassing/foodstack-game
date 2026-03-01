import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { playTapSound } from './sounds';

const RANK_BADGES = ['#ffd700', '#c0c0c0', '#cd7f32'];

export function LeaderboardPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'trophies' | 'survival'>('trophies');
  const trophyData = useQuery(api.gameResults.trophyLeaderboard);
  const survivalData = useQuery(api.gameResults.survivalLeaderboard);

  const renderList = (
    data: { rank: number; displayName: string }[] | undefined,
    getValue: (entry: Record<string, unknown>) => string,
    emptyKey: string,
  ) => {
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
          {t('menu.leaderboard.loading' as TranslationKeys)}
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
          {t(emptyKey as TranslationKeys)}
        </div>
      );
    }

    return (
      <div
        style={{
          width: '100%',
          maxHeight: 260,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {data.map((entry) => (
          <div
            key={entry.rank}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: entry.rank <= 3 ? `${RANK_BADGES[entry.rank - 1]}18` : '#ffffff',
              borderRadius: 10,
              border: `2px solid ${entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : '#e0e0e0'}`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: entry.rank <= 3 ? RANK_BADGES[entry.rank - 1] : '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 900,
                color: entry.rank <= 3 ? '#3e2723' : '#8d6e63',
                flexShrink: 0,
              }}
            >
              {entry.rank}
            </div>
            <div
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 900,
                color: '#3e2723',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.displayName}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#8d6e63',
                flexShrink: 0,
              }}
            >
              {getValue(entry as unknown as Record<string, unknown>)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['trophies', 'survival'] as const).map((key) => (
          <button
            key={key}
            onClick={() => { playTapSound(); setTab(key); }}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.06em',
              color: tab === key ? '#ffffff' : '#8d6e63',
              background: tab === key ? '#8d6e63' : '#f5f0eb',
              border: `2px solid ${tab === key ? '#5d4037' : '#d7ccc8'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {t(`menu.leaderboard.${key}` as TranslationKeys)}
          </button>
        ))}
      </div>
      {tab === 'trophies'
        ? renderList(
            trophyData,
            (e) => t('menu.leaderboard.trophyCount' as TranslationKeys, { count: e.trophyCount as number }),
            'menu.leaderboard.empty',
          )
        : renderList(
            survivalData,
            (e) => t('menu.leaderboard.rounds' as TranslationKeys, { count: e.rounds as number }),
            'menu.leaderboard.emptySurvival',
          )}
    </div>
  );
}
