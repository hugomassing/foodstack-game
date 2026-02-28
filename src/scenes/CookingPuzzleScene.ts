import Phaser from 'phaser';
import { FOOD_CARD_W, FOOD_CARD_H, FOOD_CARD_RADIUS } from '../gameObjects/FoodCard';
import { PuzzleCard } from '../gameObjects/PuzzleCard';
import { QuestBook } from '../gameObjects/QuestBook';
import {
  GAME_W,
  GAME_H,
  DPR,
  FONT_FAMILY,
  QUEST_PANEL_W,
  TOPBAR_H,
  COLORS,
  TEXT_COLORS,
  PILE,
  SCATTER,
  PROCESSOR_RING_PAD,
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
  private hoveredProcessor: PuzzleCard | null = null;
  private dropHighlight!: Phaser.GameObjects.Graphics;
  private activeProcessor: PuzzleCard | null = null;
  private cookButton: Phaser.GameObjects.Container | null = null;
  private progressBarGfx!: Phaser.GameObjects.Graphics;
  private progressBarMaxW = 0;
  private progressBarInnerX = 0;
  private progressBarInnerY = 0;

  constructor() {
    super({ key: 'CookingPuzzleScene' });
  }

  private get gameCenterX(): number {
    return QUEST_PANEL_W + (GAME_W - QUEST_PANEL_W) / 2;
  }

  create(data: { puzzleData: PuzzleData }): void {
    this.cameras.main.setBackgroundColor('#c4a070');
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    // Board plank texture
    const planks = this.add.graphics().setDepth(-1);
    // Alternating plank shading
    let alt = false;
    for (let x = QUEST_PANEL_W; x < GAME_W; x += 130) {
      if (alt) {
        planks.fillStyle(0x000000, 0.04);
        planks.fillRect(x, 0, 130, GAME_H);
      }
      alt = !alt;
    }
    // Warmer, slightly more visible dividing lines
    planks.lineStyle(1, 0x7a4a20, 0.22);
    for (let x = QUEST_PANEL_W + 130; x < GAME_W; x += 130) {
      planks.lineBetween(x, 0, x, GAME_H);
    }

    // Left-edge depth shadow (cue between sidebar and board)
    const edgeShadow = this.add.graphics().setDepth(0);
    edgeShadow.fillStyle(0x000000, 0.14);
    edgeShadow.fillRect(QUEST_PANEL_W + 2, 0, 16, GAME_H);
    edgeShadow.fillStyle(0x000000, 0.05);
    edgeShadow.fillRect(QUEST_PANEL_W + 18, 0, 14, GAME_H);

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

    // -- Top bar --
    const TBAR_MARGIN = 8;
    const TBAR_H = 54;
    const TBAR_X = QUEST_PANEL_W + 12;
    const TBAR_W = GAME_W - QUEST_PANEL_W - 24;
    const TBAR_Y = TBAR_MARGIN;

    // Drop shadow
    const topBarShadow = this.add.graphics().setDepth(5);
    topBarShadow.fillStyle(0x000000, 0.22);
    topBarShadow.fillRoundedRect(TBAR_X + 4, TBAR_Y + 6, TBAR_W, TBAR_H, 12);

    // Card body
    const topBarBg = this.add.graphics().setDepth(6);
    topBarBg.fillStyle(0xffffff, 1);
    topBarBg.fillRoundedRect(TBAR_X, TBAR_Y, TBAR_W, TBAR_H, 12);
    topBarBg.lineStyle(3, 0x222222, 1);
    topBarBg.strokeRoundedRect(TBAR_X, TBAR_Y, TBAR_W, TBAR_H, 12);

    // Dish name — centered in upper portion
    this.add
      .text(TBAR_X + TBAR_W / 2, TBAR_Y + 22, this.puzzleData.dishName, {
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#1a1a1a',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setDepth(7);

    // Step counter — right-aligned
    this.stepText = this.add
      .text(TBAR_X + TBAR_W - 14, TBAR_Y + 22, `0/${this.totalSteps} steps`, {
        fontSize: '12px',
        color: '#6b7280',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(1, 0.5)
      .setDepth(7);

    // Progress bar (track + animated fill)
    const PROG_PAD = 14;
    const PROG_H = 6;
    const PROG_Y = TBAR_Y + TBAR_H - PROG_H - 8;
    const PROG_X = TBAR_X + PROG_PAD;
    const PROG_W = TBAR_W - PROG_PAD * 2;

    const progTrack = this.add.graphics().setDepth(7);
    progTrack.fillStyle(0xe5e7eb, 1);
    progTrack.fillRoundedRect(PROG_X, PROG_Y, PROG_W, PROG_H, 3);

    this.progressBarGfx = this.add.graphics().setDepth(8);
    this.progressBarMaxW = PROG_W;
    this.progressBarInnerX = PROG_X;
    this.progressBarInnerY = PROG_Y;
    this.drawProgressBar(0);

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
        } else {
          // Spatial overlap — find the processor most overlapped by this card
          const proc = this.findOverlappingProcessor(obj);
          this.hoveredProcessor = proc;
          if (proc) {
            this.updateDropHighlight(proc);
          } else {
            this.dropHighlight.setVisible(false);
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
      this.hoveredProcessor = null;
      this.dropHighlight.setVisible(false);
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
      // Spatial drop: attach if an overlapping processor was found
      if ((obj.cardType === 'ingredient' || obj.cardType === 'intermediate') && this.hoveredProcessor) {
        if (this.activeProcessor && this.activeProcessor !== this.hoveredProcessor) return;
        this.attachToProcessor(obj, this.hoveredProcessor);
      }
      this.hoveredProcessor = null;
      this.dropHighlight.setVisible(false);
    });

    // -- Scatter cards --
    this.scatterCards();

    // -- Board footer strip --
    const FOOTER_H = 36;
    const footerBg = this.add.graphics().setDepth(4);
    footerBg.fillStyle(0x000000, 0.2);
    footerBg.fillRect(QUEST_PANEL_W, GAME_H - FOOTER_H, GAME_W - QUEST_PANEL_W, FOOTER_H);
    footerBg.lineStyle(1, 0x000000, 0.25);
    footerBg.lineBetween(QUEST_PANEL_W, GAME_H - FOOTER_H, GAME_W, GAME_H - FOOTER_H);

    // Download pill button
    const DL_W = 108;
    const DL_H = 22;
    const DL_X = QUEST_PANEL_W + 14;
    const DL_Y = GAME_H - FOOTER_H / 2 - DL_H / 2;
    const dlBtnBg = this.add.graphics().setDepth(5);
    const drawDlBg = (hover: boolean) => {
      dlBtnBg.clear();
      dlBtnBg.fillStyle(0xffffff, hover ? 0.28 : 0.16);
      dlBtnBg.lineStyle(1, 0xffffff, hover ? 0.7 : 0.4);
      dlBtnBg.fillRoundedRect(DL_X, DL_Y, DL_W, DL_H, 6);
      dlBtnBg.strokeRoundedRect(DL_X, DL_Y, DL_W, DL_H, 6);
    };
    drawDlBg(false);

    const dlBtn = this.add
      .text(DL_X + DL_W / 2, GAME_H - FOOTER_H / 2, '\u2193 Export JSON', {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    dlBtn.on('pointerover', () => drawDlBg(true));
    dlBtn.on('pointerout', () => drawDlBg(false));
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
    const minY = TOPBAR_H + FOOD_CARD_H / 2 + SCATTER.PAD;
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
      const newY = Phaser.Math.Between(TOPBAR_H + 20, GAME_H - FOOD_CARD_H / 2 - SCATTER.FOOTER - 10);
      this.tweens.add({
        targets: att.card,
        x: newX,
        y: newY,
        duration: 400,
        ease: 'Back.easeOut',
      });
    }
    attachments.length = 0;
    this.deactivateProcessor();
  }

  // -- Step Success --

  private onStepSuccess(step: Step, procCard: PuzzleCard): void {
    this.completedSteps.add(step.stepId);
    this.stepCount++;
    this.stepText.setText(`${this.stepCount}/${this.totalSteps} steps`);

    // Animate progress bar
    const progObj = { value: (this.stepCount - 1) / this.totalSteps };
    this.tweens.add({
      targets: progObj,
      value: this.stepCount / this.totalSteps,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: () => this.drawProgressBar(progObj.value),
    });

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
    this.deactivateProcessor();

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

      const overlapW = Math.min(cardRect.right, procRect.right) - Math.max(cardRect.left, procRect.left);
      const overlapH = Math.min(cardRect.bottom, procRect.bottom) - Math.max(cardRect.top, procRect.top);
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

  private drawProgressBar(fraction: number): void {
    this.progressBarGfx.clear();
    const w = this.progressBarMaxW * Math.min(1, Math.max(0, fraction));
    if (w > 0) {
      this.progressBarGfx.fillStyle(0x22c55e, 1);
      this.progressBarGfx.fillRoundedRect(
        this.progressBarInnerX,
        this.progressBarInnerY,
        w,
        6,
        3,
      );
    }
  }

  // -- Cook Button & Processor Activation --

  private showCookButton(): void {
    if (this.cookButton) return;

    const btnW = 140;
    const btnH = 50;
    const btnX = this.gameCenterX;
    const btnY = GAME_H - 70;

    const container = this.add.container(btnX, btnY).setDepth(150);

    const bg = this.add.graphics();
    bg.fillStyle(0xe74c3c, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
    container.add(bg);

    const label = this.add
      .text(0, 0, 'Cook!', {
        fontSize: '22px',
        fontStyle: 'bold',
        color: TEXT_COLORS.WHITE,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);
    container.add(label);

    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xc0392b, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
    });
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xe74c3c, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
    });
    container.on('pointerdown', () => this.onCookButtonPressed());

    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    this.cookButton = container;
  }

  private hideCookButton(): void {
    if (!this.cookButton) return;
    const btn = this.cookButton;
    this.cookButton = null;
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
      card.setInteractive({ draggable: true });
      card.setAlpha(1);
    }
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