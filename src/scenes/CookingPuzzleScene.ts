import Phaser from 'phaser';
import { FOOD_CARD_W, FOOD_CARD_H } from '../gameObjects/FoodCard';
import { PuzzleCard } from '../gameObjects/PuzzleCard';
import { QuestBook } from '../gameObjects/QuestBook';
import {
  GAME_W,
  GAME_H,
  DPR,
  FONT_FAMILY,
  QUEST_PANEL_W,
  COLORS,
  TEXT_COLORS,
  PILE,
  SCATTER,
} from '../config';
import { FoodAssets } from '../data/food-assets';
import type { PuzzleData, Step, Ingredient, Attachment } from '../types';

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

function localAssetMatch(name: string): string | null {
  const normalized = name.toLowerCase().replace(/\s+/g, '_');
  if (FoodAssets.find(normalized)) return normalized;
  for (const item of FoodAssets.all) {
    if (item.label.toLowerCase() === name.toLowerCase()) return item.id;
  }
  return null;
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
  private stepText!: Phaser.GameObjects.Text;
  private questBook!: QuestBook;

  constructor() {
    super({ key: 'CookingPuzzleScene' });
  }

  private get gameCenterX(): number {
    return QUEST_PANEL_W + (GAME_W - QUEST_PANEL_W) / 2;
  }

  create(data: { puzzleData: PuzzleData }): void {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    // Auto-set high resolution on all text objects
    const _addText = this.add.text.bind(this.add);
    (this.add as any).text = (...args: Parameters<typeof _addText>) =>
      _addText(...args).setResolution(DPR);

    this.puzzleData = data.puzzleData;

    // -- State --
    this.completedSteps = new Set();
    this.availableIntermediates = new Map();
    this.stepCount = 0;
    this.cards = [];
    this.processorCards = new Map();
    this.processorAttachments = new Map();

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

    // -- Quest Book --
    this.questBook = new QuestBook(
      this,
      this.puzzleData,
      this.allSteps,
      this.completedSteps,
      this.availableIntermediates,
    );

    // -- Drag support --
    this.input.on(
      'drag',
      (_pointer: Phaser.Input.Pointer, obj: PuzzleCard, dragX: number, dragY: number) => {
        obj.x = dragX;
        obj.y = dragY;

        if (obj.cardType === 'processor') {
          const attachments = this.processorAttachments.get(obj);
          if (attachments) {
            attachments.forEach((att, i) => {
              att.card.x = dragX;
              att.card.y = dragY + PILE.BASE_Y + i * PILE.OFFSET_Y;
            });
          }
        }
      },
    );

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, obj: PuzzleCard) => {
      obj.setDepth(100);
      if (obj.attachedTo) {
        this.detachFromProcessor(obj);
      }
      if (obj.cardType === 'processor') {
        const attachments = this.processorAttachments.get(obj);
        if (attachments) {
          attachments.forEach((att, i) => {
            att.card.setDepth(101 + i);
          });
        }
      }
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: PuzzleCard) => {
      if (!obj.attachedTo) {
        obj.setDepth(obj.cardDepth || 1);
      }
      if (obj.cardType === 'processor') {
        const attachments = this.processorAttachments.get(obj);
        if (attachments) {
          attachments.forEach((att, i) => {
            att.card.setDepth((obj.cardDepth || 1) + 1 + i);
          });
        }
      }
    });

    this.input.on(
      'drop',
      (_pointer: Phaser.Input.Pointer, obj: PuzzleCard, dropZone: PuzzleCard) => {
        if (
          (obj.cardType === 'ingredient' || obj.cardType === 'intermediate') &&
          dropZone.cardType === 'processor'
        ) {
          this.attachToProcessor(obj, dropZone);
        }
      },
    );

    // -- Scatter cards --
    this.scatterCards();

    // -- Footer --
    this.add
      .text(this.gameCenterX, GAME_H - 22, this.puzzleData.dishName, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: TEXT_COLORS.WHITE,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);

    this.stepText = this.add
      .text(GAME_W - 22, GAME_H - 22, `0/${this.totalSteps} steps`, {
        fontSize: '16px',
        color: TEXT_COLORS.STEP_COUNTER,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(1, 0.5);

    // -- Download recipe button --
    const dlBtn = this.add
      .text(QUEST_PANEL_W + 10, GAME_H - 20, 'Download JSON', {
        fontSize: '11px',
        color: TEXT_COLORS.LINK,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    dlBtn.on('pointerover', () => dlBtn.setColor(TEXT_COLORS.LINK_HOVER));
    dlBtn.on('pointerout', () => dlBtn.setColor(TEXT_COLORS.LINK));
    dlBtn.on('pointerdown', () => {
      const json = JSON.stringify(this.puzzleData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.puzzleData.dishName.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // -- Debug toggle (D key) --
    this.input.keyboard!.on('keydown-D', () => {
      this.questBook.toggleDebugMode();
    });
  }

  // -- Scatter cards across game area --

  private scatterCards(): void {
    const minX = QUEST_PANEL_W + FOOD_CARD_W / 2 + SCATTER.PAD;
    const maxX = GAME_W - FOOD_CARD_W / 2 - SCATTER.PAD;
    const minY = FOOD_CARD_H / 2 + SCATTER.PAD;
    const maxY = GAME_H - FOOD_CARD_H / 2 - SCATTER.FOOTER;

    const positions: { x: number; y: number }[] = [];

    const findPosition = (): { x: number; y: number } => {
      for (let attempt = 0; attempt < SCATTER.MAX_ATTEMPTS; attempt++) {
        const x = Phaser.Math.Between(minX, maxX);
        const y = Phaser.Math.Between(minY, maxY);
        let overlapping = false;
        for (const pos of positions) {
          if (
            Math.abs(x - pos.x) < FOOD_CARD_W + SCATTER.CARD_GAP &&
            Math.abs(y - pos.y) < FOOD_CARD_H + SCATTER.CARD_GAP
          ) {
            overlapping = true;
            break;
          }
        }
        if (!overlapping) {
          positions.push({ x, y });
          return { x, y };
        }
      }
      const cols = Math.max(1, Math.floor((maxX - minX) / (FOOD_CARD_W + SCATTER.GRID_GAP - 2)));
      const idx = positions.length;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x =
        minX +
        col * (FOOD_CARD_W + SCATTER.GRID_GAP) +
        Phaser.Math.Between(-SCATTER.GRID_JITTER, SCATTER.GRID_JITTER);
      const y =
        minY +
        row * (FOOD_CARD_H + SCATTER.GRID_GAP) +
        Phaser.Math.Between(-SCATTER.GRID_JITTER, SCATTER.GRID_JITTER);
      positions.push({ x, y });
      return { x, y };
    };

    // Processor emoji + asset lookup
    const procEmojiMap = new Map<string, string>();
    const procAssetMap = new Map<string, string | null>();
    for (const p of this.puzzleData.processors) {
      procEmojiMap.set(p.name, p.emoji);
      procAssetMap.set(p.name, p.assetId ?? null);
    }

    // Collect all processors
    const usedProcessors = new Set<string>();
    for (const step of this.allSteps) {
      usedProcessors.add(step.processor);
    }
    const paletteNames = this.puzzleData.processors.map((p) => p.name);
    const processorSet = new Set([...usedProcessors, ...paletteNames]);
    const processors = Phaser.Utils.Array.Shuffle([...processorSet]) as string[];

    for (const procName of processors) {
      const pos = findPosition();
      const emoji = procEmojiMap.get(procName) ?? '';
      const assetId = procAssetMap.get(procName) ?? PROCESSOR_ASSET[procName] ?? null;
      const card = new PuzzleCard(this, pos.x, pos.y, procName, 'processor', { emoji, assetId });
      this.cards.push(card);
      this.processorCards.set(procName, card);
      this.processorAttachments.set(card, []);
    }

    // Ingredient cards (raw + decoys, shuffled)
    const rawItems = [...this.puzzleData.ingredients, ...this.puzzleData.decoys];
    const shuffled = Phaser.Utils.Array.Shuffle([...rawItems]) as Ingredient[];
    for (const item of shuffled) {
      const pos = findPosition();
      const assetId = item.assetId ?? localAssetMatch(item.name);
      const card = new PuzzleCard(this, pos.x, pos.y, item.name, 'ingredient', {
        itemName: item.name,
        emoji: item.emoji,
        assetId,
      });
      this.cards.push(card);
    }

    // Final step processor if not already present
    if (!this.processorCards.has(this.puzzleData.finalStep.processor)) {
      const pos = findPosition();
      const emoji =
        this.puzzleData.finalStep.processorEmoji ??
        procEmojiMap.get(this.puzzleData.finalStep.processor) ??
        '';
      const finalAssetId =
        procAssetMap.get(this.puzzleData.finalStep.processor) ??
        PROCESSOR_ASSET[this.puzzleData.finalStep.processor] ??
        null;
      const card = new PuzzleCard(
        this,
        pos.x,
        pos.y,
        this.puzzleData.finalStep.processor,
        'processor',
        {
          emoji,
          assetId: finalAssetId,
        },
      );
      this.cards.push(card);
      this.processorCards.set(this.puzzleData.finalStep.processor, card);
      this.processorAttachments.set(card, []);
    }
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
    this.checkProcessorMatch(procCard);
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
      if (this.completedSteps.has(step.stepId)) continue;
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

    for (const step of this.allSteps) {
      if (this.completedSteps.has(step.stepId)) continue;
      if (step.processor !== procName) continue;

      if (attachments.length === step.inputs.length) {
        this.shakeAndReturn(procCard);
        return;
      }
    }
  }

  private shakeAndReturn(procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments) return;

    this.cameras.main.shake(300, 0.008);

    const toDetach = [...attachments];
    for (const att of toDetach) {
      att.card.attachedTo = null;
      const newX = Phaser.Math.Between(QUEST_PANEL_W + 68, GAME_W - 68);
      const newY = Phaser.Math.Between(45, GAME_H - 68);
      this.tweens.add({
        targets: att.card,
        x: newX,
        y: newY,
        duration: 400,
        ease: 'Back.easeOut',
      });
    }
    attachments.length = 0;
  }

  // -- Step Success --

  private onStepSuccess(step: Step, procCard: PuzzleCard): void {
    this.completedSteps.add(step.stepId);
    this.stepCount++;
    this.stepText.setText(`${this.stepCount}/${this.totalSteps} steps`);

    for (const inp of step.inputs) {
      if (this.availableIntermediates.has(inp)) {
        this.availableIntermediates.delete(inp);
      }
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
        this.tweens.add({
          targets: att.card,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            const idx = this.cards.indexOf(att.card);
            if (idx !== -1) this.cards.splice(idx, 1);
            att.card.destroy();
          },
        });
      }
      attachments.length = 0;
    }

    if (!isFinal) {
      this.availableIntermediates.set(step.stepId, step.output);
      this.spawnOutputCard(step, procCard, attachedCards);
    }

    this.questBook.refresh();

    if (isFinal) {
      this.time.delayedCall(400, () => this.onVictory(step.output));
    }
  }

  private spawnOutputCard(step: Step, procCard: PuzzleCard, inputCards: PuzzleCard[]): void {
    // Pick the best asset: AI-provided > local name match > first input ingredient's image
    let assetId = step.outputAssetId ?? localAssetMatch(step.output);
    if (!assetId) {
      for (const c of inputCards) {
        if (c.foodImage) {
          // Extract assetId from texture key ("food_shrimp" → "shrimp")
          const key = c.foodImage.texture.key;
          if (key.startsWith('food_')) {
            assetId = key.slice(5);
            break;
          }
        }
      }
    }
    const card = new PuzzleCard(this, procCard.x, procCard.y, step.output, 'intermediate', {
      itemName: step.output,
      stepId: step.stepId,
      emoji: '',
      assetId,
    });
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
      .setDepth(101);
    this.tweens.add({
      targets: floatText,
      y: floatText.y - 45,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => floatText.destroy(),
    });
  }

  // -- Victory --

  private onVictory(dishName: string): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(COLORS.OVERLAY, 0.6);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
    overlay.setDepth(200);

    const victoryText = this.add
      .text(GAME_W / 2, -100, dishName, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: TEXT_COLORS.GOLD,
        fontFamily: FONT_FAMILY,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.tweens.add({
      targets: victoryText,
      y: GAME_H / 2 - 22,
      ease: 'Bounce.Out',
      duration: 1200,
    });

    const subtitle = this.add
      .text(GAME_W / 2, -100, 'YOU WIN!', {
        fontSize: '22px',
        fontStyle: 'bold',
        color: TEXT_COLORS.SUCCESS,
        fontFamily: FONT_FAMILY,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.tweens.add({
      targets: subtitle,
      y: GAME_H / 2 + 34,
      ease: 'Bounce.Out',
      duration: 1200,
      delay: 300,
    });

    this.cameras.main.flash(600, 46, 204, 113, false);

    const btnText = this.add
      .text(GAME_W / 2, GAME_H / 2 + 80, 'Play Again', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: TEXT_COLORS.WHITE,
        fontFamily: FONT_FAMILY,
        backgroundColor: '#2ecc71',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setInteractive({ useHandCursor: true });

    btnText.setAlpha(0);
    this.tweens.add({ targets: btnText, alpha: 1, duration: 500, delay: 1500 });
    btnText.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });
  }
}