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

const APPROX_MAP: Record<string, string> = {
  pork: 'ham', 'pork chops': 'ham', 'ground pork': 'ham',
  beef: 'steak', 'ground beef': 'steak', 'beef strips': 'steak',
  chicken: 'drumstick', 'chicken breast': 'drumstick', 'chicken thigh': 'drumstick',
  'bell pepper': 'pepper', jalapeño: 'pepper', 'chili peppers': 'chili',
  'spring onion': 'onion', scallion: 'onion', shallot: 'onion',
  tortilla: 'flatbread', wrap: 'flatbread', 'pita bread': 'pita',
  'bread crumbs': 'bread_slice', 'cream cheese': 'cream', 'sour cream': 'cream',
  broth: 'soup', stock: 'soup', 'fish sauce': 'soy_sauce',
  syrup: 'honey', 'maple syrup': 'honey', vinegar: 'soy_sauce',
  'rice noodles': 'noodles', 'egg noodles': 'noodles',
  'sesame oil': 'olive_oil', 'cooking oil': 'olive_oil', oil: 'olive_oil',
  'lime juice': 'lime', 'lemon juice': 'lemon',
  'whipped cream': 'cream', 'heavy cream': 'cream',
  'mozzarella': 'cheese', 'parmesan': 'cheese', 'cheddar': 'cheese',
};

function localAssetMatch(name: string): string | null {
  const lower = name.toLowerCase();
  const normalized = lower.replace(/\s+/g, '_');

  // Exact ID match
  if (FoodAssets.find(normalized)) return normalized;

  // Exact label match
  for (const item of FoodAssets.all) {
    if (item.label.toLowerCase() === lower) return item.id;
  }

  // Strip trailing 's' for plurals (e.g. "onions" → "onion")
  if (normalized.endsWith('s') && FoodAssets.find(normalized.slice(0, -1))) {
    return normalized.slice(0, -1);
  }

  // Hardcoded approximate mappings
  if (APPROX_MAP[lower]) return APPROX_MAP[lower];

  // Check if any word in the name matches an asset (e.g. "chopped pork" → "ham" via APPROX_MAP, "fresh salmon" → "salmon")
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (FoodAssets.find(word)) return word;
    const singular = word.endsWith('s') ? word.slice(0, -1) : null;
    if (singular && FoodAssets.find(singular)) return singular;
    if (APPROX_MAP[word]) return APPROX_MAP[word];
  }

  // Tag-based search: find an asset whose tags contain a word from the name
  for (const word of words) {
    const tagged = FoodAssets.byTag(word);
    if (tagged.length > 0) return tagged[0].id;
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
    this.cameras.main.setBackgroundColor('#d32f2f');
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    // ── Background food icons ─────────────────────────────────
    this.drawBgIcons();

    // ── Layout constants ──────────────────────────────────────
    const BD_X = 248, BD_Y = 78, BD_W = 704, BD_H = 454, BD_R = 20;
    const TB_X = 248, TB_Y = 8, TB_W = 704, TB_H = 62, TB_R = 14;

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

    // -- Top bar card --
    const topBarShadow = this.add.graphics().setDepth(5);
    topBarShadow.fillStyle(0x3e2723, 1);
    topBarShadow.fillRoundedRect(TB_X + 6, TB_Y + 6, TB_W, TB_H, TB_R);

    const topBarBg = this.add.graphics().setDepth(6);
    topBarBg.fillStyle(0xfffaf0, 1);
    topBarBg.fillRoundedRect(TB_X, TB_Y, TB_W, TB_H, TB_R);
    topBarBg.lineStyle(4, 0x3e2723, 1);
    topBarBg.strokeRoundedRect(TB_X, TB_Y, TB_W, TB_H, TB_R);

    // Dish name — left-aligned, uppercase
    this.add
      .text(TB_X + 16, TB_Y + TB_H / 2, this.puzzleData.dishName.toUpperCase(), {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#3e2723',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0.5)
      .setDepth(7);

    // Step counter — right-aligned
    this.stepText = this.add
      .text(TB_X + TB_W - 14, TB_Y + TB_H / 2, `0/${this.totalSteps} STEPS`, {
        fontSize: '11px',
        color: '#8d6e63',
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(1, 0.5)
      .setDepth(7);

    // Progress bar (track + animated fill) — near bottom of top bar
    const PROG_H = 10;
    const PROG_Y = TB_Y + TB_H - 18;
    const PROG_X = TB_X + 16;
    const PROG_W = TB_W - 32;

    const progTrack = this.add.graphics().setDepth(7);
    progTrack.fillStyle(0xe5e7eb, 1);
    progTrack.fillRoundedRect(PROG_X, PROG_Y, PROG_W, PROG_H, 5);
    progTrack.lineStyle(2, 0x3e2723, 1);
    progTrack.strokeRoundedRect(PROG_X, PROG_Y, PROG_W, PROG_H, 5);

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


    // -- Debug toggle (D key) --
    this.input.keyboard!.on('keydown-D', () => {
      this.questBook.toggleDebugMode();
    });
  }

  // -- Scatter cards across game area --

  private scatterCards(): void {
    const minX = 248 + FOOD_CARD_W / 2 + SCATTER.PAD;
    const maxX = 248 + 704 - FOOD_CARD_W / 2 - SCATTER.PAD;
    const minY = 78 + FOOD_CARD_H / 2 + SCATTER.PAD;
    const maxY = 78 + 454 - FOOD_CARD_H / 2 - SCATTER.FOOTER;

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
      const newX = Phaser.Math.Between(248 + 68, 248 + 704 - 68);
      const newY = Phaser.Math.Between(78 + 20, 78 + 454 - FOOD_CARD_H / 2 - SCATTER.FOOTER - 10);
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
    this.stepText.setText(`${this.stepCount}/${this.totalSteps} STEPS`);

    // Animate progress bar
    const progObj = { value: (this.stepCount - 1) / this.totalSteps };
    this.tweens.add({
      targets: progObj,
      value: this.stepCount / this.totalSteps,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: () => this.drawProgressBar(progObj.value),
    });

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
        if (att.card.cardType === 'intermediate') {
          // Keep intermediate cards — scatter them back for potential reuse
          const newX = Phaser.Math.Between(QUEST_PANEL_W + 68, GAME_W - 68);
          const newY = Phaser.Math.Between(TOPBAR_H + 20, GAME_H - FOOD_CARD_H / 2 - SCATTER.FOOTER - 10);
          this.tweens.add({
            targets: att.card,
            x: newX,
            y: newY,
            duration: 400,
            ease: 'Back.easeOut',
          });
        } else {
          // Scatter ingredient cards back onto the board for reuse
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
    // Asset priority: AI-provided outputAssetId > local fuzzy match on output name
    const logicalAsset = step.outputAssetId ?? localAssetMatch(step.output);

    // Always collect input texture keys as fallback
    const inputTextureKeys: string[] = [];
    for (const c of inputCards) {
      if (c.foodImage) {
        const key = c.foodImage.texture.key;
        if (key.startsWith('food_') && this.textures.exists(key)) {
          inputTextureKeys.push(key);
        }
      }
    }

    // Decide what to show:
    // - Logical asset found → use it as-is (single image, no fan)
    // - No logical asset, 1 input → inherit that input's image
    // - No logical asset, 2+ inputs → fan all input images
    const useLogical = logicalAsset && this.textures.exists(`food_${logicalAsset}`);
    const primaryAsset = useLogical
      ? logicalAsset
      : inputTextureKeys.length > 0 ? inputTextureKeys[0].slice(5) : null;

    // Spawn away from the processor so the new card isn't hidden underneath it
    const boardMinX = QUEST_PANEL_W + FOOD_CARD_W / 2 + SCATTER.PAD;
    const boardMaxX = GAME_W - FOOD_CARD_W / 2 - SCATTER.PAD;
    const boardMinY = TOPBAR_H + FOOD_CARD_H / 2 + SCATTER.PAD;
    const boardMaxY = GAME_H - FOOD_CARD_H / 2 - SCATTER.FOOTER;

    let spawnX: number;
    let spawnY: number;
    for (let attempt = 0; attempt < SCATTER.MAX_ATTEMPTS; attempt++) {
      spawnX = Phaser.Math.Between(boardMinX, boardMaxX);
      spawnY = Phaser.Math.Between(boardMinY, boardMaxY);
      // Accept if far enough from the processor
      if (
        Math.abs(spawnX - procCard.x) > FOOD_CARD_W + SCATTER.CARD_GAP ||
        Math.abs(spawnY - procCard.y) > FOOD_CARD_H + SCATTER.CARD_GAP
      ) {
        break;
      }
    }
    // TypeScript: spawnX/spawnY are always assigned by the loop (MAX_ATTEMPTS >= 1)
    spawnX ??= Phaser.Math.Between(boardMinX, boardMaxX);
    spawnY ??= Phaser.Math.Between(boardMinY, boardMaxY);

    // Find the highest depth among existing cards so the new one renders on top
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

    // Fan multiple input images when no logical asset was resolved
    if (!useLogical && inputTextureKeys.length > 1) {
      const fanDim = Math.round(FOOD_CARD_H * 0.32);
      const imageY = -FOOD_CARD_H / 2 + FOOD_CARD_H * 0.34;
      const count = inputTextureKeys.length;
      const spreadX = Math.min(14, 32 / count);
      const spreadY = Math.min(6, 14 / count);
      const rotStep = Math.min(0.25, 0.5 / count);

      // Shrink & offset the primary image to participate in the fan
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
        shadow.setScale(shadowScale).setOrigin(0.5).setTint(0x000000).setAlpha(0.2).setRotation(rot);
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
      this.progressBarGfx.fillStyle(0x4caf50, 1);
      this.progressBarGfx.fillRoundedRect(
        this.progressBarInnerX,
        this.progressBarInnerY,
        w,
        10,
        5,
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
        img.setScale(iconSize / 512)
          .setAngle(angle)
          .setAlpha(0.12)
          .setDepth(-3)
          .setBlendMode(Phaser.BlendModes.MULTIPLY);
      }
    }
  }
}