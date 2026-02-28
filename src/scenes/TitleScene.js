import Phaser from 'phaser';

const WORD_LISTS = {
    Style:   ['Crispy', 'Smoky', 'Spicy', 'Cheesy', 'Tangy', 'Herby'],
    Protein: ['Meatball', 'Chicken', 'Tofu', 'Shrimp', 'Mushroom', 'Pulled Pork'],
    Method:  ['Stuffed', 'Glazed', 'Grilled', 'Braised', 'Roasted', 'Caramelized'],
    Base:    ['Bun', 'Bowl', 'Wrap', 'Taco', 'Pasta', 'Salad'],
};

const CATEGORIES = Object.keys(WORD_LISTS);
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // State
        this.selections = {};
        this.wordChips = {};  // category → [ { text, word } ]
        this.difficulty = 'medium';
        this.isLoading = false;

        // Random defaults
        for (const cat of CATEGORIES) {
            const words = WORD_LISTS[cat];
            this.selections[cat] = words[Phaser.Math.Between(0, words.length - 1)];
        }

        // Title
        this.add.text(width / 2, 30, 'FoodStack', {
            fontSize: '36px', fontStyle: 'bold', color: '#f1c40f',
            fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 65, 'Pick your ingredients, cook your puzzle!', {
            fontSize: '13px', color: '#aaaacc', fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Word columns
        const colW = width / (CATEGORIES.length + 1);
        const startY = 100;

        for (let c = 0; c < CATEGORIES.length; c++) {
            const cat = CATEGORIES[c];
            const cx = colW * (c + 0.75);

            // Column header
            this.add.text(cx, startY, cat, {
                fontSize: '14px', fontStyle: 'bold', color: '#5dade2', fontFamily: 'Arial'
            }).setOrigin(0.5);

            this.wordChips[cat] = [];
            const words = WORD_LISTS[cat];

            for (let w = 0; w < words.length; w++) {
                const word = words[w];
                const y = startY + 28 + w * 28;
                const txt = this.add.text(cx, y, word, {
                    fontSize: '13px', color: '#888899', fontFamily: 'Arial'
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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
        this.dishNameText = this.add.text(width / 2, height - 120, '', {
            fontSize: '20px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Difficulty selector
        const diffY = height - 88;
        this.add.text(width / 2 - 100, diffY, 'Difficulty:', {
            fontSize: '12px', color: '#aaaacc', fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.diffButtons = [];
        for (let d = 0; d < DIFFICULTIES.length; d++) {
            const diff = DIFFICULTIES[d];
            const bx = width / 2 + (d - 1) * 60 + 10;
            const txt = this.add.text(bx, diffY, diff, {
                fontSize: '13px', color: '#888899', fontFamily: 'Arial'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            txt.on('pointerdown', () => {
                if (this.isLoading) return;
                this.difficulty = diff;
                this.refreshDifficulty();
            });

            this.diffButtons.push({ text: txt, diff });
        }

        // Buttons row
        const btnY = height - 45;

        // Cook button
        this.cookBtn = this.createButton(width / 2 - 80, btnY, 'Cook!', '#2ecc71', () => {
            this.onCook();
        });

        // Demo button
        this.createButton(width / 2 + 80, btnY, 'Demo', '#3498db', () => {
            this.onDemo();
        });

        // Load JSON button
        this.createButton(width / 2 + 200, btnY, 'Load JSON', '#8e44ad', () => {
            this.onLoadJSON();
        });

        // Loading text (hidden initially)
        this.loadingText = this.add.text(width / 2, height / 2 + 60, '', {
            fontSize: '14px', color: '#f1c40f', fontFamily: 'Arial'
        }).setOrigin(0.5).setVisible(false);

        // Error text (hidden initially)
        this.errorText = this.add.text(width / 2, height - 155, '', {
            fontSize: '12px', color: '#e74c3c', fontFamily: 'Arial',
            wordWrap: { width: width - 100 }, align: 'center'
        }).setOrigin(0.5).setVisible(false);

        // Initial render
        this.refreshChips();
        this.refreshDishName();
        this.refreshDifficulty();
    }

    createButton(x, y, label, color, callback) {
        const bg = this.add.graphics();
        const w = 120, h = 36, r = 8;
        bg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);

        const txt = this.add.text(x, y, label, {
            fontSize: '15px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Hit area on the text
        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', callback);

        return { bg, txt };
    }

    refreshChips() {
        for (const cat of CATEGORIES) {
            for (const chip of this.wordChips[cat]) {
                if (chip.word === this.selections[cat]) {
                    chip.text.setColor('#f1c40f');
                    chip.text.setFontStyle('bold');
                } else {
                    chip.text.setColor('#888899');
                    chip.text.setFontStyle('');
                }
            }
        }
    }

    refreshDishName() {
        const name = CATEGORIES.map(c => this.selections[c]).join(' ');
        this.dishNameText.setText(name);
    }

    refreshDifficulty() {
        for (const btn of this.diffButtons) {
            if (btn.diff === this.difficulty) {
                btn.text.setColor('#f1c40f');
                btn.text.setFontStyle('bold');
            } else {
                btn.text.setColor('#888899');
                btn.text.setFontStyle('');
            }
        }
    }

    getDishName() {
        return CATEGORIES.map(c => this.selections[c]).join(' ');
    }

    async onCook() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.errorText.setVisible(false);

        const dishName = this.getDishName();
        this.loadingText.setText(`Generating "${dishName}"...`).setVisible(true);

        // Simple loading animation
        const dots = this.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                const current = this.loadingText.text;
                const dotCount = (current.match(/\./g) || []).length;
                const base = current.replace(/\.+$/, '');
                this.loadingText.setText(base + '.'.repeat((dotCount % 3) + 1));
            }
        });

        try {
            const res = await fetch('/api/generate-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dishName, difficulty: this.difficulty }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err.error || `Server error ${res.status}`);
            }

            const puzzleData = await res.json();
            dots.destroy();
            this.loadingText.setVisible(false);
            this.isLoading = false;
            this.scene.start('CookingPuzzleScene', { puzzleData });
        } catch (err) {
            dots.destroy();
            this.loadingText.setVisible(false);
            this.isLoading = false;
            this.errorText.setText(err.message).setVisible(true);
        }
    }

    async onDemo() {
        if (this.isLoading) return;
        const module = await import('../data/mockPuzzle.json');
        this.scene.start('CookingPuzzleScene', { puzzleData: module.default });
    }

    onLoadJSON() {
        if (this.isLoading) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const puzzleData = JSON.parse(ev.target.result);
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
