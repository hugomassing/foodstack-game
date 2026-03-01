export const GAME_W = 960;
export const GAME_H = 540;
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

export const FONT_FAMILY = "'Fredoka One', Arial, sans-serif";
export const TITLE_FONT_FAMILY = "'Novibes Display', 'Fredoka One', Arial, sans-serif";

// Quest panel
export const QUEST_PANEL_W = 240;

// Reserved space at top of board (header removed)
export const TOPBAR_H = 0;

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
  QUEST_BG: 0xfff8e7,
  SEPARATOR: 0x222222,
  QUEST_ITEM_ACTIVE: 0xfef9c3,
  SUCCESS_FLASH: 0x2ecc71,
  PROCESSOR_RING: 0xf1c40f,
  OVERLAY: 0x000000,
} as const;

// Text colors (CSS strings)
export const TEXT_COLORS = {
  GOLD: '#f1c40f',
  WHITE: '#ffffff',
  DARK: '#1a1a1a',
  DIM: '#9ca3af',
  BRANCH: '#6b7280',
  SUCCESS: '#16a34a',
  LINK: '#5dade2',
  LINK_HOVER: '#85c1e9',
  DEBUG: '#e67e22',
  STEP_COUNTER: '#6b7280',
} as const;

// Pile / attachment layout
export const PILE = {
  OFFSET_Y: 18,
  BASE_Y: 22,
} as const;

// Scatter padding
export const SCATTER = {
  PAD: 10,
  FOOTER: 44,
  CARD_GAP: 8,
  GRID_GAP: 14,
  GRID_JITTER: 5,
  MAX_ATTEMPTS: 15,
} as const;

// Processor ring (legacy, kept for reference)
export const PROCESSOR_RING_PAD = 4;

// Processor zones (full-width columns across top of board)
export const ZONE = {
  HEIGHT_FRACTION: 1 / 3, // zone occupies top 1/3 of board
  BG_COLOR: 0xe8d5be, // darker than board 0xf5e6d3
  SEPARATOR_COLOR: 0x8d6e63,
  HIGHLIGHT_COLOR: 0x00ff88,
  HIGHLIGHT_FILL_ALPHA: 0.08,
  ICON_Y_OFFSET: -10, // icon vertical offset from zone center
  LABEL_Y_OFFSET: 28, // label below icon
  DISABLED_ALPHA: 0.4,
  CARD_START_OFFSET: 14, // gap below zone bottom for attached cards
} as const;

// Hand arc layout
export const HAND = {
  ARC_RADIUS: 350,
  CARD_SCALE: 0.85,
  HOVER_LIFT: 60,
  HOVER_SCALE: 1.2,
  MAX_ANGLE_SPREAD: 0.85, // radians total spread
  CENTER_X_OFFSET: -80, // shift left from game center
  CENTER_Y_OFFSET: -85, // from GAME_H bottom
} as const;