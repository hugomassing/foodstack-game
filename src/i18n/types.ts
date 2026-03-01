import type en from './locales/en.json';

type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: FlattenKeys<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>;
    }[keyof T & string]
  : Prefix;

export type TranslationKeys = FlattenKeys<typeof en>;

export type LocaleDict = typeof en;