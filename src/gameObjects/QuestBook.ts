import Phaser from 'phaser';
import { GAME_H, QUEST_PANEL_W, FONT_FAMILY } from '../config';
import type { PuzzleData, Step } from '../types';

const M = 8;
const SB_X = M;
const SB_Y = M;
const SB_W = QUEST_PANEL_W - M * 2; // 224
const SB_H = GAME_H - M * 2;        // 524
const SB_R = 20;
const HEADER_H = 80;
const PAD = 12;
const STEP_H = 30;
const STEP_GAP = 4;
const GROUP_GAP = 10;
const BODY_Y = SB_Y + HEADER_H; // 88

export class QuestBook {
  private scene: Phaser.Scene;
  private puzzleData: PuzzleData;
  private allSteps: Step[];
  private completedSteps: Set<string>;
  private availableIntermediates: Map<string, string>;
  private questStepTexts = new Map<string, Phaser.GameObjects.Text>();
  private questStepCounts = new Map<string, Phaser.GameObjects.Text>();
  private debugMode = false;
  private stepHighlights!: Phaser.GameObjects.Graphics;
  private questStepY = new Map<string, number>();
  private stepCountText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    puzzleData: PuzzleData,
    allSteps: Step[],
    completedSteps: Set<string>,
    availableIntermediates: Map<string, string>,
  ) {
    this.scene = scene;
    this.puzzleData = puzzleData;
    this.allSteps = allSteps;
    this.completedSteps = completedSteps;
    this.availableIntermediates = availableIntermediates;
    this.build();
  }

  private build(): void {
    const add = this.scene.add;

    // ── Card shadow ──────────────────────────────────────────
    const shadow = add.graphics();
    shadow.fillStyle(0x3e2723, 1);
    shadow.fillRect(SB_X + 6, SB_Y + 8, SB_W, SB_H);

    // ── Cream card fill ──────────────────────────────────────
    const gfx = add.graphics();
    gfx.fillStyle(0xfffaf0, 1);
    gfx.fillRoundedRect(SB_X, SB_Y, SB_W, SB_H, SB_R);

    // ── Yellow header (rounded top, flat bottom) ─────────────
    gfx.fillStyle(0xffca28, 1);
    gfx.fillRoundedRect(SB_X, SB_Y, SB_W, HEADER_H, {
      tl: SB_R,
      tr: SB_R,
      bl: 0,
      br: 0,
    });
    gfx.lineStyle(4, 0x3e2723, 1);
    gfx.lineBetween(SB_X, SB_Y + HEADER_H, SB_X + SB_W, SB_Y + HEADER_H);

    // ── White body (rounded bottom corners to match card) ────
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(SB_X, BODY_Y, SB_W, SB_H - HEADER_H, { tl: 0, tr: 0, bl: SB_R, br: SB_R });

    // ── Card border (drawn last, on top) ─────────────────────
    gfx.lineStyle(4, 0x3e2723, 1);
    gfx.strokeRoundedRect(SB_X, SB_Y, SB_W, SB_H, SB_R);

    // ── White pin circle ────────────────────────────────────
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(SB_X + SB_W - 16, SB_Y + 14, 8);
    gfx.lineStyle(2, 0x3e2723, 1);
    gfx.strokeCircle(SB_X + SB_W - 16, SB_Y + 14, 8);

    // ── Header text ─────────────────────────────────────────
    add.text(SB_X + PAD, SB_Y + 16, 'RECIPE', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#3e2723',
      fontFamily: FONT_FAMILY,
    });

    const raw = this.puzzleData.dishName;
    const dishLabel = raw.length > 26 ? raw.slice(0, 24) + '\u2026' : raw;
    add.text(SB_X + PAD, SB_Y + 42, dishLabel, {
      fontSize: '11px',
      color: '#d84315',
      fontFamily: FONT_FAMILY,
    });

    // ── PROGRESS row ─────────────────────────────────────────
    add.text(SB_X + PAD, BODY_Y + 10, 'PROGRESS', {
      fontSize: '10px',
      color: '#a1887f',
      fontFamily: FONT_FAMILY,
    });

    // Badge background
    const badgeX = SB_X + SB_W - PAD - 60;
    const badgeY = BODY_Y + 7;
    const badgeBg = add.graphics();
    badgeBg.fillStyle(0xe0e0e0, 1);
    badgeBg.fillRoundedRect(badgeX, badgeY, 60, 18, 4);

    this.stepCountText = add.text(
      badgeX + 60 - 4,
      badgeY + 9,
      `0/${this.allSteps.length} STEPS`,
      {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#3e2723',
        fontFamily: FONT_FAMILY,
      },
    ).setOrigin(1, 0.5);

    // ── Step highlights layer ────────────────────────────────
    this.stepHighlights = add.graphics().setDepth(0);

    // ── Step rows ────────────────────────────────────────────
    let curY = BODY_Y + 34;

    const addStepRow = (step: Step): void => {
      this.questStepY.set(step.stepId, curY);

      const leftTxt = add.text(SB_X + PAD + 30, curY + STEP_H / 2, '', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#3e2723',
        fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0.5).setDepth(1);
      this.questStepTexts.set(step.stepId, leftTxt);

      const cntTxt = add.text(SB_X + SB_W - PAD - 8, curY + STEP_H / 2, '', {
        fontSize: '12px',
        color: '#8d6e63',
        fontFamily: FONT_FAMILY,
      }).setOrigin(1, 0.5).setDepth(1);
      this.questStepCounts.set(step.stepId, cntTxt);
    };

    for (const branch of this.puzzleData.branches) {
      add.text(SB_X + PAD, curY, `\u2014  ${branch.name.toUpperCase()}`, {
        fontSize: '10px',
        color: '#8d6e63',
        fontFamily: FONT_FAMILY,
      }).setOrigin(0, 0).setDepth(1);
      curY += 18;

      for (const step of branch.steps) {
        addStepRow(step);
        curY += STEP_H + STEP_GAP;
      }
      curY += GROUP_GAP;
    }

    // Final branch
    add.text(SB_X + PAD, curY, '\u2014  FINAL', {
      fontSize: '10px',
      color: '#8d6e63',
      fontFamily: FONT_FAMILY,
    }).setOrigin(0, 0).setDepth(1);
    curY += 18;
    addStepRow(this.puzzleData.finalStep);

    // ── Export JSON button (bottom of sidebar) ───────────────
    const EX_W = SB_W - PAD * 2;
    const EX_H = 28;
    const EX_X = SB_X + PAD;
    const EX_Y = SB_Y + SB_H - PAD - EX_H;
    const EX_R = 8;

    const exBg = add.graphics().setDepth(1);
    const drawExBg = (hover: boolean) => {
      exBg.clear();
      exBg.fillStyle(0x8d6e63, hover ? 0.7 : 0.35);
      exBg.fillRoundedRect(EX_X + 2, EX_Y + 3, EX_W, EX_H, EX_R);
      exBg.fillStyle(0xffffff, 1);
      exBg.fillRoundedRect(EX_X, EX_Y, EX_W, EX_H, EX_R);
      exBg.lineStyle(2, hover ? 0x3e2723 : 0x8d6e63, 1);
      exBg.strokeRoundedRect(EX_X, EX_Y, EX_W, EX_H, EX_R);
    };
    drawExBg(false);

    const exBtn = add.text(EX_X + EX_W / 2, EX_Y + EX_H / 2, '\u2193 EXPORT JSON', {
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#8d6e63',
      fontFamily: FONT_FAMILY,
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    exBtn.on('pointerover', () => { drawExBg(true); exBtn.setColor('#3e2723'); });
    exBtn.on('pointerout', () => { drawExBg(false); exBtn.setColor('#8d6e63'); });
    exBtn.on('pointerdown', () => {
      const json = JSON.stringify(this.puzzleData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.puzzleData.dishName.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    this.refresh();
  }

  refresh(): void {
    this.stepHighlights.clear();

    const cx = SB_X + PAD + 12;
    const rowX = SB_X + PAD;
    const rowW = SB_W - PAD * 2;

    for (const step of this.allSteps) {
      const y = this.questStepY.get(step.stepId);
      if (y === undefined) continue;

      const cy = y + STEP_H / 2;
      const completed = this.completedSteps.has(step.stepId);
      const actionable = !completed && this.isStepActionable(step);

      if (completed) {
        this.stepHighlights.fillStyle(0x4caf50, 1);
        this.stepHighlights.fillCircle(cx, cy, 8);
      } else if (actionable) {
        // Yellow row background
        this.stepHighlights.fillStyle(0xffecb3, 1);
        this.stepHighlights.fillRoundedRect(rowX, y, rowW, STEP_H, 8);
        this.stepHighlights.lineStyle(2, 0xffca28, 1);
        this.stepHighlights.strokeRoundedRect(rowX, y, rowW, STEP_H, 8);
        // Yellow circle outline + center dot
        this.stepHighlights.lineStyle(2, 0xffca28, 1);
        this.stepHighlights.strokeCircle(cx, cy, 8);
        this.stepHighlights.fillStyle(0xffca28, 1);
        this.stepHighlights.fillCircle(cx, cy, 4);
      } else {
        // Grey circle outline
        this.stepHighlights.lineStyle(2, 0xbdbdbd, 1);
        this.stepHighlights.strokeCircle(cx, cy, 8);
      }
    }

    // ── Per-step text updates ─────────────────────────────────
    for (const step of this.allSteps) {
      const leftTxt = this.questStepTexts.get(step.stepId);
      const cntTxt = this.questStepCounts.get(step.stepId);
      if (!leftTxt || !cntTxt) continue;

      const completed = this.completedSteps.has(step.stepId);
      const actionable = !completed && this.isStepActionable(step);

      if (completed) {
        leftTxt.setText('\u2713 ' + step.processor.toUpperCase()).setColor('#4caf50');
        cntTxt.setText('');
      } else if (actionable) {
        const emoji = step.processorEmoji ?? '';
        leftTxt.setText((emoji ? emoji + ' ' : '') + step.processor.toUpperCase()).setColor('#3e2723');
        cntTxt.setText('\u2190 ' + step.inputs.length).setColor('#8d6e63');
      } else {
        const emoji = step.processorEmoji ?? '';
        leftTxt.setText((emoji ? emoji + ' ' : '') + step.processor.toUpperCase()).setColor('#9ca3af');
        cntTxt.setText('\u2190 ' + step.inputs.length).setColor('#9ca3af');
      }
    }

    // ── Step count badge ─────────────────────────────────────
    const done = this.completedSteps.size;
    const total = this.allSteps.length;
    this.stepCountText.setText(`${done}/${total} STEPS`);
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    this.refresh();
  }

  private isStepActionable(step: Step): boolean {
    for (const inp of step.inputs) {
      if (this.isStepId(inp)) {
        if (!this.availableIntermediates.has(inp)) return false;
      }
    }
    return true;
  }

  private isStepId(input: string): boolean {
    return /^b\d+_s\d+$/.test(input) || input === 'final';
  }
}
