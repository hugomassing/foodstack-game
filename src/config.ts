export const GAME_W = 960;
export const GAME_H = 540;
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

export const FONT_FAMILY = 'Arial, sans-serif';

// Quest panel
export const QUEST_PANEL_W = 280;

export const QUEST_BOOK = {
  TITLE_Y: 16,
  START_Y: 50,
  LINE_H: 22,
  PAD_X: 14,
  INDENT: 8,
  BRANCH_GAP: 6,
} as const;

// Colors (hex ints)
export const COLORS = {
  QUEST_BG: 0x151528,
  SEPARATOR: 0x444466,
  SUCCESS_FLASH: 0x2ecc71,
  PROCESSOR_RING: 0xf1c40f,
  OVERLAY: 0x000000,
} as const;

// Text colors (CSS strings)
export const TEXT_COLORS = {
  GOLD: '#f1c40f',
  WHITE: '#ffffff',
  DIM: '#666688',
  BRANCH: '#aaaacc',
  SUCCESS: '#2ecc71',
  LINK: '#5dade2',
  LINK_HOVER: '#85c1e9',
  DEBUG: '#e67e22',
  STEP_COUNTER: '#aaaacc',
} as const;

// Pile / attachment layout
export const PILE = {
  OFFSET_Y: 18,
  BASE_Y: 22,
} as const;

// Scatter padding
export const SCATTER = {
  PAD: 10,
  FOOTER: 30,
  CARD_GAP: 8,
  GRID_GAP: 14,
  GRID_JITTER: 5,
  MAX_ATTEMPTS: 15,
} as const;

// Processor ring
export const PROCESSOR_RING_PAD = 4;