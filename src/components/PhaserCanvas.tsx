import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from '../scenes/PreloadScene';
import { CookingPuzzleScene } from '../scenes/CookingPuzzleScene';
import { GAME_W, GAME_H, DPR } from '../config';
import { gameStore } from '../store/gameStore';

export function PhaserCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const game = new Phaser.Game({
      title: 'FoodStack',
      type: Phaser.AUTO,
      width: Math.round(GAME_W * DPR),
      height: Math.round(GAME_H * DPR),
      parent: containerRef.current,
      backgroundColor: '#d32f2f',
      scale: {
        mode: Phaser.Scale.NONE,
      },
      dom: { createContainer: true },
      scene: [PreloadScene, CookingPuzzleScene],
    });

    // Render at DPR resolution but display at logical size for CSS transform scaling
    game.canvas.style.width = `${GAME_W}px`;
    game.canvas.style.height = `${GAME_H}px`;

    gameRef.current = game;

    // Listen for phase changes to start/stop the CookingPuzzleScene
    const unsub = gameStore.subscribe((state, prev) => {
      if (state.phase === 'playing' && prev.phase !== 'playing') {
        const puzzleData = state.puzzleData;
        if (puzzleData && game.scene.isActive('CookingPuzzleScene') === false) {
          game.scene.start('CookingPuzzleScene', { puzzleData });
        }
      }
      if (state.phase !== 'playing' && prev.phase === 'playing') {
        if (game.scene.isActive('CookingPuzzleScene')) {
          game.scene.stop('CookingPuzzleScene');
        }
      }
    });

    return () => {
      unsub();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GAME_W,
        height: GAME_H,
      }}
    />
  );
}