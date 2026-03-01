import { useSyncExternalStore, useEffect, useRef } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../convex/_generated/api';
import { gameStore } from './store/gameStore';
import { loadLocale } from './i18n';
import { GameShell } from './components/GameShell';
import { PhaserCanvas } from './components/PhaserCanvas';
import { LoadingScreen } from './components/LoadingScreen';
import { ModeSelector } from './components/ModeSelector';
import { GameMenu } from './components/GameMenu';
import { QuestBookPanel } from './components/QuestBookPanel';
import { VictoryOverlay } from './components/VictoryOverlay';
import { GameOverOverlay } from './components/GameOverOverlay';
import { RecipePickOverlay } from './components/RecipePickOverlay';
import { AuthModal } from './components/AuthModal';
import { HealthBar } from './components/HealthBar';

function useGameStore<T>(selector: (state: ReturnType<typeof gameStore.getState>) => T): T {
  return useSyncExternalStore(gameStore.subscribe, () => selector(gameStore.getState()));
}

export { useGameStore };

/** Non-blocking auth: tries to sign in anonymously but never blocks rendering. */
function useAutoAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const signingIn = useRef(false);

  // Auto sign-in as anonymous when unauthenticated
  useEffect(() => {
    const inTransition = gameStore.getState().authTransition;
    if (!isLoading && !isAuthenticated && !signingIn.current && !inTransition) {
      signingIn.current = true;
      void signIn('anonymous').finally(() => {
        signingIn.current = false;
      });
    }
  }, [isLoading, isAuthenticated, signIn]);

  // Sync user profile to game store whenever viewer updates
  useEffect(() => {
    if (viewer) {
      gameStore.getState().setDisplayName(viewer.displayName);
      gameStore.getState().setIsAnonymous(viewer.isAnonymous);
      if (viewer.locale) {
        void loadLocale(viewer.locale);
      }
      if (viewer.needsUsername) {
        gameStore.getState().setShowAuthModal(true);
      }
    }
  }, [viewer]);
}

export default function App() {
  useAutoAuth();
  const phase = useGameStore((s) => s.phase);
  const showAuthModal = useGameStore((s) => s.showAuthModal);

  return (
    <>
      <GameShell>
        <PhaserCanvas />

        {phase === 'loading' && <LoadingScreen />}
        {phase === 'menu' && <ModeSelector />}
        {phase === 'mode_config' && <GameMenu />}
        {phase === 'playing' && (
          <>
            <QuestBookPanel />
            <HealthBar />
          </>
        )}
        {phase === 'victory' && (
          <>
            <QuestBookPanel />
            <HealthBar />
            <VictoryOverlay />
          </>
        )}
        {phase === 'game_over' && (
          <>
            <QuestBookPanel />
            <HealthBar />
            <GameOverOverlay />
          </>
        )}
        {phase === 'recipe_pick' && <RecipePickOverlay />}
      </GameShell>
      {showAuthModal && <AuthModal />}
    </>
  );
}
