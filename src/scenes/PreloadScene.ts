import Phaser from 'phaser';
import { FoodAssets } from '../data/food-assets';
import { GAME_W, GAME_H, DPR, FONT_FAMILY } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const cx = (GAME_W * DPR) / 2;
    const cy = (GAME_H * DPR) / 2;
    const barW = 260 * DPR;
    const barH = 18 * DPR;

    this.add
      .text(cx, cy - 40 * DPR, 'Loading assets...', {
        fontSize: `${14 * DPR}px`,
        color: '#aaaacc',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);

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
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}