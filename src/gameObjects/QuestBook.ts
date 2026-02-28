import Phaser from 'phaser';
import { GAME_H, QUEST_PANEL_W, QUEST_BOOK, COLORS, TEXT_COLORS, FONT_FAMILY } from '../config';
import type { PuzzleData, Step } from '../types';

const HEADER_H = 60;
const PROG_H = 5;
const PROG_Y = HEADER_H + 1;
const LIST_START_Y = HEADER_H + PROG_H + 28;

export class QuestBook {
  private scene: Phaser.Scene;
  private puzzleData: PuzzleData;
  private allSteps: Step[];
  private completedSteps: Set<string>;
  private availableIntermediates: Map<string, string>;
  private questStepTexts = new Map<string, Phaser.GameObjects.Text>();
  private debugMode = false;
  private stepHighlights!: Phaser.GameObjects.Graphics;
  private questStepY = new Map<string, number>();
  private stepCountText!: Phaser.GameObjects.Text;
  private sidebarProgressGfx!: Phaser.GameObjects.Graphics;

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
    const PAD_X = QUEST_BOOK.PAD_X;
    const INDENT = QUEST_BOOK.INDENT;
    const LINE_H = QUEST_BOOK.LINE_H;
    const BRANCH_GAP = QUEST_BOOK.BRANCH_GAP;

    // ── Panel background ─────────────────────────────────────
    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.QUEST_BG, 1);
    bg.fillRect(0, 0, QUEST_PANEL_W, GAME_H);

    // ── Right separator: thick dark + soft inner highlight ───
    const sep = this.scene.add.graphics();
    sep.lineStyle(4, COLORS.SEPARATOR, 1);
    sep.lineBetween(QUEST_PANEL_W, 0, QUEST_PANEL_W, GAME_H);
    sep.lineStyle(1, 0xffffff, 0.18);
    sep.lineBetween(QUEST_PANEL_W - 4, 0, QUEST_PANEL_W - 4, GAME_H);

    // ── Header bar ───────────────────────────────────────────
    const header = this.scene.add.graphics();
    // Amber accent stripe at top
    header.fillStyle(0xf59e0b, 1);
    header.fillRect(0, 0, QUEST_PANEL_W, 4);
    // Cream fill below stripe
    header.fillStyle(COLORS.QUEST_BG, 1);
    header.fillRect(0, 4, QUEST_PANEL_W, HEADER_H - 4);
    // Bottom border
    header.lineStyle(3, COLORS.SEPARATOR, 1);
    header.lineBetween(0, HEADER_H, QUEST_PANEL_W, HEADER_H);

    // "Recipe" title
    this.scene.add
      .text(QUEST_PANEL_W / 2, 14, 'Recipe', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: TEXT_COLORS.DARK,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5, 0);

    // Dish name subtitle (truncated to one line)
    const raw = this.puzzleData.dishName;
    const dishLabel = raw.length > 26 ? raw.slice(0, 24) + '\u2026' : raw;
    this.scene.add
      .text(QUEST_PANEL_W / 2, 36, dishLabel, {
        fontSize: '11px',
        color: TEXT_COLORS.BRANCH,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5, 0);

    // ── Progress bar strip ───────────────────────────────────
    const progTrack = this.scene.add.graphics();
    progTrack.fillStyle(0xe5e7eb, 1);
    progTrack.fillRect(0, PROG_Y, QUEST_PANEL_W, PROG_H);

    this.sidebarProgressGfx = this.scene.add.graphics();

    // ── Step count header ────────────────────────────────────
    this.stepCountText = this.scene.add
      .text(PAD_X, HEADER_H + PROG_H + 9, `0 / ${this.allSteps.length} steps`, {
        fontSize: '11px',
        color: TEXT_COLORS.DIM,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0);

    // ── Step highlights + state bars (drawn under text) ──────
    this.stepHighlights = this.scene.add.graphics().setDepth(0);

    // ── Faint horizontal rule lines between step rows ────────
    const rules = this.scene.add.graphics().setDepth(0);
    rules.lineStyle(1, 0x000000, 0.05);

    // ── Branch + step list ───────────────────────────────────
    let curY = LIST_START_Y;

    for (const branch of this.puzzleData.branches) {
      this.scene.add
        .text(PAD_X, curY, `\u2500\u2500 ${branch.name}`, {
          fontSize: '11px',
          color: TEXT_COLORS.BRANCH,
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0, 0)
        .setDepth(1);
      curY += LINE_H;

      for (const step of branch.steps) {
        this.questStepY.set(step.stepId, curY);
        const txt = this.scene.add
          .text(PAD_X + INDENT, curY, '', {
            fontSize: '12px',
            color: TEXT_COLORS.DIM,
            fontFamily: FONT_FAMILY,
          })
          .setOrigin(0, 0)
          .setDepth(1);
        this.questStepTexts.set(step.stepId, txt);
        rules.lineBetween(PAD_X, curY + LINE_H - 1, QUEST_PANEL_W - PAD_X, curY + LINE_H - 1);
        curY += LINE_H;
      }
      curY += BRANCH_GAP;
    }

    // ── Final branch ─────────────────────────────────────────
    this.scene.add
      .text(PAD_X, curY, '\u2500\u2500 final', {
        fontSize: '11px',
        color: TEXT_COLORS.BRANCH,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0)
      .setDepth(1);
    curY += LINE_H;

    const finalStep = this.puzzleData.finalStep;
    this.questStepY.set(finalStep.stepId, curY);
    const finalTxt = this.scene.add
      .text(PAD_X + INDENT, curY, '', {
        fontSize: '12px',
        color: TEXT_COLORS.DIM,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0)
      .setDepth(1);
    this.questStepTexts.set(finalStep.stepId, finalTxt);
    rules.lineBetween(PAD_X, curY + LINE_H - 1, QUEST_PANEL_W - PAD_X, curY + LINE_H - 1);

    this.refresh();
  }

  refresh(): void {
    // ── Step highlights + left accent bars ───────────────────
    this.stepHighlights.clear();
    for (const step of this.allSteps) {
      const y = this.questStepY.get(step.stepId);
      if (y === undefined) continue;

      if (this.completedSteps.has(step.stepId)) {
        // Subtle green row tint
        this.stepHighlights.fillStyle(0x16a34a, 0.08);
        this.stepHighlights.fillRect(0, y - 1, QUEST_PANEL_W, QUEST_BOOK.LINE_H);
        // Solid green left bar
        this.stepHighlights.fillStyle(0x16a34a, 1);
        this.stepHighlights.fillRect(0, y - 1, 3, QUEST_BOOK.LINE_H);
      } else if (this.isStepActionable(step)) {
        // Amber row highlight
        this.stepHighlights.fillStyle(COLORS.QUEST_ITEM_ACTIVE, 1);
        this.stepHighlights.fillRect(0, y - 3, QUEST_PANEL_W, QUEST_BOOK.LINE_H + 4);
        // Amber left bar
        this.stepHighlights.fillStyle(0xf59e0b, 1);
        this.stepHighlights.fillRect(0, y - 3, 3, QUEST_BOOK.LINE_H + 4);
      } else {
        // Subtle gray left bar for pending steps
        this.stepHighlights.fillStyle(0xd1d5db, 1);
        this.stepHighlights.fillRect(0, y - 1, 3, QUEST_BOOK.LINE_H);
      }
    }

    // ── Progress bar ─────────────────────────────────────────
    const done = this.completedSteps.size;
    const total = this.allSteps.length;
    this.drawSidebarProgress(total > 0 ? done / total : 0);

    // ── Step count text ───────────────────────────────────────
    this.stepCountText.setText(`${done} / ${total} steps`);

    // ── Per-step text ─────────────────────────────────────────
    for (const step of this.allSteps) {
      const txt = this.questStepTexts.get(step.stepId);
      if (!txt) continue;

      if (this.completedSteps.has(step.stepId)) {
        txt.setText(`\u2713 ${step.output}`);
        txt.setColor(TEXT_COLORS.SUCCESS);
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
        txt.setColor(TEXT_COLORS.DEBUG);
      } else if (this.isStepActionable(step)) {
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`\u25c9 ${pe}${step.processor} \u2190 ${step.inputs.length}`);
        txt.setColor(TEXT_COLORS.DARK);
      } else {
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`\u25cb ${pe}${step.processor} \u2190 ${step.inputs.length}`);
        txt.setColor(TEXT_COLORS.DIM);
      }
    }
  }

  private drawSidebarProgress(fraction: number): void {
    this.sidebarProgressGfx.clear();
    const w = QUEST_PANEL_W * Math.min(1, Math.max(0, fraction));
    if (w > 0) {
      this.sidebarProgressGfx.fillStyle(0x22c55e, 1);
      this.sidebarProgressGfx.fillRect(0, PROG_Y, w, PROG_H);
    }
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
