import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { CookingPuzzleScene } from './scenes/CookingPuzzleScene';

const config: Phaser.Types.Core.GameConfig = {
  title: 'FoodStack',
  type: Phaser.AUTO,
  width: 854,
  height: 480,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, CookingPuzzleScene],
};

new Phaser.Game(config);
