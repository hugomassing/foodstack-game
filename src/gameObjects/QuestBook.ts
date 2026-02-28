import Phaser from 'phaser';
import { GAME_H, QUEST_PANEL_W, QUEST_BOOK, COLORS, TEXT_COLORS, FONT_FAMILY } from '../config';
import type { PuzzleData, Step } from '../types';

export class QuestBook {
  private scene: Phaser.Scene;
  private puzzleData: PuzzleData;
  private allSteps: Step[];
  private completedSteps: Set<string>;
  private availableIntermediates: Map<string, string>;
  private questStepTexts = new Map<string, Phaser.GameObjects.Text>();
  private debugMode = false;

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
    const height = GAME_H;

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.QUEST_BG, 1);
    bg.fillRect(0, 0, QUEST_PANEL_W, height);

    const sep = this.scene.add.graphics();
    sep.lineStyle(2, COLORS.SEPARATOR);
    sep.lineBetween(QUEST_PANEL_W, 0, QUEST_PANEL_W, height);

    this.scene.add
      .text(QUEST_PANEL_W / 2, QUEST_BOOK.TITLE_Y, 'Quest Book', {
        fontSize: '18px',
        fontStyle: 'bold',
        color: TEXT_COLORS.GOLD,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5, 0);

    let curY = QUEST_BOOK.START_Y;

    for (const branch of this.puzzleData.branches) {
      this.scene.add
        .text(QUEST_BOOK.PAD_X, curY, `\u2500\u2500 ${branch.name}`, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: TEXT_COLORS.BRANCH,
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0, 0);
      curY += QUEST_BOOK.LINE_H;

      for (const step of branch.steps) {
        const txt = this.scene.add
          .text(QUEST_BOOK.PAD_X + QUEST_BOOK.INDENT, curY, '', {
            fontSize: '12px',
            color: TEXT_COLORS.DIM,
            fontFamily: FONT_FAMILY,
          })
          .setOrigin(0, 0);
        this.questStepTexts.set(step.stepId, txt);
        curY += QUEST_BOOK.LINE_H;
      }
      curY += QUEST_BOOK.BRANCH_GAP;
    }

    this.scene.add
      .text(QUEST_BOOK.PAD_X, curY, '\u2500\u2500 final', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: TEXT_COLORS.BRANCH,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0);
    curY += QUEST_BOOK.LINE_H;

    const finalTxt = this.scene.add
      .text(QUEST_BOOK.PAD_X + QUEST_BOOK.INDENT, curY, '', {
        fontSize: '12px',
        color: TEXT_COLORS.DIM,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0);
    this.questStepTexts.set(this.puzzleData.finalStep.stepId, finalTxt);

    this.refresh();
  }

  refresh(): void {
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
        txt.setColor(TEXT_COLORS.WHITE);
      } else {
        const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
        txt.setText(`\u25cb ${pe}${step.processor} \u2190 ${step.inputs.length}`);
        txt.setColor(TEXT_COLORS.DIM);
      }
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