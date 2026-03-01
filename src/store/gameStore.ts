import { createStore } from 'zustand/vanilla';
import type { PuzzleData, Step, GameMode, SurvivalRoundResult } from '../types';

export type GamePhase =
  | 'loading'
  | 'loading_round'
  | 'menu'
  | 'mode_config'
  | 'playing'
  | 'victory'
  | 'game_over'
  | 'recipe_pick';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  phase: GamePhase;
  assetsReady: boolean;
  puzzleData: PuzzleData | null;

  // Gameplay progress (Phaser writes, React reads)
  completedStepIds: Set<string>;
  availableIntermediates: Map<string, string>;
  stepCount: number;
  totalSteps: number;
  allSteps: Step[];
  victoryDish: string | null;
  difficulty: Difficulty;
  victoryImageUrl: string | null;
  victoryImageLoading: boolean;
  errorCount: number;
  maxErrors: number;

  // Auth
  displayName: string | null;
  isAnonymous: boolean;
  showAuthModal: boolean;
  authTransition: boolean;

  // Game mode state
  gameMode: GameMode;
  survivalLives: number;
  survivalRound: number;
  survivalHistory: SurvivalRoundResult[];
  survivalRecipeOptions: string[] | null;
  dailyDate: string | null;

  // Actions
  setAssetsReady: (ready: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  startGame: (data: PuzzleData, difficulty: Difficulty) => void;
  completeStep: (stepId: string, intermediate?: [string, string]) => void;
  initGameplay: (allSteps: Step[], totalSteps: number) => void;
  resetGameplay: () => void;
  setVictory: (dishName: string) => void;
  setVictoryImage: (url: string | null, loading: boolean) => void;
  addError: () => void;

  // Auth actions
  setDisplayName: (name: string | null) => void;
  setIsAnonymous: (anon: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setAuthTransition: (t: boolean) => void;

  // Mode actions
  selectMode: (mode: GameMode) => void;
  startSurvivalRound: (data: PuzzleData, difficulty: Difficulty) => void;
  completeSurvivalRecipe: () => void;
  setSurvivalRecipeOptions: (options: string[]) => void;
}

export const gameStore = createStore<GameState>((set, get) => ({
  phase: 'loading',
  assetsReady: false,
  puzzleData: null,
  completedStepIds: new Set(),
  availableIntermediates: new Map(),
  stepCount: 0,
  totalSteps: 0,
  allSteps: [],
  victoryDish: null,
  difficulty: 'medium',
  victoryImageUrl: null,
  victoryImageLoading: false,
  errorCount: 0,
  maxErrors: 10,

  // Auth defaults
  displayName: null,
  isAnonymous: true,
  showAuthModal: false,
  authTransition: false,

  // Game mode defaults
  gameMode: 'normal',
  survivalLives: 10,
  survivalRound: 0,
  survivalHistory: [],
  survivalRecipeOptions: null,
  dailyDate: null,

  setAssetsReady: (ready) => set({ assetsReady: ready }),

  setPhase: (phase) => set({ phase }),

  startGame: (data, difficulty) => {
    const state = get();
    const maxErrors = state.gameMode === 'survival'
      ? state.survivalLives
      : state.maxErrors;
    set({
      puzzleData: data,
      phase: 'playing',
      difficulty,
      completedStepIds: new Set(),
      availableIntermediates: new Map(),
      stepCount: 0,
      totalSteps: 0,
      allSteps: [],
      victoryDish: null,
      victoryImageUrl: null,
      victoryImageLoading: false,
      errorCount: 0,
      maxErrors,
    });
  },

  completeStep: (stepId, intermediate) =>
    set((state) => {
      const newCompleted = new Set(state.completedStepIds);
      newCompleted.add(stepId);
      const newIntermediates = new Map(state.availableIntermediates);
      if (intermediate) {
        newIntermediates.set(intermediate[0], intermediate[1]);
      }
      return {
        completedStepIds: newCompleted,
        availableIntermediates: newIntermediates,
        stepCount: state.stepCount + 1,
      };
    }),

  initGameplay: (allSteps, totalSteps) => set({ allSteps, totalSteps }),

  resetGameplay: () =>
    set({
      phase: 'menu',
      puzzleData: null,
      completedStepIds: new Set(),
      availableIntermediates: new Map(),
      stepCount: 0,
      totalSteps: 0,
      allSteps: [],
      victoryDish: null,
      difficulty: 'medium',
      victoryImageUrl: null,
      victoryImageLoading: false,
      errorCount: 0,
      maxErrors: 10,
      gameMode: 'normal',
      survivalLives: 10,
      survivalRound: 0,
      survivalHistory: [],
      survivalRecipeOptions: null,
      dailyDate: null,
    }),

  setVictory: (dishName) => set({ phase: 'victory', victoryDish: dishName }),

  setVictoryImage: (url, loading) => set({ victoryImageUrl: url, victoryImageLoading: loading }),

  addError: () =>
    set((state) => {
      const newCount = state.errorCount + 1;
      if (state.gameMode === 'survival') {
        const newLives = state.survivalLives - 1;
        if (newLives <= 0) {
          return { errorCount: newCount, survivalLives: 0, phase: 'game_over' };
        }
        return { errorCount: newCount, survivalLives: newLives };
      }
      if (newCount >= state.maxErrors) {
        return { errorCount: newCount, phase: 'game_over' };
      }
      return { errorCount: newCount };
    }),

  // Auth actions
  setDisplayName: (name) => set({ displayName: name }),
  setIsAnonymous: (anon) => set({ isAnonymous: anon }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setAuthTransition: (t) => set({ authTransition: t }),

  // Mode actions
  selectMode: (mode) => {
    if (mode === 'seeded') {
      set({ gameMode: mode, phase: 'mode_config' });
    } else {
      set({ gameMode: mode });
    }
  },

  startSurvivalRound: (data, difficulty) => {
    const state = get();
    set({
      puzzleData: data,
      phase: 'playing',
      difficulty,
      completedStepIds: new Set(),
      availableIntermediates: new Map(),
      stepCount: 0,
      totalSteps: 0,
      allSteps: [],
      victoryDish: null,
      victoryImageUrl: null,
      victoryImageLoading: false,
      errorCount: 0,
      maxErrors: state.survivalLives,
      survivalRound: state.survivalRound + 1,
      survivalRecipeOptions: null,
    });
  },

  completeSurvivalRecipe: () => {
    const state = get();
    const result: SurvivalRoundResult = {
      dishName: state.puzzleData?.dishName ?? '',
      difficulty: state.difficulty,
      errorsUsed: state.errorCount,
      stepsCompleted: state.stepCount,
      totalSteps: state.totalSteps,
    };
    set({
      survivalHistory: [...state.survivalHistory, result],
      phase: 'recipe_pick',
    });
  },

  setSurvivalRecipeOptions: (options) => set({ survivalRecipeOptions: options }),
}));