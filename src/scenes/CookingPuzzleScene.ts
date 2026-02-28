import Phaser from 'phaser';
import {
  createFoodCard,
  FOOD_CARD_COLORS,
  FOOD_CARD_W,
  FOOD_CARD_H,
  FOOD_CARD_RADIUS,
  type FoodCardColor,
} from '../createFoodCard';
import { GAME_W, GAME_H, DPR } from '../config';

const QUEST_PANEL_W = 280;

type CardType = 'ingredient' | 'intermediate' | 'processor';

interface Step {
  stepId: string;
  processor: string;
  processorEmoji?: string;
  inputs: string[];
  output: string;
}

interface Branch {
  name: string;
  steps: Step[];
}

interface Ingredient {
  name: string;
  emoji: string;
}

interface PuzzleData {
  dishName: string;
  branches: Branch[];
  finalStep: Step;
  ingredients: Ingredient[];
  decoys: Ingredient[];
  processors: { name: string; emoji: string }[];
}

interface PuzzleCard extends Phaser.GameObjects.Container {
  cardType: CardType;
  cardLabel: string;
  cardBg: Phaser.GameObjects.Graphics;
  cardShadow: Phaser.GameObjects.Graphics;
  itemName: string;
  stepId: string | null;
  attachedTo: PuzzleCard | null;
  cardDepth: number;
}

interface Attachment {
  card: PuzzleCard;
  itemName: string;
  stepId: string | null;
}

const ingredientColors = Object.values(FOOD_CARD_COLORS);

function nameToColor(n: string): FoodCardColor {
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ingredientColors[Math.abs(hash) % ingredientColors.length];
}

export class CookingPuzzleScene extends Phaser.Scene {
  private puzzleData!: PuzzleData;
  private completedSteps!: Set<string>;
  private availableIntermediates!: Map<string, string>;
  private stepCount!: number;
  private debugMode!: boolean;
  private cards!: PuzzleCard[];
  private processorCards!: Map<string, PuzzleCard>;
  private processorAttachments!: Map<PuzzleCard, Attachment[]>;
  private allSteps!: Step[];
  private totalSteps!: number;
  private questStepTexts!: Map<string, Phaser.GameObjects.Text>;
  private stepText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CookingPuzzleScene' });
  }

  gameX(fraction: number): number {
    return QUEST_PANEL_W + fraction * (GAME_W - QUEST_PANEL_W);
  }

  get gameCenterX(): number {
    return QUEST_PANEL_W + (GAME_W - QUEST_PANEL_W) / 2;
  }

  get gameAreaW(): number {
    return GAME_W - QUEST_PANEL_W;
  }

  create(data: { puzzleData: PuzzleData }): void {
    const width = GAME_W;
    const height = GAME_H;
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.cameras.main.setZoom(DPR);
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

    // Auto-set high resolution on all text objects for crisp rendering
    const _addText = this.add.text.bind(this.add);
    (this.add as any).text = (...args: Parameters<typeof _addText>) =>
      _addText(...args).setResolution(DPR);

    this.puzzleData = data.puzzleData;

    // -- State --
    this.completedSteps = new Set();
    this.availableIntermediates = new Map();
    this.stepCount = 0;
    this.debugMode = false;

    this.cards = [];
    this.processorCards = new Map();
    this.processorAttachments = new Map();

    // Build all steps list for matching
    this.allSteps = [];
    for (const branch of this.puzzleData.branches) {
      for (const step of branch.steps) {
        this.allSteps.push(step);
      }
    }
    this.allSteps.push(this.puzzleData.finalStep);
    this.totalSteps = this.allSteps.length;

    // Normalize step inputs: convert output-name references to stepIds
    // (AI sometimes writes "minced aromatics" instead of "b1_s1")
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
    this.questStepTexts = new Map();
    this.buildQuestBook();

    // -- Drag support --
    this.input.on(
      'drag',
      (_pointer: Phaser.Input.Pointer, obj: PuzzleCard, dragX: number, dragY: number) => {
        obj.x = dragX;
        obj.y = dragY;

        if (obj.cardType === 'processor') {
          const attachments = this.processorAttachments.get(obj);
          if (attachments) {
            const pileOffsetY = 18;
            attachments.forEach((att, i) => {
              att.card.x = dragX;
              att.card.y = dragY + 22 + i * pileOffsetY;
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

    // -- Footer: dish name + step counter --
    this.add
      .text(this.gameCenterX, height - 22, this.puzzleData.dishName, {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.stepText = this.add
      .text(width - 22, height - 22, `0/${this.totalSteps} steps`, {
        fontSize: '16px',
        color: '#aaaacc',
        fontFamily: 'Arial',
      })
      .setOrigin(1, 0.5);

    // -- Download recipe button --
    const dlBtn = this.add
      .text(QUEST_PANEL_W + 10, height - 20, 'Download JSON', {
        fontSize: '11px',
        color: '#5dade2',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    dlBtn.on('pointerover', () => dlBtn.setColor('#85c1e9'));
    dlBtn.on('pointerout', () => dlBtn.setColor('#5dade2'));
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
      this.debugMode = !this.debugMode;
      this.rebuildQuestBook();
    });
  }

  // -- Card Creation --

  createCard(
    x: number,
    y: number,
    label: string,
    type: CardType,
    meta: { emoji?: string; itemName?: string; stepId?: string } = {},
  ): PuzzleCard {
    const cardColor = type === 'processor' ? FOOD_CARD_COLORS.blue : nameToColor(label);

    const container = createFoodCard({
      scene: this,
      x,
      y,
      name: label,
      emoji: meta.emoji ?? '',
      color: cardColor,
      wave: type !== 'processor',
    }) as PuzzleCard;

    container.cardType = type;
    container.cardLabel = label;
    container.cardBg = container.list[1] as Phaser.GameObjects.Graphics;
    container.cardShadow = container.list[0] as Phaser.GameObjects.Graphics;
    container.itemName = meta.itemName ?? label;
    container.stepId = meta.stepId ?? null;
    container.attachedTo = null;
    container.cardDepth = type === 'processor' ? 2 : 1;
    container.setDepth(container.cardDepth);

    if (type === 'processor') {
      container.setInteractive({ draggable: true, dropZone: true });
      const ring = this.add.graphics();
      const pad = 4;
      ring.lineStyle(2, 0xf1c40f, 0.8);
      ring.strokeRoundedRect(
        -FOOD_CARD_W / 2 - pad,
        -FOOD_CARD_H / 2 - pad,
        FOOD_CARD_W + pad * 2,
        FOOD_CARD_H + pad * 2,
        FOOD_CARD_RADIUS + pad,
      );
      container.add(ring);
    } else {
      container.setInteractive({ draggable: true });
    }

    this.cards.push(container);
    return container;
  }

  // -- Scatter cards across game area --

  scatterCards(): void {
    const width = GAME_W;
    const height = GAME_H;
    const minX = QUEST_PANEL_W + FOOD_CARD_W / 2 + 10;
    const maxX = width - FOOD_CARD_W / 2 - 10;
    const minY = FOOD_CARD_H / 2 + 10;
    const maxY = height - FOOD_CARD_H / 2 - 30;

    const positions: { x: number; y: number }[] = [];

    const findPosition = (): { x: number; y: number } => {
      for (let attempt = 0; attempt < 15; attempt++) {
        const x = Phaser.Math.Between(minX, maxX);
        const y = Phaser.Math.Between(minY, maxY);
        let overlapping = false;
        for (const pos of positions) {
          if (Math.abs(x - pos.x) < FOOD_CARD_W + 8 && Math.abs(y - pos.y) < FOOD_CARD_H + 8) {
            overlapping = true;
            break;
          }
        }
        if (!overlapping) {
          positions.push({ x, y });
          return { x, y };
        }
      }
      // Fallback: grid with jitter
      const cols = Math.max(1, Math.floor((maxX - minX) / (FOOD_CARD_W + 12)));
      const idx = positions.length;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = minX + col * (FOOD_CARD_W + 14) + Phaser.Math.Between(-5, 5);
      const y = minY + row * (FOOD_CARD_H + 14) + Phaser.Math.Between(-5, 5);
      positions.push({ x, y });
      return { x, y };
    };

    // Build processor emoji lookup
    const procEmojiMap = new Map<string, string>();
    for (const p of this.puzzleData.processors) {
      procEmojiMap.set(p.name, p.emoji);
    }

    // Collect all processors (from steps + palette)
    const usedProcessors = new Set<string>();
    for (const step of this.allSteps) {
      usedProcessors.add(step.processor);
    }
    const paletteNames = this.puzzleData.processors.map((p) => p.name);
    const processorSet = new Set([...usedProcessors, ...paletteNames]);
    const processors = Phaser.Utils.Array.Shuffle([...processorSet]) as string[];

    // Create processor cards
    for (const procName of processors) {
      const pos = findPosition();
      const emoji = procEmojiMap.get(procName) ?? '';
      const card = this.createCard(pos.x, pos.y, procName, 'processor', { emoji });
      this.processorCards.set(procName, card);
      this.processorAttachments.set(card, []);
    }

    // Create ingredient cards (raw + decoys, shuffled)
    const rawItems = [...this.puzzleData.ingredients, ...this.puzzleData.decoys];
    const shuffled = Phaser.Utils.Array.Shuffle([...rawItems]) as Ingredient[];
    for (const item of shuffled) {
      const pos = findPosition();
      this.createCard(pos.x, pos.y, item.name, 'ingredient', {
        itemName: item.name,
        emoji: item.emoji,
      });
    }

    // Add final step processor if not already present
    if (!this.processorCards.has(this.puzzleData.finalStep.processor)) {
      const pos = findPosition();
      const emoji =
        this.puzzleData.finalStep.processorEmoji ??
        procEmojiMap.get(this.puzzleData.finalStep.processor) ??
        '';
      const card = this.createCard(pos.x, pos.y, this.puzzleData.finalStep.processor, 'processor', {
        emoji,
      });
      this.processorCards.set(this.puzzleData.finalStep.processor, card);
      this.processorAttachments.set(card, []);
    }
  }

  // -- Attach / Detach --

  attachToProcessor(ingredientCard: PuzzleCard, procCard: PuzzleCard): void {
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

  detachFromProcessor(ingredientCard: PuzzleCard): void {
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

  layoutAttachedCards(procCard: PuzzleCard): void {
    const attachments = this.processorAttachments.get(procCard);
    if (!attachments) return;

    const pileOffsetY = 18;

    attachments.forEach((att, i) => {
      const targetX = procCard.x;
      const targetY = procCard.y + 22 + i * pileOffsetY;
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

  checkProcessorMatch(procCard: PuzzleCard): void {
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

  shakeAndReturn(procCard: PuzzleCard): void {
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

  onStepSuccess(step: Step, procCard: PuzzleCard): void {
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
    flash.fillStyle(0x2ecc71, 0.5);
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
      this.spawnOutputCard(step, procCard);
    }

    this.rebuildQuestBook();

    if (isFinal) {
      this.time.delayedCall(400, () => this.onVictory(step.output));
    }
  }

  spawnOutputCard(step: Step, procCard: PuzzleCard): void {
    const card = this.createCard(procCard.x, procCard.y, step.output, 'intermediate', {
      itemName: step.output,
      stepId: step.stepId,
      emoji: '✨',
    });

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
        color: '#2ecc71',
        fontFamily: 'Arial',
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

  onVictory(dishName: string): void {
    const width = GAME_W;
    const height = GAME_H;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(200);

    const victoryText = this.add
      .text(width / 2, -100, dishName, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#f1c40f',
        fontFamily: 'Arial',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.tweens.add({
      targets: victoryText,
      y: height / 2 - 22,
      ease: 'Bounce.Out',
      duration: 1200,
    });

    const subtitle = this.add
      .text(width / 2, -100, 'YOU WIN!', {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#2ecc71',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.tweens.add({
      targets: subtitle,
      y: height / 2 + 34,
      ease: 'Bounce.Out',
      duration: 1200,
      delay: 300,
    });

    this.cameras.main.flash(600, 46, 204, 113, false);

    const btnText = this.add
      .text(width / 2, height / 2 + 80, 'Play Again', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Arial',
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

  // -- Quest Book --

  buildQuestBook(): void {
    const height = GAME_H;

    const bg = this.add.graphics();
    bg.fillStyle(0x151528, 1);
    bg.fillRect(0, 0, QUEST_PANEL_W, height);

    const sep = this.add.graphics();
    sep.lineStyle(2, 0x444466);
    sep.lineBetween(QUEST_PANEL_W, 0, QUEST_PANEL_W, height);

    this.add
      .text(QUEST_PANEL_W / 2, 16, 'Quest Book', {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f1c40f',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5, 0);

    let curY = 50;
    const lineH = 22;
    const padX = 14;

    for (const branch of this.puzzleData.branches) {
      this.add
        .text(padX, curY, `\u2500\u2500 ${branch.name}`, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#aaaacc',
          fontFamily: 'Arial',
        })
        .setOrigin(0, 0);
      curY += lineH;

      for (const step of branch.steps) {
        const txt = this.add
          .text(padX + 8, curY, '', {
            fontSize: '12px',
            color: '#666688',
            fontFamily: 'Arial',
          })
          .setOrigin(0, 0);
        this.questStepTexts.set(step.stepId, txt);
        curY += lineH;
      }
      curY += 6;
    }

    this.add
      .text(padX, curY, '\u2500\u2500 final', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#aaaacc',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);
    curY += lineH;

    const finalTxt = this.add
      .text(padX + 8, curY, '', {
        fontSize: '12px',
        color: '#666688',
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0);
    this.questStepTexts.set(this.puzzleData.finalStep.stepId, finalTxt);

    this.rebuildQuestBook();
  }

  rebuildQuestBook(): void {
    for (const step of this.allSteps) {
      const txt = this.questStepTexts.get(step.stepId);
      if (!txt) continue;

      if (this.completedSteps.has(step.stepId)) {
        txt.setText(`\u2713 ${step.output}`);
        txt.setColor('#2ecc71');
      } else if (this.debugMode) {
        const inputs = step.inputs
          .map((inp) => {
            for (const branch of this.puzzleData.branches) {
              for (const s of branch.steps) {
                if (s.stepId === inp) return `[${s.output}]`;
              }
            }
            return inp;
          })
          .join(' + ');
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`${pe}${inputs} \u2192 ${step.output}`);
        txt.setColor('#e67e22');
      } else if (this.isStepActionable(step)) {
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`\u25c9 ${pe}${step.processor} \u2190 ${step.inputs.length}`);
        txt.setColor('#ffffff');
      } else {
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`\u25cb ${pe}${step.processor} \u2190 ${step.inputs.length}`);
        txt.setColor('#666688');
      }
    }
  }

  isStepActionable(step: Step): boolean {
    for (const inp of step.inputs) {
      if (this.isStepId(inp)) {
        if (!this.availableIntermediates.has(inp)) return false;
      }
    }
    return true;
  }

  isStepId(input: string): boolean {
    return /^b\d+_s\d+$/.test(input) || input === 'final';
  }
}