import type { I18nMap } from '../types';
import { getLocale } from './index';

export function localize(english: string, i18n?: I18nMap): string {
  const locale = getLocale();
  if (!i18n || locale === 'en') return english;
  return i18n[locale] ?? english;
}