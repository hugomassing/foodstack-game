import Phaser from 'phaser';
import {
  FoodCard,
  FOOD_CARD_COLORS,
  FOOD_CARD_W,
  FOOD_CARD_H,
  FOOD_CARD_RADIUS,
  nameToColor,
} from './FoodCard';
import { COLORS, PROCESSOR_RING_PAD } from '../config';
import type { CardType } from '../types';

export class PuzzleCard extends FoodCard {
  cardType: CardType;
  cardLabel: string;
  itemName: string;
  stepId: string | null;
  attachedTo: PuzzleCard | null = null;
  cardDepth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    type: CardType,
    meta: { emoji?: string; itemName?: string; stepId?: string } = {},
  ) {
    const cardColor = type === 'processor' ? FOOD_CARD_COLORS.blue : nameToColor(label);

    super(scene, x, y, {
      name: label,
      emoji: meta.emoji ?? '',
      color: cardColor,
      wave: type !== 'processor',
    });

    this.cardType = type;
    this.cardLabel = label;
    this.itemName = meta.itemName ?? label;
    this.stepId = meta.stepId ?? null;
    this.cardDepth = type === 'processor' ? 2 : 1;
    this.setDepth(this.cardDepth);

    if (type === 'processor') {
      this.setInteractive({ draggable: true, dropZone: true });
      const ring = scene.add.graphics();
      const pad = PROCESSOR_RING_PAD;
      ring.lineStyle(2, COLORS.PROCESSOR_RING, 0.8);
      ring.strokeRoundedRect(
        -FOOD_CARD_W / 2 - pad,
        -FOOD_CARD_H / 2 - pad,
        FOOD_CARD_W + pad * 2,
        FOOD_CARD_H + pad * 2,
        FOOD_CARD_RADIUS + pad,
      );
      this.add(ring);
    } else {
      this.setInteractive({ draggable: true });
    }
  }
}