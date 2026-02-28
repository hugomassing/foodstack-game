import Phaser from 'phaser';
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";

type Category = 'Style' | 'Protein' | 'Method' | 'Base';
type Difficulty = 'easy' | 'medium' | 'hard';

const WORD_LISTS: Record<Category, string[]> = {
  Style: ['Crispy', 'Smoky', 'Spicy', 'Cheesy', 'Tangy', 'Herby'],
  Protein: ['Meatball', 'Chicken', 'Tofu', 'Shrimp', 'Mushroom', 'Pulled Pork'],
  Method: ['Stuffed', 'Glazed', 'Grilled', 'Braised', 'Roasted', 'Caramelized'],
  Base: ['Bun', 'Bowl', 'Wrap', 'Taco', 'Pasta', 'Salad'],
};

const CATEGORIES = Object.keys(WORD_LISTS) as Category[];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

interface WordChip {
  text: Phaser.GameObjects.Text;
  word: string;
}

interface DiffButton {
  text: Phaser.GameObjects.Text;
  diff: Difficulty;
}

export class TitleScene extends Phaser.Scene {
  private selections!: Record<Category, string>;
  private wordChips!: Record<string, WordChip[]>;
  private difficulty!: Difficulty;
  private isLoading!: boolean;
  private dishNameText!: Phaser.GameObjects.Text;
  private diffButtons!: DiffButton[];
  private loadingText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.selections = {} as Record<Category, string>;
    this.wordChips = {};
    this.difficulty = 'medium';
    this.isLoading = false;

    // Random defaults
    for (const cat of CATEGORIES) {
      const words = WORD_LISTS[cat];
      this.selections[cat] = words[Phaser.Math.Between(0, words.length - 1)];
    }

    // Title
    this.add
      .text(width / 2, 30, 'FoodStack', {
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#f1c40f',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, 65, 'Pick your ingredients, cook your puzzle!', {
        fontSize: '13px',
        color: '#aaaacc',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Word columns
    const colW = width / (CATEGORIES.length + 1);
    const startY = 100;

    for (let c = 0; c < CATEGORIES.length; c++) {
      const cat = CATEGORIES[c];
      const cx = colW * (c + 0.75);

      this.add
        .text(cx, startY, cat, {
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#5dade2',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);

      this.wordChips[cat] = [];
      const words = WORD_LISTS[cat];

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const y = startY + 28 + w * 28;
        const txt = this.add
          .text(cx, y, word, {
            fontSize: '13px',
            color: '#888899',
            fontFamily: 'Arial',
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        txt.on('pointerover', () => {
          if (this.selections[cat] !== word) txt.setColor('#ccccdd');
        });
        txt.on('pointerout', () => {
          if (this.selections[cat] !== word) txt.setColor('#888899');
        });
        txt.on('pointerdown', () => {
          if (this.isLoading) return;
          this.selections[cat] = word;
          this.refreshChips();
          this.refreshDishName();
        });

        this.wordChips[cat].push({ text: txt, word });
      }
    }

    // Dish name preview
    this.dishNameText = this.add
      .text(width / 2, height - 120, '', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Difficulty selector
    const diffY = height - 88;
    this.add
      .text(width / 2 - 100, diffY, 'Difficulty:', {
        fontSize: '12px',
        color: '#aaaacc',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.diffButtons = [];
    for (let d = 0; d < DIFFICULTIES.length; d++) {
      const diff = DIFFICULTIES[d];
      const bx = width / 2 + (d - 1) * 60 + 10;
      const txt = this.add
        .text(bx, diffY, diff, {
          fontSize: '13px',
          color: '#888899',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      txt.on('pointerdown', () => {
        if (this.isLoading) return;
        this.difficulty = diff;
        this.refreshDifficulty();
      });

      this.diffButtons.push({ text: txt, diff });
    }

    // Buttons row
    const btnY = height - 45;
    this.createButton(width / 2 - 80, btnY, 'Cook!', '#2ecc71', () => this.onCook());
    this.createButton(width / 2 + 80, btnY, 'Demo', '#3498db', () => this.onDemo());
    this.createButton(width / 2 + 200, btnY, 'Load JSON', '#8e44ad', () => this.onLoadJSON());

    // Loading text
    this.loadingText = this.add
      .text(width / 2, height / 2 + 60, '', {
        fontSize: '14px',
        color: '#f1c40f',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Error text
    this.errorText = this.add
      .text(width / 2, height - 155, '', {
        fontSize: '12px',
        color: '#e74c3c',
        fontFamily: 'Arial',
        wordWrap: { width: width - 100 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.refreshChips();
    this.refreshDishName();
    this.refreshDifficulty();
  }

  private createButton(x: number, y: number, label: string, color: string, callback: () => void) {
    const w = 120,
      h = 36,
      r = 8;
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const txt = this.add
      .text(x, y, label, {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on('pointerdown', callback);
    return { bg, txt };
  }

  private refreshChips() {
    for (const cat of CATEGORIES) {
      for (const chip of this.wordChips[cat]) {
        if (chip.word === this.selections[cat]) {
          chip.text.setColor('#f1c40f').setFontStyle('bold');
        } else {
          chip.text.setColor('#888899').setFontStyle('');
        }
      }
    }
  }

  private refreshDishName() {
    this.dishNameText.setText(CATEGORIES.map((c) => this.selections[c]).join(' '));
  }

  private refreshDifficulty() {
    for (const btn of this.diffButtons) {
      if (btn.diff === this.difficulty) {
        btn.text.setColor('#f1c40f').setFontStyle('bold');
      } else {
        btn.text.setColor('#888899').setFontStyle('');
      }
    }
  }

  private getDishName() {
    return CATEGORIES.map((c) => this.selections[c]).join(' ');
  }

  private async onCook() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.errorText.setVisible(false);

    const dishName = this.getDishName();
    this.loadingText.setText(`Generating "${dishName}"...`).setVisible(true);

    const dots = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const current = this.loadingText.text;
        const dotCount = (current.match(/\./g) ?? []).length;
        const base = current.replace(/\.+$/, '');
        this.loadingText.setText(base + '.'.repeat((dotCount % 3) + 1));
      },
    });

    try {
      const puzzleData = await convex.action(api.generator.generateOrGetRecipe, {
        dishName,
        difficulty: this.difficulty,
      });
      dots.destroy();
      this.loadingText.setVisible(false);
      this.isLoading = false;
      this.scene.start('CookingPuzzleScene', { puzzleData });
    } catch (err) {
      dots.destroy();
      this.loadingText.setVisible(false);
      this.isLoading = false;
      this.errorText.setText((err as Error).message).setVisible(true);
    }
  }

  private async onDemo() {
    if (this.isLoading) return;
    const module = await import('../data/mockPuzzle.json');
    this.scene.start('CookingPuzzleScene', { puzzleData: module.default });
  }

  private onLoadJSON() {
    if (this.isLoading) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const puzzleData = JSON.parse(ev.target!.result as string);
          this.scene.start('CookingPuzzleScene', { puzzleData });
        } catch {
          this.errorText.setText('Invalid JSON file').setVisible(true);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}