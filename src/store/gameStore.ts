import { createStore } from 'zustand/vanilla';
import type { PuzzleData, Step } from '../types';

export type GamePhase = 'loading' | 'menu' | 'playing' | 'victory' | 'game_over';
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
}

export const gameStore = createStore<GameState>((set) => ({
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

  setAssetsReady: (ready) => set({ assetsReady: ready }),

  setPhase: (phase) => set({ phase }),

  startGame: (data, difficulty) =>
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
    }),

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

  initGameplay: (allSteps, totalSteps) =>
    set({ allSteps, totalSteps }),

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
    }),

  setVictory: (dishName) =>
    set({ phase: 'victory', victoryDish: dishName }),

  setVictoryImage: (url, loading) =>
    set({ victoryImageUrl: url, victoryImageLoading: loading }),

  addError: () =>
    set((state) => {
      const newCount = state.errorCount + 1;
      if (newCount >= state.maxErrors) {
        return { errorCount: newCount, phase: 'game_over' };
      }
      return { errorCount: newCount };
    }),
}));
