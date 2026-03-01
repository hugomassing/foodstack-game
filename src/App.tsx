import { useSyncExternalStore } from 'react';
import { gameStore } from './store/gameStore';
import { GameShell } from './components/GameShell';
import { PhaserCanvas } from './components/PhaserCanvas';
import { LoadingScreen } from './components/LoadingScreen';
import { ModeSelector } from './components/ModeSelector';
import { GameMenu } from './components/GameMenu';
import { QuestBookPanel } from './components/QuestBookPanel';
import { VictoryOverlay } from './components/VictoryOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import { RecipePickOverlay } from './components/RecipePickOverlay';

function useGameStore<T>(selector: (state: ReturnType<typeof gameStore.getState>) => T): T {
  return useSyncExternalStore(gameStore.subscribe, () => selector(gameStore.getState()));
}

export { useGameStore };
export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <GameShell>
      <PhaserCanvas />

      {phase === 'loading' && <LoadingScreen />}
      {phase === 'menu' && <ModeSelector />}
      {phase === 'mode_config' && <GameMenu />}
      {phase === 'playing' && (
        <>
          <QuestBookPanel />
        </>
      )}
      {phase === 'victory' && (
        <>
          <QuestBookPanel />
          <VictoryOverlay />
        </>
      )}
      {phase === 'game_over' && (
        <>
          <QuestBookPanel />
          <GameOverOverlay />
        </>
      )}
      {phase === 'recipe_pick' && <RecipePickOverlay />}
    </GameShell>
  );
}