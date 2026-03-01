import { useState, useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTranslation, loadLocale } from '../../i18n';
import { LOCALES } from './constants';

export function LanguageSwitcher() {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const saveLocale = useMutation(api.users.setLocale);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          borderRadius: 12,
          background: '#fffaf0',
          border: '2px solid #3e2723',
          boxShadow: '0 3px 0 #3e2723',
          cursor: 'pointer',
          fontSize: 22,
          lineHeight: 1,
          height: 36,
          boxSizing: 'border-box',
          padding: '0 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          transition: 'transform 0.1s',
          transform: open ? 'translateY(2px)' : 'none',
        }}
      >
        {current.flag}
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            right: 0,
            background: '#fffaf0',
            border: '3px solid #3e2723',
            borderRadius: 14,
            boxShadow: '0 6px 0 #3e2723',
            padding: 6,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 4,
          }}
        >
          {LOCALES.map((l) => (
            <div
              key={l.code}
              onClick={() => {
                loadLocale(l.code);
                saveLocale({ locale: l.code }).catch(() => { });
                setOpen(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
                background: l.code === locale ? '#ffca28' : 'transparent',
                border: l.code === locale ? '2px solid #3e2723' : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              {l.flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
