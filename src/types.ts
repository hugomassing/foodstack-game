export type CardType = 'ingredient' | 'intermediate' | 'error' | 'processor';

export type GameMode = 'daily' | 'survival' | 'normal' | 'seeded';

export interface SurvivalRoundResult {
  dishName: string;
  difficulty: import('./store/gameStore').Difficulty;
  errorsUsed: number;
  stepsCompleted: number;
  totalSteps: number;
}

export interface Step {
  stepId: string;
  processor: string;
  processorEmoji?: string;
  questTitle?: string;
  hint?: string;
  inputs: string[];
  output: string;
  outputAssetId?: string | null;
}

export interface Branch {
  name: string;
  steps: Step[];
}

export interface Ingredient {
  name: string;
  emoji: string;
  assetId?: string | null;
}

export interface PuzzleData {
  dishName: string;
  branches: Branch[];
  finalStep: Step;
  ingredients: Ingredient[];
  decoys: Ingredient[];
  processors: { name: string; emoji: string; assetId?: string | null }[];
}

export interface Attachment {
  card: import('./gameObjects/PuzzleCard').PuzzleCard;
  itemName: string;
  stepId: string | null;
}