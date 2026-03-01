import { useSyncExternalStore } from 'react';
import { gameStore } from './store/gameStore';
import { GameShell } from './components/GameShell';
import { PhaserCanvas } from './components/PhaserCanvas';
import { LoadingScreen } from './components/LoadingScreen';
import { GameMenu } from './components/GameMenu';
import { QuestBookPanel } from './components/QuestBookPanel';
import { VictoryOverlay } from './components/VictoryOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';

function useGameStore<T>(selector: (state: ReturnType<typeof gameStore.getState>) => T): T {
  return useSyncExternalStore(
    gameStore.subscribe,
    () => selector(gameStore.getState()),
  );
}

export { useGameStore };

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <GameShell>
      <PhaserCanvas />

      {phase === 'loading' && <LoadingScreen />}
      {phase === 'menu' && <GameMenu />}
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
    </GameShell>
  );
}
