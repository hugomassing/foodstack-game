import type { TranslationKeys } from '../i18n/types';

export type Category = 'Style' | 'Filling' | 'Method' | 'Base';

export type WordLists = Record<Category, string[]> & { FillingGender?: ('m' | 'f')[] };

export const CATEGORIES: Category[] = ['Style', 'Filling', 'Method', 'Base'];

export const CATEGORY_KEYS: Record<Category, TranslationKeys> = {
  Style: 'menu.category.style',
  Filling: 'menu.category.filling',
  Method: 'menu.category.method',
  Base: 'menu.category.base',
};

export const DISH_NAME_TEMPLATES: Record<string, string> = {
  en: '{Style} {Filling} {Method} {Base}',
  fr: '{Base} {Method} {au}{Filling} {Style}',
  de: '{Style} {Method} {Filling}-{Base}',
  es: '{Base} {Method} de {Filling} {Style}',
  it: '{Base} {Method} {al}{Filling} {Style}',
  ja: '{Style}{Filling}{Method}{Base}',
  ko: '{Style} {Filling} {Method} {Base}',
  pt: '{Base} {Method} de {Filling} {Style}',
  zh: '{Style}{Method}{Filling}{Base}',
};

function startsWithVowelOrH(word: string): boolean {
  return /^[aeiouhàâéèêëïîôùûüœæ]/i.test(word);
}

function resolvePreposition(token: string, filling: string, gender: 'm' | 'f'): string {
  const vowel = startsWithVowelOrH(filling);
  switch (token) {
    case 'au':
      if (vowel) return "à l'";
      return gender === 'f' ? 'à la ' : 'au ';
    case 'al':
      if (vowel) return "all'";
      return gender === 'f' ? 'alla ' : 'al ';
    default:
      return token;
  }
}

export function formatDishName(
  template: string,
  words: Record<Category, string>,
  fillingGender?: 'm' | 'f',
): string {
  let result = template
    .replace('{Style}', words.Style)
    .replace('{Filling}', words.Filling)
    .replace('{Method}', words.Method)
    .replace('{Base}', words.Base);

  result = result.replace(/\{(au|al)\}/g, (_, token: string) =>
    resolvePreposition(token, words.Filling, fillingGender ?? 'm'),
  );

  return result;
}

export function randomSelections(wl: WordLists): Record<Category, number> {
  const result = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    result[cat] = Math.floor(Math.random() * wl[cat].length);
  }
  return result;
}

export function randomDishName(wl: WordLists, locale: string): string {
  const indices = randomSelections(wl);
  const words = Object.fromEntries(CATEGORIES.map((c) => [c, wl[c][indices[c]]])) as Record<
    Category,
    string
  >;
  const fillingGender = wl.FillingGender?.[indices.Filling];
  const template = DISH_NAME_TEMPLATES[locale] ?? DISH_NAME_TEMPLATES.en;
  return formatDishName(template, words, fillingGender);
}