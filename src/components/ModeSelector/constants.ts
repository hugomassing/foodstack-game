import type { Difficulty } from '../../store/gameStore';

export const SPLASH_TEXTS = [
  'Now with more AI!',
  'Your favorite chef!',
  '100% secret ingredients!',
  'No Michelin stars yet!',
  "Chef's kiss!",
  'Fork yeah!',
  'Gluten-free code!',
  'Spicy content inside!',
  'Made with real recipes!',
  'No actual cooking required!',
  'Michelin stars loading…',
  'Feed your curiosity!',
  'Taste the algorithm!',
  'Better than delivery!',
  'Zero calories. Probably.',
  'As seen on no TV!',
];

export const LOCALES = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'it', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ko', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'zh', flag: '\u{1F1E8}\u{1F1F3}' },
];

export const FOOD_ICONS = [
  '/assets/sprites/food/protein/steak.png',
  '/assets/sprites/food/protein/ham.png',
  '/assets/sprites/food/prepared/pizza.png',
  '/assets/sprites/food/prepared/sandwich.png',
  '/assets/sprites/food/vegetable/carrot.png',
  '/assets/sprites/food/utensil/fork_knife.png',
  '/assets/sprites/food/utensil/fire.png',
  '/assets/sprites/food/utensil/pouring_liquid.png',
  '/assets/sprites/food/drink/hot_beverage.png',
];

export const LOADING_ASSETS = [
  '/assets/sprites/food/vegetable/carrot.png',
  '/assets/sprites/food/utensil/knife.png',
  '/assets/sprites/food/utensil/frying_pan.png',
  '/assets/sprites/food/utensil/salt_shaker.png',
  '/assets/sprites/food/utensil/fork_knife.png',
  '/assets/sprites/food/utensil/plate.png',
  '/assets/sprites/food/utensil/bowl_spoon.png',
  '/assets/sprites/food/utensil/fire.png',
  '/assets/sprites/food/dairy/butter.png',
  '/assets/sprites/food/utensil/pouring_liquid.png',
];

export const CHILI_SRC = '/assets/sprites/food/vegetable/chili.png';

export const DIFFICULTIES: { value: Difficulty; count: number }[] = [
  { value: 'easy', count: 1 },
  { value: 'medium', count: 2 },
  { value: 'hard', count: 3 },
];

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4caf50',
  medium: '#ff9800',
  hard: '#e53935',
};

export const MODE_COLORS: Record<string, string> = {
  daily: '#ff9800',
  survival: '#e53935',
  normal: '#29b6f6',
  seeded: '#7e57c2',
};

export const DIFFICULTY_CHILIS: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};
