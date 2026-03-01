import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import en from './locales/en.json';
import type { TranslationKeys, LocaleDict } from './types';

interface LocaleState {
  locale: string;
  dict: LocaleDict;
  setLocale: (locale: string, dict: LocaleDict) => void;
}

const localeStore = createStore<LocaleState>((set) => ({
  locale: 'en',
  dict: en,
  setLocale: (locale, dict) => set({ locale, dict }),
}));

function resolve(dict: LocaleDict, key: string): string | undefined {
  let current: unknown = dict;
  for (const part of key.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(key: TranslationKeys, params?: Record<string, string | number>): string {
  const { dict } = localeStore.getState();
  let value = resolve(dict, key) ?? resolve(en, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

export function useTranslation() {
  const dict = useSyncExternalStore(localeStore.subscribe, () => localeStore.getState().dict);
  // Return a bound t that uses the current dict (triggers re-render on change)
  const translate = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    let value = resolve(dict, key) ?? resolve(en, key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  };
  return { t: translate, locale: localeStore.getState().locale };
}

export function getLocale(): string {
  return localeStore.getState().locale;
}

export async function loadLocale(locale: string): Promise<void> {
  const mod = await import(`./locales/${locale}.json`);
  localeStore.getState().setLocale(locale, mod.default);
}