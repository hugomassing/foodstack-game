export type CardType = 'ingredient' | 'intermediate' | 'error' | 'processor';

export type GameMode = 'daily' | 'survival' | 'normal' | 'seeded';

export interface SurvivalRoundResult {
  dishName: string;
  difficulty: import('./store/gameStore').Difficulty;
  errorsUsed: number;
  stepsCompleted: number;
  totalSteps: number;
}

export type I18nMap = Record<string, string>;
export interface Step {
  stepId: string;
  processor: string;
  processorEmoji?: string;
  questTitle?: string;
  questTitleI18n?: I18nMap;
  hint?: string;
  hintI18n?: I18nMap;
  inputs: string[];
  output: string;
  outputI18n?: I18nMap;
  outputAssetId?: string | null;
}

export interface Branch {
  name: string;
  nameI18n?: I18nMap;
  steps: Step[];
}

export interface Ingredient {
  name: string;
  nameI18n?: I18nMap;
  emoji: string;
  assetId?: string | null;
}

export interface PuzzleData {
  dishName: string;
  dishNameI18n?: I18nMap;
  branches: Branch[];
  finalStep: Step;
  ingredients: Ingredient[];
  decoys: Ingredient[];
  processors: { name: string; displayNameI18n?: I18nMap; emoji: string; assetId?: string | null }[];
}

export interface Attachment {
  card: import('./gameObjects/PuzzleCard').PuzzleCard;
  itemName: string;
  stepId: string | null;
}