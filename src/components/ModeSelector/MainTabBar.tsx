import { Clock, Play, Trophy } from 'lucide-react';
import { FONT_FAMILY } from '../../config';
import { useTranslation } from '../../i18n';
import type { TranslationKeys } from '../../i18n/types';
import { playTapSound } from './sounds';

export type MainTab = 'modes' | 'rankings' | 'history' | 'trophies';

const MAIN_TAB_ITEMS: { value: MainTab; labelKey: TranslationKeys; icon: typeof Trophy }[] = [
  { value: 'modes', labelKey: 'menu.tabs.cook', icon: Play },
  { value: 'trophies', labelKey: 'menu.tabs.trophies' as TranslationKeys, icon: Trophy },
  { value: 'rankings', labelKey: 'menu.tabs.leaderboard', icon: Trophy },
  { value: 'history', labelKey: 'menu.tabs.history', icon: Clock },
];

export function MainTabBar({ value, onChange }: { value: MainTab; onChange: (tab: MainTab) => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ width: '100%', display: 'flex', gap: 4, marginBottom: 4 }}>
      {MAIN_TAB_ITEMS.map((item) => {
        const active = value === item.value;
        const Icon = item.icon;
        return (
          <div
            key={item.value}
            onClick={() => { playTapSound(); onChange(item.value); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 10,
              border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
              background: active ? '#3e2723' : '#ffffff',
              color: active ? '#ffffff' : '#8d6e63',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s',
              boxShadow: active ? '0 3px 0 #2a1a12' : '0 2px 0 #e0e0e0',
            }}
          >
            <Icon size={13} strokeWidth={3} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.08em',
                fontFamily: FONT_FAMILY,
              }}
            >
              {t(item.labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
