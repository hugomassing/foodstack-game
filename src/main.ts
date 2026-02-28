import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { CookingPuzzleScene } from './scenes/CookingPuzzleScene';
import { GAME_W, GAME_H, DPR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  title: 'FoodStack',
  type: Phaser.AUTO,
  width: GAME_W * DPR,
  height: GAME_H * DPR,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, CookingPuzzleScene],
};

new Phaser.Game(config);