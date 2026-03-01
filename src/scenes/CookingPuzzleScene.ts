import Phaser from 'phaser';
import { FOOD_CARD_W, FOOD_CARD_H, FOOD_CARD_RADIUS } from '../gameObjects/FoodCard';
import { PuzzleCard } from '../gameObjects/PuzzleCard';
import {
  GAME_W,
  GAME_H,
  FONT_FAMILY,
  QUEST_PANEL_W,
  COLORS,
  TEXT_COLORS,
  PILE,
  SCATTER,
  PROCESSOR_RING_PAD,
  HAND,
  DPR,
} from '../config';
import { FoodAssets } from '../data/food-assets';
import { gameStore } from '../store/gameStore';
import { convex } from '../lib/convex';
import { api } from '../../convex/_generated/api';
import type { PuzzleData, Step, Ingredient, Attachment } from '../types';
import { t, getLocale } from '../i18n';

const PROCESSOR_ASSET: Record<string, string> = {
  mix: 'bowl_spoon',
  chop: 'knife',
  boil: 'cooking_pot',
  fry: 'frying_pan',
  bake: 'oven_mitt',
  grill: 'fire',
  roast: 'fire',
  knead: 'spoon',
  shape: 'plate',
  mash: 'spoon',
  steam: 'cooking_pot',
  toast: 'shallow_pan',
  melt: 'shallow_pan',
  assemble: 'fork_knife',
};

const APPROX_MAP: Record<string, string> = {
  pork: 'ham',
  'pork chops': 'ham',
  'ground pork': 'ham',
  beef: 'steak',
  'ground beef': 'steak',
  'beef strips': 'steak',
  chicken: 'drumstick',
  'chicken breast': 'drumstick',
  'chicken thigh': 'drumstick',
  'bell pepper': 'pepper',
  jalapeño: 'pepper',
  'chili peppers': 'chili',
  'spring onion': 'onion',
  scallion: 'onion',
  shallot: 'onion',
  tortilla: 'flatbread',
  wrap: 'flatbread',
  'pita bread': 'pita',
  'bread crumbs': 'bread_slice',
  'cream cheese': 'cream',
  'sour cream': 'cream',
  broth: 'soup',
  stock: 'soup',
  'fish sauce': 'soy_sauce',
  syrup: 'honey',
  'maple syrup': 'honey',
  vinegar: 'soy_sauce',
  'rice noodles': 'noodles',
  'egg noodles': 'noodles',
  'sesame oil': 'olive_oil',
  'cooking oil': 'olive_oil',
  oil: 'olive_oil',
  'lime juice': 'lime',
  'lemon juice': 'lemon',
  'whipped cream': 'cream',
  'heavy cream': 'cream',
  mozzarella: 'cheese',
  parmesan: 'cheese',
  cheddar: 'cheese',
};

function localAssetMatch(name: string): string | null {
  const lower = name.toLowerCase();
  const normalized = lower.replace(/\s+/g, '_');

  if (FoodAssets.find(normalized)) return normalized;

  for (const item of FoodAssets.all) {
    if (item.label.toLowerCase() === lower) return item.id;
  }

  if (normalized.endsWith('s') && FoodAssets.find(normalized.slice(0, -1))) {
    return normalized.slice(0, -1);
  }

  if (APPROX_MAP[lower]) return APPROX_MAP[lower];

  const words = lower.split(/\s+/);
  for (const word of words) {
    if (FoodAssets.find(word)) return word;
    const singular = word.endsWith('s') ? word.slice(0, -1) : null;
    if (singular && FoodAssets.find(singular)) return singular;
    if (APPROX_MAP[word]) return APPROX_MAP[word];
  }

  for (const word of words) {
    const tagged = FoodAssets.byTag(word);
    if (tagged.length > 0) return tagged[0].id;
  }

  return null;
}

// Board dimensions (expanded — header removed)
const BD_X = 248;
const BD_Y = 10;
const BD_W = 704;
const BD_H = 440;
const BD_R = 20;

interface HandSlot {
  x: number;
  y: number;
  rotation: number;
  depth: number;
}

export class CookingPuzzleScene extends Phaser.Scene {
  private puzzleData!: PuzzleData;
  private completedSteps!: Set<string>;
  private availableIntermediates!: Map<string, string>;
  private stepCount!: number;
  private cards!: PuzzleCard[];
  private processorCards!: Map<string, PuzzleCard>;
  private processorAttachments!: Map<PuzzleCard, Attachment[]>;
  private allSteps!: Step[];
  private totalSteps!: number;
  private hoveredProcessor: PuzzleCard | null = null;
  private dropHighlight!: Phaser.GameObjects.Graphics;
  private activeProcessor: PuzzleCard | null = null;
  private cookButton: Phaser.GameObjects.Container | null = null;

  // Hand system
  private handCards!: PuzzleCard[];
  private handSlots!: Map<PuzzleCard, HandSlot>;
  private handToBoardCard!: Map<PuzzleCard, PuzzleCard>;
  private boardToHandCard!: Map<PuzzleCard, PuzzleCard>;
  private ingredientMeta!: Map<PuzzleCard, { emoji: string; assetId: string | null }>;
  private removeIndicator!: Phaser.GameObjects.Graphics;
  private errorCounterText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CookingPuzzleScene' });
  }

  private get gameCenterX(): number {
    return QUEST_PANEL_W + (GAME_W - QUEST_PANEL_W) / 2;
  }

  create(data: { puzzleData: PuzzleData }): void {
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);
    this.cameras.main.setBackgroundColor('#d32f2f');

    // ── Background food icons ─────────────────────────────────
    this.drawBgIcons();

    // ── Board card shadow ─────────────────────────────────────
    const boardShadow = this.add.graphics().setDepth(-2);
    boardShadow.fillStyle(0x3e2723, 1);
    boardShadow.fillRect(BD_X + 8, BD_Y + 10, BD_W, BD_H);

    // ── Board card fill + border ──────────────────────────────
    const board = this.add.graphics().setDepth(-1);
    board.fillStyle(0xf5e6d3, 1);
    board.fillRoundedRect(BD_X, BD_Y, BD_W, BD_H, BD_R);
    board.lineStyle(4, 0x3e2723, 1);
    board.strokeRoundedRect(BD_X, BD_Y, BD_W, BD_H, BD_R);

    // ── Board grid lines ─────────────────────────────────────
    board.lineStyle(1, 0x8d6e63, 0.18);
    for (let i = 1; i <= 5; i++) {
      const y = BD_Y + (BD_H / 6) * i;
      board.lineBetween(BD_X, y, BD_X + BD_W, y);
    }
    for (let i = 1; i <= 8; i++) {
      const x = BD_X + (BD_W / 9) * i;
      board.lineBetween(x, BD_Y, x, BD_Y + BD_H);
    }

    this.puzzleData = data.puzzleData;

    // -- State --
    this.completedSteps = new Set();
    this.availableIntermediates = new Map();
    this.stepCount = 0;
    this.cards = [];
    this.processorCards = new Map();
    this.processorAttachments = new Map();
    this.handCards = [];
    this.handSlots = new Map();
    this.handToBoardCard = new Map();
    this.boardToHandCard = new Map();
    this.ingredientMeta = new Map();

    // Build all steps list
    this.allSteps = [];
    for (const branch of this.puzzleData.branches) {
      for (const step of branch.steps) {
        this.allSteps.push(step);
      }
    }
    this.allSteps.push(this.puzzleData.finalStep);
    this.totalSteps = this.allSteps.length;

    // Normalize step inputs
    const outputToStepId = new Map<string, string>();
    for (const step of this.allSteps) {
      if (step.stepId !== 'final') {
        outputToStepId.set(step.output, step.stepId);
      }
    }
    for (const step of this.allSteps) {
      step.inputs = step.inputs.map((inp) => outputToStepId.get(inp) ?? inp);
    }

    // Seed the zustand store with gameplay data
    gameStore.getState().initGameplay(this.allSteps, this.totalSteps);

    // -- Drop highlight graphic (pulsing outline drawn over the hovered processor) --
    this.dropHighlight = this.add.graphics();
    this.dropHighlight.setVisible(false).setDepth(99);
    this.tweens.add({
      targets: this.dropHighlight,
      alpha: { from: 0.45, to: 1 },
      duration: 480,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // -- Remove indicator (red X shown when dragging card below board) --
    this.removeIndicator = this.add.graphics().setDepth(201).setVisible(false);
    const xSize = 14;
    this.removeIndicator.lineStyle(4, 0xff2222, 1);
    this.removeIndicator.lineBetween(-xSize, -xSize, xSize, xSize);
    this.removeIndicator.lineBetween(-xSize, xSize, xSize, -xSize);
    this.removeIndicator.fillStyle(0xff2222, 0.2);
    this.removeIndicator.fillCircle(0, 0, xSize + 6);

    // Board drag bounds
    const boardMinDragX = BD_X + FOOD_CARD_W / 2;
    const boardMaxDragX = BD_X + BD_W - FOOD_CARD_W / 2;
    const boardMinDragY = BD_Y + FOOD_CARD_H / 2;
    const boardMaxDragY = BD_Y + BD_H - FOOD_CARD_H / 2;

    // -- Drag support --
    this.input.on(
      'drag',
      (_pointer: Phaser.Input.Pointer, obj: PuzzleCard, dragX: number, dragY: number) => {
        // Hand cards move freely (they're being dragged to the board)
        if (this.handSlots.has(obj)) {
          obj.x = dragX;
          obj.y = dragY;
          // Check processor overlap for direct drop onto processor
          const proc = this.findOverlappingProcessor(obj);
          this.hoveredProcessor = proc;
          if (proc) {
            this.updateDropHighlight(proc);
          } else {
            this.dropHighlight.setVisible(false);
          }
          return;
        }

        // Board ingredient cards can be dragged below board to remove
        const isBoardIngredient = obj.cardType === 'ingredient' && this.boardToHandCard.has(obj);
        if (isBoardIngredient) {
          obj.x = Phaser.Math.Clamp(dragX, boardMinDragX, boardMaxDragX);
          obj.y = dragY;
          // Show red X when card is below board
          const belowBoard = obj.y > boardMaxDragY;
          obj.setAlpha(belowBoard ? 0.4 : 1);
          if (belowBoard) {
            this.removeIndicator.setPosition(obj.x, obj.y);
            this.removeIndicator.setVisible(true);
          } else {
            this.removeIndicator.setVisible(false);
          }
        } else {
          obj.x = Phaser.Math.Clamp(dragX, boardMinDragX, boardMaxDragX);
          obj.y = Phaser.Math.Clamp(dragY, boardMinDragY, boardMaxDragY);
        }

        const proc = this.findOverlappingProcessor(obj);
        this.hoveredProcessor = proc;
        if (proc) {
          this.updateDropHighlight(proc);
        } else {
          this.dropHighlight.setVisible(false);
        }
      },
    );

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: PuzzleCard) => {
      // Hand card drag start
      if (this.handSlots.has(obj)) {
        this.tweens.killTweensOf(obj);
        obj.setDepth(200);
        obj.setScale(1);
        obj.setRotation(0);
        return;
      }

      obj.setDepth(100);
      if (obj.attachedTo) {
        this.detachFromProcessor(obj);
      }
      this.hoveredProcessor = null;
      this.dropHighlight.setVisible(false);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: PuzzleCard) => {
      this.removeIndicator.setVisible(false);

      // Hand card drag end — place on board or return to slot
      if (this.handSlots.has(obj)) {
        this.onHandCardDragEnd(obj);
        return;
      }

      // Board ingredient card dragged below board — remove it
      if (obj.cardType === 'ingredient' && this.boardToHandCard.has(obj) && obj.y > boardMaxDragY) {
        this.trashBoardCard(obj);
        this.hoveredProcessor = null;
        this.dropHighlight.setVisible(false);
        return;
      }

      if (!obj.attachedTo) {
        obj.setDepth(obj.cardDepth || 1);
      }
      if (
        (obj.cardType === 'ingredient' ||
          obj.cardType === 'intermediate' ||
          obj.cardType === 'error') &&
        this.hoveredProcessor
      ) {
        if (this.activeProcessor && this.activeProcessor !== this.hoveredProcessor) return;
        this.attachToProcessor(obj, this.hoveredProcessor);
      }
      this.hoveredProcessor = null;
      this.dropHighlight.setVisible(false);
    });

    // -- Error counter (top-right of board) --
    this.errorCounterText = this.add
      .text(BD_X + BD_W - 10, BD_Y + 14, '', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e74c3c',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(1, 0)
      .setDepth(50)
      .setResolution(DPR);
    this.updateErrorCounter();

    // -- Create cards --
    this.createProcessorCards();
    this.createHandCards();
  }

  // -- Create processor cards on board --

  private createProcessorCards(): void {
    // Processor emoji + asset lookup
    const procEmojiMap = new Map<string, string>();
    const procAssetMap = new Map<string, string | null>();
    for (const p of this.puzzleData.processors) {
      procEmojiMap.set(p.name, p.emoji);
      procAssetMap.set(p.name, p.assetId ?? null);
    }

    // Collect all processors (including final step)
    const usedProcessors = new Set<string>();
    for (const step of this.allSteps) {
      usedProcessors.add(step.processor);
    }
    const paletteNames = this.puzzleData.processors.map((p) => p.name);
    const processorSet = new Set([...usedProcessors, ...paletteNames]);

    // Ensure final step processor is included
    processorSet.add(this.puzzleData.finalStep.processor);

    const processors = [...processorSet];
    const count = processors.length;
    const rowY = BD_Y + 80;

    for (let i = 0; i < count; i++) {
      const procName = processors[i];
      const x = BD_X + (BD_W * (i + 0.5)) / count;
      const emoji =
        procEmojiMap.get(procName) ??
        (procName === this.puzzleData.finalStep.processor
          ? (this.puzzleData.finalStep.processorEmoji ?? '')
          : '');
      const assetId = procAssetMap.get(procName) ?? PROCESSOR_ASSET[procName] ?? null;
      const card = new PuzzleCard(this, x, rowY, procName, 'processor', { emoji, assetId });
      this.cards.push(card);
      this.processorCards.set(procName, card);
      this.processorAttachments.set(card, []);
    }
  }

  // -- Create hand cards in arc --

  private createHandCards(): void {
    const rawItems = [...this.puzzleData.ingredients, ...this.puzzleData.decoys];
    const shuffled = Phaser.Utils.Array.Shuffle([...rawItems]) as Ingredient[];

    for (const item of shuffled) {
      const assetId = item.assetId ?? localAssetMatch(item.name);
      const card = new PuzzleCard(this, this.gameCenterX, GAME_H + 100, item.name, 'ingredient', {
        itemName: item.name,
        emoji: item.emoji,
        assetId,
      });
      card.setScale(HAND.CARD_SCALE);
      card.disableInteractive();
      card.setInteractive({ draggable: true, useHandCursor: true });

      this.ingredientMeta.set(card, { emoji: item.emoji, assetId: assetId ?? null });

      card.on('pointerover', () => this.onHandCardOver(card));
      card.on('pointerout', () => this.onHandCardOut(card));

      this.handCards.push(card);
      this.cards.push(card);
    }

    this.layoutHand(true);
  }

  private layoutHand(animate = false): void {
    const n = this.handCards.length;
    if (n === 0) return;

    const arcCenterX = this.gameCenterX + HAND.CENTER_X_OFFSET;
    const arcCenterY = GAME_H + HAND.ARC_RADIUS + HAND.CENTER_Y_OFFSET;

    for (let i = 0; i < n; i++) {
      const card = this.handCards[i];
      const t = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
      const angle = t * (HAND.MAX_ANGLE_SPREAD / 2);

      const x = arcCenterX + HAND.ARC_RADIUS * Math.sin(angle);
      const y = arcCenterY - HAND.ARC_RADIUS * Math.cos(angle);
      const depth = 10 + i;

      this.handSlots.set(card, { x, y, rotation: angle, depth });
      this.tweens.killTweensOf(card);
      card.setDepth(depth);

      if (animate) {
        card.setPosition(arcCenterX, GAME_H + 150);
        card.setRotation(0);
        this.tweens.add({
          targets: card,
          x,
          y,
          rotation: angle,
          duration: 400,
          ease: 'Back.easeOut',
          delay: i * 40,
        });
      } else {
        card.setPosition(x, y);
        card.setRotation(angle);
      }
    }
  }

  private removeFromHand(card: PuzzleCard): void {
    this.tweens.killTweensOf(card);
    card.disableInteractive();
    card.setVisible(false);
    this.handSlots.delete(card);
    this.handCards = this.handCards.filter((c) => c !== card);
    this.layoutHand();
  }

  private restoreToHand(card: PuzzleCard): void {
    card.setVisible(true);
    card.setAlpha(1);
    card.setScale(HAND.CARD_SCALE);
    card.disableInteractive();
    card.setInteractive({ draggable: true, useHandCursor: true });
    this.handCards.push(card);
    this.layoutHand();
  }

  // -- Hand card interaction --

  private onHandCardOver(card: PuzzleCard): void {
    const slot = this.handSlots.get(card);
    if (!slot) return;

    this.tweens.killTweensOf(card);
    this.tweens.add({
      targets: card,
      y: slot.y - HAND.HOVER_LIFT,
      scaleX: HAND.HOVER_SCALE,
      scaleY: HAND.HOVER_SCALE,
      rotation: 0,
      duration: 200,
      ease: 'Quad.easeOut',
    });
    card.setDepth(200);
  }

  private onHandCardOut(card: PuzzleCard): void {
    const slot = this.handSlots.get(card);
    if (!slot) return;

    this.tweens.killTweensOf(card);
    this.tweens.add({
      targets: card,
      x: slot.x,
      y: slot.y,
      scaleX: HAND.CARD_SCALE,
      scaleY: HAND.CARD_SCALE,
      rotation: slot.rotation,
      duration: 200,
      ease: 'Quad.easeOut',
    });
    card.setDepth(slot.depth);
  }

  private onHandCardDragEnd(card: PuzzleCard): void {
    this.dropHighlight.setVisible(false);

    // Already placed on board — return to slot
    if (this.handToBoardCard.has(card)) {
      this.onHandCardOut(card);
      this.hoveredProcessor = null;
      return;
    }

    // Check if dropped in board area
    const inBoard =
      card.x > BD_X + FOOD_CARD_W / 2 &&
      card.x < BD_X + BD_W - FOOD_CARD_W / 2 &&
      card.y > BD_Y + FOOD_CARD_H / 2 &&
      card.y < BD_Y + BD_H - FOOD_CARD_H / 2;

    if (!inBoard && !this.hoveredProcessor) {
      // Dropped outside board — return to hand
      this.onHandCardOut(card);
      this.hoveredProcessor = null;
      return;
    }

    const meta = this.ingredientMeta.get(card);
    if (!meta) {
      this.onHandCardOut(card);
      this.hoveredProcessor = null;
      return;
    }

    // Create board card at the drop position
    const dropX = Phaser.Math.Clamp(card.x, BD_X + FOOD_CARD_W / 2, BD_X + BD_W - FOOD_CARD_W / 2);
    const dropY = Phaser.Math.Clamp(card.y, BD_Y + FOOD_CARD_H / 2, BD_Y + BD_H - FOOD_CARD_H / 2);

    const boardCard = new PuzzleCard(this, dropX, dropY, card.cardLabel, 'ingredient', {
      itemName: card.itemName,
      emoji: meta.emoji,
      assetId: meta.assetId,
    });

    this.cards.push(boardCard);
    this.handToBoardCard.set(card, boardCard);
    this.boardToHandCard.set(boardCard, card);

    // If dropped on a processor, attach directly
    if (this.hoveredProcessor) {
      if (!this.activeProcessor || this.activeProcessor === this.hoveredProcessor) {
        this.attachToProcessor(boardCard, this.hoveredProcessor);
      }
    }

    // Remove hand card and re-layout
    this.removeFromHand(card);
    this.hoveredProcessor = null;
  }

  private trashBoardCard(boardCard: PuzzleCard): void {
    const handCard = this.boardToHandCard.get(boardCard);
    if (!handCard) return;

    this.tweens.add({
      targets: boardCard,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.cards = this.cards.filter((c) => c !== boardCard);
        boardCard.destroy();
      },
    });

    this.handToBoardCard.delete(handCard);
    this.boardToHandCard.delete(boardCard);
    this.restoreToHand(handCard);
  }

  // -- Attach / Detach --

  private attachToProcessor(ingredientCard: PuzzleCard, procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments) return;
    if (attachments.some((a) => a.card === ingredientCard)) return;

    ingredientCard.attachedTo = procCard;
    attachments.push({
      card: ingredientCard,
      itemName: ingredientCard.itemName,
      stepId: ingredientCard.stepId,
    });

    this.layoutAttachedCards(procCard);

    if (!this.activeProcessor) {
      this.activeProcessor = procCard;
      this.disableOtherProcessors(procCard);
    }
    this.showCookButton();
  }

  private detachFromProcessor(ingredientCard: PuzzleCard): void {
    const procCard = ingredientCard.attachedTo;
    if (!procCard) return;

    const attachments = this.processorAttachments.get(procCard);
    if (attachments) {
      const idx = attachments.findIndex((a) => a.card === ingredientCard);
      if (idx !== -1) attachments.splice(idx, 1);
      this.layoutAttachedCards(procCard);
    }
    ingredientCard.attachedTo = null;

    if (this.activeProcessor === procCard && attachments && attachments.length === 0) {
      this.deactivateProcessor();
    }
  }

  private layoutAttachedCards(procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments) return;

    attachments.forEach((att, i) => {
      const targetX = procCard.x;
      const targetY = procCard.y + PILE.BASE_Y + i * PILE.OFFSET_Y;
      att.card.setDepth(procCard.cardDepth + 1 + i);
      this.tweens.add({
        targets: att.card,
        x: targetX,
        y: targetY,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    });
  }

  // -- Match Checking --

  private checkProcessorMatch(procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments || attachments.length === 0) return;

    const procName = procCard.cardLabel;

    const resolvedInputs = attachments.map((att) => {
      if (att.stepId) return att.stepId;
      for (const [stepId, outputName] of this.availableIntermediates) {
        if (outputName === att.itemName) return stepId;
      }
      return att.itemName;
    });
    const inputSet = new Set(resolvedInputs);

    console.log(`[Match] Processor: "${procName}", attached: [${[...inputSet].join(', ')}]`);

    for (const step of this.allSteps) {
      if (step.processor !== procName) continue;

      const stepInputSet = new Set(step.inputs);
      console.log(
        `[Match] Checking step ${step.stepId}: needs [${[...stepInputSet].join(', ')}], have [${[...inputSet].join(', ')}]`,
      );

      if (stepInputSet.size !== inputSet.size) continue;

      let match = true;
      for (const inp of stepInputSet) {
        if (!inputSet.has(inp)) {
          match = false;
          break;
        }
      }
      if (match) {
        this.onStepSuccess(step, procCard);
        return;
      }
    }

    // No recipe match — attempt creative craft combination
    this.attemptCraftCombination(procCard);
  }

  private shakeAndReturn(procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments) return;

    this.cameras.main.shake(300, 0.008);

    const toDetach = [...attachments];
    for (const att of toDetach) {
      att.card.attachedTo = null;

      const handCard = this.boardToHandCard.get(att.card);
      if (handCard) {
        // Board ingredient card: destroy and restore hand card
        this.tweens.add({
          targets: att.card,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.cards = this.cards.filter((c) => c !== att.card);
            att.card.destroy();
          },
        });
        this.handToBoardCard.delete(handCard);
        this.boardToHandCard.delete(att.card);
        this.restoreToHand(handCard);
      } else {
        // Intermediate card: fling back to random board position
        const newX = Phaser.Math.Between(BD_X + 68, BD_X + BD_W - 68);
        const newY = Phaser.Math.Between(
          BD_Y + 20,
          BD_Y + BD_H - FOOD_CARD_H / 2 - SCATTER.FOOTER - 10,
        );
        att.card.setInteractive({ draggable: true });
        this.tweens.add({
          targets: att.card,
          x: newX,
          y: newY,
          duration: 400,
          ease: 'Back.easeOut',
        });
      }
    }
    attachments.length = 0;
    this.deactivateProcessor();
  }

  // -- Craft Combination (Infinite Craft mechanic) --

  private async attemptCraftCombination(procCard: PuzzleCard): Promise<void> {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments || attachments.length === 0) return;

    const processorName = procCard.cardLabel;
    const ingredientNames = attachments.map((att) => att.itemName);

    // Hide cook button and disable interaction
    this.hideCookButton();
    procCard.disableInteractive();
    for (const att of attachments) {
      att.card.disableInteractive();
    }

    const loadingAnim = this.showProcessorLoading(procCard);

    try {
      const result = await convex.action(api.generator.generateCombination, {
        processor: processorName,
        ingredients: ingredientNames,
        locale: getLocale(),
      });

      if (!this.scene.isActive()) return;

      this.stopProcessorLoading(loadingAnim);

      // Return all input cards to the player (don't consume on failed match)
      this.shakeAndReturn(procCard);

      this.spawnCraftedCard(result as { name: string; emoji: string; assetId: string }, procCard);
    } catch (err) {
      console.error('[Craft] LLM generation failed, falling back to shake:', err);
      if (!this.scene.isActive()) return;

      this.stopProcessorLoading(loadingAnim);

      // Re-enable interaction
      procCard.setInteractive();
      for (const att of attachments) {
        att.card.setInteractive({ draggable: true });
      }

      this.showCookButton();
      this.shakeAndReturn(procCard);
    }
  }

  private showProcessorLoading(procCard: PuzzleCard): {
    dots: Phaser.GameObjects.Arc[];
    dotsTimeline: Phaser.Tweens.Tween;
    text: Phaser.GameObjects.Text;
    textTween: Phaser.Tweens.Tween;
    pulseTween: Phaser.Tweens.Tween;
  } {
    const cx = procCard.x;
    const cy = procCard.y;
    const radius = FOOD_CARD_W / 2 + 16;
    const dotCount = 8;
    const dots: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dot = this.add.circle(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
        4,
        0xf1c40f,
        1,
      );
      dot.setDepth(200);
      dot.setAlpha(0.3 + (i / dotCount) * 0.7);
      dots.push(dot);
    }

    // Rotate dots around processor
    const dotsTimeline = this.tweens.add({
      targets: {},
      duration: 1200,
      repeat: -1,
      onUpdate: (_tween: Phaser.Tweens.Tween, _target: unknown, _key: string, current: number) => {
        const progress = current;
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount + progress) * Math.PI * 2;
          dots[i].x = cx + Math.cos(angle) * radius;
          dots[i].y = cy + Math.sin(angle) * radius;
        }
      },
    });

    // Pulse the processor card
    const pulseTween = this.tweens.add({
      targets: procCard,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.85,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Animated "..." text
    const text = this.add
      .text(cx, cy + FOOD_CARD_H / 2 + 20, '...', {
        fontSize: '18px',
        fontStyle: 'bold',
        color: TEXT_COLORS.GOLD,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setResolution(DPR);

    let dotPhase = 0;
    const textTween = this.tweens.add({
      targets: {},
      duration: 500,
      repeat: -1,
      onRepeat: () => {
        dotPhase = (dotPhase + 1) % 4;
        text.setText('.'.repeat(dotPhase || 1));
      },
    });

    return { dots, dotsTimeline, text, textTween, pulseTween };
  }

  private stopProcessorLoading(anim: {
    dots: Phaser.GameObjects.Arc[];
    dotsTimeline: Phaser.Tweens.Tween;
    text: Phaser.GameObjects.Text;
    textTween: Phaser.Tweens.Tween;
    pulseTween: Phaser.Tweens.Tween;
  }): void {
    anim.dotsTimeline.stop();
    anim.textTween.stop();
    anim.pulseTween.stop();
    for (const dot of anim.dots) dot.destroy();
    anim.text.destroy();
  }

  private spawnCraftedCard(
    result: { name: string; emoji: string; assetId: string },
    procCard: PuzzleCard,
  ): void {
    // Validate assetId
    let assetId: string | null = result.assetId;
    if (!FoodAssets.find(assetId)) {
      assetId = localAssetMatch(result.name);
    }

    // Spawn below the processor, clamped to board bounds
    const boardMaxY = BD_Y + BD_H - FOOD_CARD_H / 2 - SCATTER.FOOTER;
    const spawnX = Phaser.Math.Clamp(
      procCard.x,
      BD_X + FOOD_CARD_W / 2 + SCATTER.PAD,
      BD_X + BD_W - FOOD_CARD_W / 2 - SCATTER.PAD,
    );
    const spawnY = Math.min(procCard.y + FOOD_CARD_H + SCATTER.CARD_GAP, boardMaxY);

    let maxDepth = 0;
    for (const c of this.cards) {
      if (c.depth > maxDepth) maxDepth = c.depth;
    }

    const card = new PuzzleCard(this, spawnX, spawnY, result.name, 'error', {
      itemName: result.name,
      emoji: result.emoji,
      assetId,
    });
    card.cardDepth = maxDepth + 1;
    card.setDepth(maxDepth + 1);
    this.cards.push(card);

    // Pop-in animation
    card.setScale(0);
    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
      delay: 200,
    });

    // Red flash on processor
    const flash = this.add.graphics();
    flash.fillStyle(0xe74c3c, 0.5);
    flash.fillRoundedRect(
      -FOOD_CARD_W / 2 - 4,
      -FOOD_CARD_H / 2 - 4,
      FOOD_CARD_W + 8,
      FOOD_CARD_H + 8,
      10,
    );
    flash.setPosition(procCard.x, procCard.y);
    flash.setDepth(99);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Red camera flash
    this.cameras.main.flash(300, 231, 76, 60, false);

    // Camera shake to emphasize the error
    this.cameras.main.shake(200, 0.006);

    // Increment error count (addError triggers game_over phase at maxErrors)
    gameStore.getState().addError();

    // Update error counter display
    this.updateErrorCounter();

    // Float text
    const floatText = this.add
      .text(procCard.x, procCard.y - 12, `⚠️ ${result.name}`, {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#e74c3c',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setResolution(DPR);
    this.tweens.add({
      targets: floatText,
      y: floatText.y - 45,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => floatText.destroy(),
    });
  }

  // -- Step Success --

  private onStepSuccess(step: Step, procCard: PuzzleCard): void {
    const isRedo = this.completedSteps.has(step.stepId);
    if (!isRedo) {
      this.completedSteps.add(step.stepId);
      this.stepCount++;
    }

    const isFinal = step.stepId === 'final';

    // Green flash on processor
    const flash = this.add.graphics();
    flash.fillStyle(COLORS.SUCCESS_FLASH, 0.5);
    flash.fillRoundedRect(
      -FOOD_CARD_W / 2 - 4,
      -FOOD_CARD_H / 2 - 4,
      FOOD_CARD_W + 8,
      FOOD_CARD_H + 8,
      10,
    );
    flash.setPosition(procCard.x, procCard.y);
    flash.setDepth(99);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    this.cameras.main.flash(300, 46, 204, 113, false);

    const attachments = this.processorAttachments.get(procCard);
    const attachedCards = attachments ? attachments.map((a) => a.card) : [];
    if (attachments) {
      for (const att of attachments) {
        att.card.attachedTo = null;

        const handCard = this.boardToHandCard.get(att.card);
        if (handCard) {
          // Board ingredient card: destroy and restore hand card
          this.tweens.add({
            targets: att.card,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.cards = this.cards.filter((c) => c !== att.card);
              att.card.destroy();
            },
          });
          this.handToBoardCard.delete(handCard);
          this.boardToHandCard.delete(att.card);
          this.restoreToHand(handCard);
        } else {
          // Intermediate card: destroy (consumed in the step)
          this.tweens.add({
            targets: att.card,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.cards = this.cards.filter((c) => c !== att.card);
              att.card.destroy();
            },
          });
        }
      }
      attachments.length = 0;
    }

    if (!isFinal) {
      this.availableIntermediates.set(step.stepId, step.output);
      this.spawnOutputCard(step, procCard, attachedCards);
    }

    // Update zustand store — triggers React re-renders for QuestBookPanel and GameHUD
    if (!isRedo) {
      gameStore
        .getState()
        .completeStep(step.stepId, isFinal ? undefined : [step.stepId, step.output]);
    }

    this.deactivateProcessor();

    if (isFinal) {
      this.time.delayedCall(400, () => {
        gameStore.getState().setVictory(step.output);
      });
    }
  }

  private spawnOutputCard(step: Step, procCard: PuzzleCard, inputCards: PuzzleCard[]): void {
    const logicalAsset = step.outputAssetId ?? localAssetMatch(step.output);

    const inputTextureKeys: string[] = [];
    for (const c of inputCards) {
      if (c.foodImage) {
        const key = c.foodImage.texture.key;
        if (key.startsWith('food_') && this.textures.exists(key)) {
          inputTextureKeys.push(key);
        }
      }
    }

    const useLogical = logicalAsset && this.textures.exists(`food_${logicalAsset}`);
    const primaryAsset = useLogical
      ? logicalAsset
      : inputTextureKeys.length > 0
        ? inputTextureKeys[0].slice(5)
        : null;

    // Spawn below the processor, clamped to board bounds
    const boardMaxY = BD_Y + BD_H - FOOD_CARD_H / 2 - SCATTER.FOOTER;
    const spawnX = Phaser.Math.Clamp(
      procCard.x,
      BD_X + FOOD_CARD_W / 2 + SCATTER.PAD,
      BD_X + BD_W - FOOD_CARD_W / 2 - SCATTER.PAD,
    );
    const spawnY = Math.min(procCard.y + FOOD_CARD_H + SCATTER.CARD_GAP, boardMaxY);

    let maxDepth = 0;
    for (const c of this.cards) {
      if (c.depth > maxDepth) maxDepth = c.depth;
    }

    const card = new PuzzleCard(this, spawnX, spawnY, step.output, 'intermediate', {
      itemName: step.output,
      stepId: step.stepId,
      emoji: '',
      assetId: primaryAsset,
    });
    card.cardDepth = maxDepth + 1;
    card.setDepth(maxDepth + 1);

    if (!useLogical && inputTextureKeys.length > 1) {
      const fanDim = Math.round(FOOD_CARD_H * 0.32);
      const imageY = -FOOD_CARD_H / 2 + FOOD_CARD_H * 0.34;
      const count = inputTextureKeys.length;
      const spreadX = Math.min(14, 32 / count);
      const spreadY = Math.min(6, 14 / count);
      const rotStep = Math.min(0.25, 0.5 / count);

      if (card.foodImage) {
        const pScale = Math.min(fanDim / card.foodImage.width, fanDim / card.foodImage.height);
        card.foodImage.setScale(pScale);
        const pOffX = (0 - (count - 1) / 2) * spreadX;
        const pOffY = (0 - (count - 1) / 2) * spreadY;
        const pRot = (0 - (count - 1) / 2) * rotStep;
        card.foodImage.setPosition(pOffX, imageY + pOffY);
        card.foodImage.setRotation(pRot);
      }

      for (let i = 1; i < count; i++) {
        const key = inputTextureKeys[i];
        const offsetX = (i - (count - 1) / 2) * spreadX;
        const offsetY = (i - (count - 1) / 2) * spreadY;
        const rot = (i - (count - 1) / 2) * rotStep;

        const shadow = this.add.image(offsetX + 2, imageY + offsetY + 3, key);
        const shadowScale = Math.min(fanDim / shadow.width, fanDim / shadow.height);
        shadow
          .setScale(shadowScale)
          .setOrigin(0.5)
          .setTint(0x000000)
          .setAlpha(0.2)
          .setRotation(rot);
        card.add(shadow);

        const img = this.add.image(offsetX, imageY + offsetY, key);
        const scale = Math.min(fanDim / img.width, fanDim / img.height);
        img.setScale(scale).setOrigin(0.5).setRotation(rot);
        card.add(img);
      }
    }

    this.cards.push(card);

    card.setScale(0);
    this.tweens.add({
      targets: card,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      delay: 200,
    });

    const floatText = this.add
      .text(procCard.x, procCard.y - 12, step.output, {
        fontSize: '15px',
        fontStyle: 'bold',
        color: TEXT_COLORS.SUCCESS,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setResolution(DPR);
    this.tweens.add({
      targets: floatText,
      y: floatText.y - 45,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => floatText.destroy(),
    });
  }

  // -- Spatial drop helpers --

  private findOverlappingProcessor(card: PuzzleCard): PuzzleCard | null {
    const cardRect = new Phaser.Geom.Rectangle(
      card.x - FOOD_CARD_W / 2,
      card.y - FOOD_CARD_H / 2,
      FOOD_CARD_W,
      FOOD_CARD_H,
    );

    let best: PuzzleCard | null = null;
    let bestArea = 0;

    for (const [, procCard] of this.processorCards) {
      const procRect = new Phaser.Geom.Rectangle(
        procCard.x - FOOD_CARD_W / 2,
        procCard.y - FOOD_CARD_H / 2,
        FOOD_CARD_W,
        FOOD_CARD_H,
      );
      if (!Phaser.Geom.Intersects.RectangleToRectangle(cardRect, procRect)) continue;

      const overlapW =
        Math.min(cardRect.right, procRect.right) - Math.max(cardRect.left, procRect.left);
      const overlapH =
        Math.min(cardRect.bottom, procRect.bottom) - Math.max(cardRect.top, procRect.top);
      const area = overlapW * overlapH;
      if (area > bestArea) {
        bestArea = area;
        best = procCard;
      }
    }

    return best;
  }

  private updateDropHighlight(procCard: PuzzleCard): void {
    const pad = PROCESSOR_RING_PAD + 5;
    this.dropHighlight.clear();
    this.dropHighlight.lineStyle(3, 0x00ff88, 1);
    this.dropHighlight.strokeRoundedRect(
      procCard.x - FOOD_CARD_W / 2 - pad,
      procCard.y - FOOD_CARD_H / 2 - pad,
      FOOD_CARD_W + pad * 2,
      FOOD_CARD_H + pad * 2,
      FOOD_CARD_RADIUS + pad,
    );
    this.dropHighlight.setVisible(true);
  }

  // -- Cook Button & Processor Activation --

  private showCookButton(): void {
    if (this.cookButton) return;

    const proc = this.activeProcessor;
    const procName = proc?.cardLabel ?? '';
    const procEmoji = proc?.emojiText.text ?? '';

    // Action label: capitalize processor name, e.g. "Grill!" / "Fry!"
    const actionLabel = procName
      ? t('game.actionLabel', { processor: procName.charAt(0).toUpperCase() + procName.slice(1) })
      : t('game.cook');

    const btnW = 160;
    const btnH = 54;
    const shadowH = 6;
    const btnX = BD_X + BD_W - btnW / 2 - 10;
    const btnY = BD_Y + BD_H + (GAME_H - BD_Y - BD_H) / 2;

    const container = this.add.container(btnX, btnY).setDepth(150);

    // Shadow layer
    const shadow = this.add.graphics();
    shadow.fillStyle(0x8b2500, 1);
    shadow.fillRoundedRect(-btnW / 2, -btnH / 2 + shadowH, btnW, btnH, 16);
    container.add(shadow);

    // Face layer
    const face = this.add.graphics();
    face.fillStyle(0xe74c3c, 1);
    face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    face.lineStyle(3, 0x3e2723, 1);
    face.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
    container.add(face);

    // Emoji icon
    const icon = this.add
      .text(-30, 0, procEmoji || '🍳', {
        fontSize: '24px',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setResolution(DPR);
    container.add(icon);

    // Label
    const label = this.add
      .text(12, 0, actionLabel, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: TEXT_COLORS.WHITE,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setResolution(DPR);
    container.add(label);

    const hitPadX = 24;
    const hitPadY = 16;
    container.setSize(btnW + hitPadX * 2, btnH + hitPadY * 2);
    container.setInteractive({ useHandCursor: true });

    // Hover: press down effect
    container.on('pointerover', () => {
      face.clear();
      face.fillStyle(0xc0392b, 1);
      face.fillRoundedRect(-btnW / 2, -btnH / 2 + 3, btnW, btnH, 16);
      face.lineStyle(3, 0x3e2723, 1);
      face.strokeRoundedRect(-btnW / 2, -btnH / 2 + 3, btnW, btnH, 16);
      icon.setY(3);
      label.setY(3);
    });
    container.on('pointerout', () => {
      face.clear();
      face.fillStyle(0xe74c3c, 1);
      face.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      face.lineStyle(3, 0x3e2723, 1);
      face.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16);
      icon.setY(0);
      label.setY(0);
    });
    container.on('pointerdown', () => this.onCookButtonPressed());

    // Pop-in animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Idle pulse to draw attention
    this.tweens.add({
      targets: container,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: 400,
    });

    this.cookButton = container;
  }

  private hideCookButton(): void {
    if (!this.cookButton) return;
    const btn = this.cookButton;
    this.cookButton = null;
    this.tweens.killTweensOf(btn);
    this.tweens.add({
      targets: btn,
      scaleX: 0,
      scaleY: 0,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => btn.destroy(),
    });
  }

  private onCookButtonPressed(): void {
    if (!this.activeProcessor) return;
    this.checkProcessorMatch(this.activeProcessor);
  }

  private deactivateProcessor(): void {
    this.activeProcessor = null;
    this.enableAllProcessors();
    this.hideCookButton();
  }

  private disableOtherProcessors(active: PuzzleCard): void {
    for (const [, card] of this.processorCards) {
      if (card !== active) {
        card.disableInteractive();
        card.setAlpha(0.5);
      }
    }
  }

  private enableAllProcessors(): void {
    for (const [, card] of this.processorCards) {
      card.setInteractive();
      card.setAlpha(1);
    }
  }

  private updateErrorCounter(): void {
    const { errorCount, maxErrors } = gameStore.getState();
    if (errorCount === 0) {
      this.errorCounterText.setVisible(false);
    } else {
      this.errorCounterText.setVisible(true);
      const label = Number.isFinite(maxErrors) ? `⚠️ ${errorCount}/${maxErrors}` : `⚠️ ${errorCount}`;
      this.errorCounterText.setText(label);

      // Pulse animation on update
      this.tweens.killTweensOf(this.errorCounterText);
      this.errorCounterText.setScale(1.3);
      this.tweens.add({
        targets: this.errorCounterText,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut',
      });
    }
  }

  private drawBgIcons(): void {
    const keys = ['bg_burrito', 'bg_pizza', 'bg_ramen', 'bg_chicken', 'bg_shrimp'];
    const rng = new Phaser.Math.RandomDataGenerator(['foodstack-bg']);
    const cols = 12;
    const rows = 7;
    const cellW = GAME_W / cols;
    const cellH = GAME_H / rows;
    const iconSize = Math.min(cellW, cellH) * 0.58;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = keys[(row * cols + col) % keys.length];
        const jitterX = rng.between(-cellW * 0.08, cellW * 0.08);
        const jitterY = rng.between(-cellH * 0.08, cellH * 0.08);
        const x = cellW * (col + 0.5) + jitterX;
        const y = cellH * (row + 0.5) + jitterY;
        const angle = rng.between(-25, 25);

        const img = this.add.image(x, y, key);
        img
          .setScale(iconSize / 512)
          .setAngle(angle)
          .setAlpha(0.12)
          .setDepth(-3)
          .setBlendMode(Phaser.BlendModes.MULTIPLY);
      }
    }
  }
}