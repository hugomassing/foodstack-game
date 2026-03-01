import { getWordlists } from '../data/wordlists/index';
import { CATEGORIES, DISH_NAME_TEMPLATES, formatDishName } from './dishName';
import type { Category } from './dishName';

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function getDailyDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyDishName(): string {
  const date = getDailyDate();
  const hash = djb2(`foodstack-daily-${date}`);
  const wl = getWordlists('en');

  const indices: Record<Category, number> = {} as Record<Category, number>;
  let h = hash;
  for (const cat of CATEGORIES) {
    indices[cat] = h % wl[cat].length;
    h = djb2(`${h}-${cat}`);
  }

  const words = Object.fromEntries(CATEGORIES.map((c) => [c, wl[c][indices[c]]])) as Record<
    Category,
    string
  >;

  return formatDishName(DISH_NAME_TEMPLATES.en, words);
}

const DAILY_BEST_KEY = 'foodstack-daily-best';

export function getDailyBestScore(date: string): number | null {
  try {
    const stored = localStorage.getItem(DAILY_BEST_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as Record<string, number>;
    return data[date] ?? null;
  } catch {
    return null;
  }
}

export function setDailyBestScore(date: string, errorCount: number): void {
  try {
    const stored = localStorage.getItem(DAILY_BEST_KEY);
    const data: Record<string, number> = stored ? JSON.parse(stored) : {};
    const existing = data[date];
    if (existing === undefined || errorCount < existing) {
      data[date] = errorCount;
      localStorage.setItem(DAILY_BEST_KEY, JSON.stringify(data));
    }
  } catch {
    // localStorage unavailable
  }
}