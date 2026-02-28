import { CookingPuzzleScene } from './scenes/CookingPuzzleScene';
import { Preloader } from './Preloader';
import { Play } from './Play';
import Phaser from 'phaser';

const config = {
    title: 'Cooking Puzzle',
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
        CookingPuzzleScene,
        Preloader,
        Play
    ]
};

window.game = new Phaser.Game(config);
