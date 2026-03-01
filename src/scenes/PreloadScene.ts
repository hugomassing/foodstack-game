import Phaser from 'phaser';
import { FoodAssets } from '../data/food-assets';
import { GAME_W, GAME_H, DPR, TITLE_FONT_FAMILY } from '../config';
import { gameStore } from '../store/gameStore';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0xc62828, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);
    bg.fillStyle(0xff5252, 0.35);
    bg.fillRect(0, 0, GAME_W * 0.6, GAME_H * 0.6);
    bg.fillStyle(0x7f0000, 0.35);
    bg.fillRect(GAME_W * 0.4, GAME_H * 0.4, GAME_W, GAME_H);

    // Title
    this.add
      .text(cx, cy - 40, 'Foodstack', {
        fontSize: '46px',
        fontFamily: TITLE_FONT_FAMILY,
        color: '#ffffff',
        stroke: '#3e2723',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setResolution(DPR);

    // Progress bar
    const barW = 200;
    const barH = 10;
    const barY = cy + 10;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x7f0000, 1);
    barBg.fillRoundedRect(cx - barW / 2, barY, barW, barH, barH / 2);

    const barFill = this.add.graphics();

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0xffffff, 1);
      barFill.fillRoundedRect(
        cx - barW / 2 + 2,
        barY + 2,
        Math.max(0, (barW - 4) * value),
        barH - 4,
        (barH - 4) / 2,
      );
    });

    FoodAssets.preload(this);

    // Audio
    this.load.audio('sfx_step_complete', 'assets/audio/step-complete.mp3');
    this.load.audio('sfx_step_fail', 'assets/audio/step-fail.wav');
    this.load.audio('sfx_card_hover', 'assets/audio/card-hover.wav');
    this.load.audio('sfx_card_drop', 'assets/audio/card-drop.wav');

    // Background food icons
    this.load.image('bg_burrito', 'assets/bg/burrito.png');
    this.load.image('bg_pizza', 'assets/bg/pizza.png');
    this.load.image('bg_ramen', 'assets/bg/ramen.png');
    this.load.image('bg_chicken', 'assets/bg/chicken.png');
    this.load.image('bg_shrimp', 'assets/bg/shrimp.png');
  }

  create(): void {
    gameStore.getState().setAssetsReady(true);
    gameStore.getState().setPhase('menu');
  }
}
