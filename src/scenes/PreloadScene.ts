import Phaser from 'phaser';
import { FoodAssets } from '../data/food-assets';
import { GAME_W, GAME_H, DPR, FONT_FAMILY } from '../config';
import { gameStore } from '../store/gameStore';
import { t } from '../i18n';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const barW = 260;
    const barH = 18;

    this.add
      .text(cx, cy - 40, t('loading.assets'), {
        fontSize: '14px',
        color: '#aaaacc',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setResolution(DPR);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x333355, 1);
    barBg.fillRoundedRect(cx - barW / 2, cy - barH / 2, barW, barH, barH / 2);

    const barFill = this.add.graphics();

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0x2ecc71, 1);
      barFill.fillRoundedRect(cx - barW / 2, cy - barH / 2, barW * value, barH, barH / 2);
    });

    FoodAssets.preload(this);

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
