import { TitleScene } from './scenes/TitleScene';
import { CookingPuzzleScene } from './scenes/CookingPuzzleScene';
import Phaser from 'phaser';

const config = {
    title: 'FoodStack',
    type: Phaser.AUTO,
    width: 854,
    height: 480,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        TitleScene,
        CookingPuzzleScene
    ]
};

window.game = new Phaser.Game(config);
