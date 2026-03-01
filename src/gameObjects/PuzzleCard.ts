import Phaser from 'phaser';
import {
  FoodCard,
  FOOD_CARD_COLORS,
  FOOD_CARD_W,
  FOOD_CARD_H,
  FOOD_CARD_RADIUS,
  nameToColor,
  hexToCardColor,
} from './FoodCard';
import { FoodAssets } from '../data/food-assets';
import { FONT_FAMILY, DPR } from '../config';
import type { CardType } from '../types';

export class PuzzleCard extends FoodCard {
  cardType: CardType;
  cardLabel: string;
  itemName: string;
  stepId: string | null;
  attachedTo: string | null = null;
  cardDepth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    type: CardType,
    meta: { emoji?: string; itemName?: string; stepId?: string; assetId?: string | null } = {},
  ) {
    const asset = meta.assetId ? FoodAssets.find(meta.assetId) : undefined;
    const cardColor =
      type === 'processor'
        ? FOOD_CARD_COLORS.blue
        : type === 'error'
          ? FOOD_CARD_COLORS.error
          : type === 'intermediate'
            ? FOOD_CARD_COLORS.dark
            : asset
              ? hexToCardColor(asset.color)
              : nameToColor(label);

    super(scene, x, y, {
      name: label,
      emoji: meta.emoji ?? '',
      color: cardColor,
      wave: type !== 'processor',
      assetId: meta.assetId,
    });

    this.cardType = type;
    this.cardLabel = label;
    this.itemName = meta.itemName ?? label;
    this.stepId = meta.stepId ?? null;
    this.cardDepth = type === 'processor' ? 2 : 1;
    this.setDepth(this.cardDepth);

    this.setInteractive({ draggable: true });

    // Error card decorations
    if (type === 'error') {
      const w = FOOD_CARD_W;
      const h = FOOD_CARD_H;
      const ox = -w / 2;
      const oy = -h / 2;

      // Diagonal hazard stripes (subtle, behind content)
      const stripes = scene.add.graphics();
      const stripeW = 8;
      const stripeGap = 14;
      stripes.lineStyle(stripeW, 0x8b0000, 0.15);
      for (let s = -h; s < w + h; s += stripeGap) {
        stripes.lineBetween(ox + s, oy + h, ox + s + h, oy);
      }
      // Mask stripes to card bounds using a second fill
      const mask = scene.add.graphics();
      mask.fillStyle(0xffffff);
      mask.fillRoundedRect(ox, oy, w, h, FOOD_CARD_RADIUS);
      const geoMask = mask.createGeometryMask();
      stripes.setMask(geoMask);
      this.add(stripes);
      // Move stripes behind the image/emoji but in front of the wave
      this.sendToBack(stripes);
      this.sendToBack(this.cardBody);
      this.sendToBack(this.shadow);

      // Red glow border
      const glow = scene.add.graphics();
      glow.lineStyle(3, 0xff3333, 0.6);
      glow.strokeRoundedRect(ox - 1, oy - 1, w + 2, h + 2, FOOD_CARD_RADIUS + 1);
      this.add(glow);

      // Warning badge (top-right corner)
      const badgeX = w / 2 - 2;
      const badgeY = -h / 2 + 2;
      const badge = scene.add.graphics();
      badge.fillStyle(0xe74c3c, 1);
      badge.fillCircle(badgeX, badgeY, 11);
      badge.lineStyle(2, 0x8b0000, 1);
      badge.strokeCircle(badgeX, badgeY, 11);
      this.add(badge);

      const exclaim = scene.add
        .text(badgeX, badgeY, '!', {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffffff',
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0.5)
        .setResolution(DPR);
      this.add(exclaim);
    }
  }
}