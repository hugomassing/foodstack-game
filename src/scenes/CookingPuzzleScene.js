import Phaser from 'phaser';

const QUEST_PANEL_W = 250;
const CARD_W = 80;
const CARD_H = 90;

export class CookingPuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CookingPuzzleScene' });
    }

    /** Returns x position within the game area (right of quest panel) */
    gameX(fraction) {
        const { width } = this.scale;
        return QUEST_PANEL_W + fraction * (width - QUEST_PANEL_W);
    }

    get gameCenterX() {
        const { width } = this.scale;
        return QUEST_PANEL_W + (width - QUEST_PANEL_W) / 2;
    }

    get gameAreaW() {
        return this.scale.width - QUEST_PANEL_W;
    }

    create(data) {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Accept puzzle data from scene params
        this.puzzleData = data.puzzleData;

        // ── State ──
        this.completedSteps = new Set();
        this.availableIntermediates = new Map(); // stepId → output name
        this.stepCount = 0;
        this.debugMode = false;

        this.cards = [];              // all card containers on the board
        this.processorCards = new Map();  // processor name → card container
        this.processorAttachments = new Map(); // procCard → [{ card, itemName, stepId }]

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
        const outputToStepId = new Map();
        for (const step of this.allSteps) {
            if (step.stepId !== 'final') {
                outputToStepId.set(step.output, step.stepId);
            }
        }
        for (const step of this.allSteps) {
            step.inputs = step.inputs.map(inp => outputToStepId.get(inp) || inp);
        }

        // ── Quest Book ──
        this.questStepTexts = new Map();
        this.buildQuestBook();

        // ── Drag support ──
        this.input.on('drag', (pointer, obj, dragX, dragY) => {
            obj.x = dragX;
            obj.y = dragY;

            // If dragging a processor, move its entire stack
            if (obj.cardType === 'processor') {
                const attachments = this.processorAttachments.get(obj);
                if (attachments) {
                    const pileOffsetY = 16;
                    attachments.forEach((att, i) => {
                        att.card.x = dragX;
                        att.card.y = dragY + 20 + i * pileOffsetY;
                    });
                }
            }
        });

        this.input.on('dragstart', (pointer, obj) => {
            obj.setDepth(100);
            // If this ingredient is attached to a processor, detach it
            if (obj.attachedTo) {
                this.detachFromProcessor(obj);
            }
            // Bring entire stack to front when dragging a processor
            if (obj.cardType === 'processor') {
                const attachments = this.processorAttachments.get(obj);
                if (attachments) {
                    attachments.forEach((att, i) => {
                        att.card.setDepth(101 + i);
                    });
                }
            }
        });

        this.input.on('dragend', (pointer, obj) => {
            // Don't reset depth if card just got attached — layoutAttachedCards handles it
            if (!obj.attachedTo) {
                obj.setDepth(obj.cardDepth || 1);
            }
            // Restore stack depths when processor drag ends
            if (obj.cardType === 'processor') {
                const attachments = this.processorAttachments.get(obj);
                if (attachments) {
                    attachments.forEach((att, i) => {
                        att.card.setDepth((obj.cardDepth || 1) + 1 + i);
                    });
                }
            }
        });

        this.input.on('drop', (pointer, obj, dropZone) => {
            // Only attach ingredient/intermediate cards onto processor cards
            if ((obj.cardType === 'ingredient' || obj.cardType === 'intermediate') &&
                dropZone.cardType === 'processor') {
                this.attachToProcessor(obj, dropZone);
            }
        });

        // ── Scatter cards ──
        this.scatterCards();

        // ── Footer: dish name + step counter ──
        this.add.text(this.gameCenterX, height - 20, this.puzzleData.dishName, {
            fontSize: '16px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.stepText = this.add.text(width - 20, height - 20, `0/${this.totalSteps} steps`, {
            fontSize: '14px', color: '#aaaacc', fontFamily: 'Arial'
        }).setOrigin(1, 0.5);

        // ── Download recipe button ──
        const dlBtn = this.add.text(QUEST_PANEL_W + 10, height - 20, 'Download JSON', {
            fontSize: '11px', color: '#5dade2', fontFamily: 'Arial'
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
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

        // ── Debug toggle (D key) ──
        this.input.keyboard.on('keydown-D', () => {
            this.debugMode = !this.debugMode;
            this.rebuildQuestBook();
        });
    }

    // ── Card Creation ──

    createCard(x, y, label, type, meta = {}) {
        const palette = {
            ingredient:   { body: 0x3d3d54, bar: 0x2d2d44, border: 0x222238 },
            intermediate: { body: 0xf5b041, bar: 0xf39c12, border: 0xd68910 },
            processor:    { body: 0x5dade2, bar: 0x3498db, border: 0x2180b8 }
        };
        const colors = palette[type] || palette.ingredient;
        const emoji = meta.emoji || '';
        const topBarH = 22;

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, CARD_W, CARD_H, 8);

        // Card body
        const bg = this.add.graphics();
        bg.fillStyle(colors.body, 1);
        bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);
        // Border
        bg.lineStyle(2, colors.border, 1);
        bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 8);

        // Top bar
        const bar = this.add.graphics();
        bar.fillStyle(colors.bar, 1);
        bar.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, topBarH, { tl: 8, tr: 8, bl: 0, br: 0 });

        // Label text in top bar
        const text = this.add.text(0, -CARD_H / 2 + topBarH / 2, label, {
            fontSize: '10px', color: '#ffffff', fontFamily: 'Arial',
            align: 'center', wordWrap: { width: CARD_W - 8 }
        }).setOrigin(0.5);

        // Emoji centered in body area below bar
        const bodyCenter = -CARD_H / 2 + topBarH + (CARD_H - topBarH) / 2;
        const emojiText = this.add.text(0, bodyCenter, emoji, {
            fontSize: '28px', fontFamily: 'Arial', align: 'center'
        }).setOrigin(0.5);

        const container = this.add.container(x, y, [shadow, bg, bar, text, emojiText]);
        container.setSize(CARD_W, CARD_H);

        // Store card metadata
        container.cardType = type;
        container.cardLabel = label;
        container.cardBg = bg;
        container.cardShadow = shadow;
        container.itemName = meta.itemName || label;
        container.stepId = meta.stepId || null;
        container.attachedTo = null;  // which processor card this is attached to
        container.cardDepth = type === 'processor' ? 2 : 1;
        container.setDepth(container.cardDepth);

        if (type === 'processor') {
            // Processor: interactive as drop zone AND draggable
            container.setInteractive({ draggable: true, dropZone: true });
        } else {
            // Ingredient/intermediate: interactive and draggable only
            container.setInteractive({ draggable: true });
        }

        this.cards.push(container);
        return container;
    }

    // ── Scatter cards across game area ──

    scatterCards() {
        const { width, height } = this.scale;
        const minX = QUEST_PANEL_W + 60;
        const maxX = width - 60;
        const minY = 40;
        const maxY = height - 60;

        const positions = [];

        const findPosition = () => {
            for (let attempt = 0; attempt < 15; attempt++) {
                const x = Phaser.Math.Between(minX, maxX);
                const y = Phaser.Math.Between(minY, maxY);
                let overlapping = false;
                for (const pos of positions) {
                    if (Math.abs(x - pos.x) < CARD_W + 8 && Math.abs(y - pos.y) < CARD_H + 8) {
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
            const cols = Math.floor((maxX - minX) / (CARD_W + 12));
            const idx = positions.length;
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = minX + col * (CARD_W + 12) + Phaser.Math.Between(-5, 5);
            const y = minY + row * (CARD_H + 12) + Phaser.Math.Between(-5, 5);
            positions.push({ x, y });
            return { x, y };
        };

        // Build processor emoji lookup from JSON objects
        const procEmojiMap = new Map();
        for (const p of this.puzzleData.processors) {
            procEmojiMap.set(p.name, p.emoji);
        }

        // Collect all processors (from steps + palette)
        const usedProcessors = new Set();
        for (const step of this.allSteps) {
            usedProcessors.add(step.processor);
        }
        const paletteNames = this.puzzleData.processors.map(p => p.name);
        const processorSet = new Set([...usedProcessors, ...paletteNames]);
        const processors = Phaser.Utils.Array.Shuffle([...processorSet]);

        // Create processor cards
        for (const procName of processors) {
            const pos = findPosition();
            const emoji = procEmojiMap.get(procName) || '';
            const card = this.createCard(pos.x, pos.y, procName, 'processor', { emoji });
            this.processorCards.set(procName, card);
            this.processorAttachments.set(card, []);
        }

        // Create ingredient cards (raw + decoys, shuffled)
        const rawItems = [...this.puzzleData.ingredients, ...this.puzzleData.decoys];
        const shuffled = Phaser.Utils.Array.Shuffle([...rawItems]);
        for (const item of shuffled) {
            const pos = findPosition();
            this.createCard(pos.x, pos.y, item.name, 'ingredient', { itemName: item.name, emoji: item.emoji });
        }

        // Add "assemble" processor if needed (from finalStep)
        if (!this.processorCards.has(this.puzzleData.finalStep.processor)) {
            const pos = findPosition();
            const emoji = this.puzzleData.finalStep.processorEmoji || procEmojiMap.get(this.puzzleData.finalStep.processor) || '';
            const card = this.createCard(pos.x, pos.y, this.puzzleData.finalStep.processor, 'processor', { emoji });
            this.processorCards.set(this.puzzleData.finalStep.processor, card);
            this.processorAttachments.set(card, []);
        }
    }

    // ── Attach / Detach ──

    attachToProcessor(ingredientCard, procCard) {
        const attachments = this.processorAttachments.get(procCard);
        if (!attachments) return;

        // Prevent duplicates
        if (attachments.some(a => a.card === ingredientCard)) return;

        ingredientCard.attachedTo = procCard;
        attachments.push({
            card: ingredientCard,
            itemName: ingredientCard.itemName,
            stepId: ingredientCard.stepId
        });

        // Position attached cards fanning out above the processor
        this.layoutAttachedCards(procCard);

        // Check for match
        this.checkProcessorMatch(procCard);
    }

    detachFromProcessor(ingredientCard) {
        const procCard = ingredientCard.attachedTo;
        if (!procCard) return;

        const attachments = this.processorAttachments.get(procCard);
        if (attachments) {
            const idx = attachments.findIndex(a => a.card === ingredientCard);
            if (idx !== -1) attachments.splice(idx, 1);
            // Re-layout remaining
            this.layoutAttachedCards(procCard);
        }
        ingredientCard.attachedTo = null;
    }

    layoutAttachedCards(procCard) {
        const attachments = this.processorAttachments.get(procCard);
        if (!attachments) return;

        const pileOffsetY = 16; // vertical peek per card in the pile

        attachments.forEach((att, i) => {
            // First card offset slightly below processor, subsequent ones pile downward
            const targetX = procCard.x;
            const targetY = procCard.y + 20 + i * pileOffsetY;
            att.card.setDepth(procCard.cardDepth + 1 + i);
            this.tweens.add({
                targets: att.card,
                x: targetX, y: targetY,
                duration: 150, ease: 'Quad.easeOut'
            });
        });
    }

    // ── Match Checking ──

    checkProcessorMatch(procCard) {
        const attachments = this.processorAttachments.get(procCard);
        if (!attachments || attachments.length === 0) return;

        const procName = procCard.cardLabel;

        // Resolve attached items to input identifiers
        const resolvedInputs = attachments.map(att => {
            if (att.stepId) return att.stepId;
            // Check if this item name is an intermediate output
            for (const [stepId, outputName] of this.availableIntermediates) {
                if (outputName === att.itemName) return stepId;
            }
            return att.itemName;
        });
        const inputSet = new Set(resolvedInputs);

        console.log(`[Match] Processor: "${procName}", attached: [${[...inputSet].join(', ')}]`);

        // Check against all incomplete steps with this processor
        for (const step of this.allSteps) {
            if (this.completedSteps.has(step.stepId)) continue;
            if (step.processor !== procName) continue;

            const stepInputSet = new Set(step.inputs);
            console.log(`[Match] Checking step ${step.stepId}: needs [${[...stepInputSet].join(', ')}], have [${[...inputSet].join(', ')}]`);
            if (stepInputSet.size !== inputSet.size) continue;

            let match = true;
            for (const inp of stepInputSet) {
                if (!inputSet.has(inp)) { match = false; break; }
            }
            if (match) {
                this.onStepSuccess(step, procCard);
                return;
            }
        }

        // Wrong combo check: if attachment count matches a step's input count but no match
        for (const step of this.allSteps) {
            if (this.completedSteps.has(step.stepId)) continue;
            if (step.processor !== procName) continue;

            if (attachments.length === step.inputs.length) {
                // Full count but no match → shake and return
                this.shakeAndReturn(procCard);
                return;
            }
        }
    }

    shakeAndReturn(procCard) {
        const attachments = this.processorAttachments.get(procCard);
        if (!attachments) return;

        // Camera shake
        this.cameras.main.shake(300, 0.008);

        // Fly each attached ingredient to a random free position
        const toDetach = [...attachments];
        for (const att of toDetach) {
            att.card.attachedTo = null;
            const newX = Phaser.Math.Between(QUEST_PANEL_W + 60, this.scale.width - 60);
            const newY = Phaser.Math.Between(40, this.scale.height - 60);
            this.tweens.add({
                targets: att.card,
                x: newX, y: newY,
                duration: 400, ease: 'Back.easeOut'
            });
        }
        attachments.length = 0;
    }

    // ── Step Success ──

    onStepSuccess(step, procCard) {
        this.completedSteps.add(step.stepId);
        this.stepCount++;
        this.stepText.setText(`${this.stepCount}/${this.totalSteps} steps`);

        // Consume intermediate inputs
        for (const inp of step.inputs) {
            if (this.availableIntermediates.has(inp)) {
                this.availableIntermediates.delete(inp);
            }
        }

        const isFinal = step.stepId === 'final';

        // Green flash on processor
        const flash = this.add.graphics();
        flash.fillStyle(0x2ecc71, 0.5);
        flash.fillRoundedRect(-CARD_W / 2 - 4, -CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 10);
        flash.setPosition(procCard.x, procCard.y);
        flash.setDepth(99);
        this.tweens.add({
            targets: flash, alpha: 0, duration: 500,
            onComplete: () => flash.destroy()
        });

        // Camera green flash
        this.cameras.main.flash(300, 46, 204, 113, false);

        // Consume attached ingredient cards (shrink + fade)
        const attachments = this.processorAttachments.get(procCard);
        if (attachments) {
            for (const att of attachments) {
                this.tweens.add({
                    targets: att.card,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 300, ease: 'Quad.easeIn',
                    onComplete: () => {
                        const idx = this.cards.indexOf(att.card);
                        if (idx !== -1) this.cards.splice(idx, 1);
                        att.card.destroy();
                    }
                });
            }
            attachments.length = 0;
        }

        if (!isFinal) {
            // Produce intermediate output — spawn a new card
            this.availableIntermediates.set(step.stepId, step.output);
            this.spawnOutputCard(step, procCard);
        }

        // Update quest book
        this.rebuildQuestBook();

        if (isFinal) {
            this.time.delayedCall(400, () => this.onVictory(step.output));
        }
    }

    spawnOutputCard(step, procCard) {
        const card = this.createCard(procCard.x, procCard.y, step.output, 'intermediate', {
            itemName: step.output,
            stepId: step.stepId,
            emoji: '✨'
        });

        // Entrance animation
        card.setScale(0);
        this.tweens.add({
            targets: card,
            scaleX: 1, scaleY: 1,
            duration: 300, ease: 'Back.easeOut', delay: 200
        });

        // Float output name text
        const floatText = this.add.text(procCard.x, procCard.y - 10, step.output, {
            fontSize: '13px', fontStyle: 'bold', color: '#2ecc71', fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(101);
        this.tweens.add({
            targets: floatText, y: floatText.y - 40, alpha: 0, duration: 1200,
            ease: 'Quad.easeOut', onComplete: () => floatText.destroy()
        });
    }

    // ── Victory ──

    onVictory(dishName) {
        const { width, height } = this.scale;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(200);

        const victoryText = this.add.text(width / 2, -100, dishName, {
            fontSize: '28px', fontStyle: 'bold', color: '#f1c40f', fontFamily: 'Arial',
            align: 'center', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(201);

        this.tweens.add({
            targets: victoryText,
            y: height / 2 - 20,
            ease: 'Bounce.Out',
            duration: 1200
        });

        const subtitle = this.add.text(width / 2, -100, 'YOU WIN!', {
            fontSize: '20px', fontStyle: 'bold', color: '#2ecc71', fontFamily: 'Arial',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(201);

        this.tweens.add({
            targets: subtitle,
            y: height / 2 + 30,
            ease: 'Bounce.Out',
            duration: 1200,
            delay: 300
        });

        this.cameras.main.flash(600, 46, 204, 113, false);

        // "Play Again" button
        const btnText = this.add.text(width / 2, height / 2 + 80, 'Play Again', {
            fontSize: '16px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'Arial',
            backgroundColor: '#2ecc71', padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });

        btnText.setAlpha(0);
        this.tweens.add({
            targets: btnText, alpha: 1, duration: 500, delay: 1500
        });
        btnText.on('pointerdown', () => {
            this.scene.start('TitleScene');
        });
    }

    // ── Quest Book ──

    buildQuestBook() {
        const { height } = this.scale;

        const bg = this.add.graphics();
        bg.fillStyle(0x151528, 1);
        bg.fillRect(0, 0, QUEST_PANEL_W, height);

        const sep = this.add.graphics();
        sep.lineStyle(2, 0x444466);
        sep.lineBetween(QUEST_PANEL_W, 0, QUEST_PANEL_W, height);

        this.add.text(QUEST_PANEL_W / 2, 14, 'Quest Book', {
            fontSize: '16px', fontStyle: 'bold', color: '#f1c40f', fontFamily: 'Arial'
        }).setOrigin(0.5, 0);

        let curY = 44;
        const lineH = 20;
        const padX = 12;

        for (const branch of this.puzzleData.branches) {
            this.add.text(padX, curY, `── ${branch.name}`, {
                fontSize: '12px', fontStyle: 'bold', color: '#aaaacc', fontFamily: 'Arial'
            }).setOrigin(0, 0);
            curY += lineH;

            for (const step of branch.steps) {
                const txt = this.add.text(padX + 8, curY, '', {
                    fontSize: '11px', color: '#666688', fontFamily: 'Arial'
                }).setOrigin(0, 0);
                this.questStepTexts.set(step.stepId, txt);
                curY += lineH;
            }
            curY += 6;
        }

        this.add.text(padX, curY, '── final', {
            fontSize: '12px', fontStyle: 'bold', color: '#aaaacc', fontFamily: 'Arial'
        }).setOrigin(0, 0);
        curY += lineH;

        const finalTxt = this.add.text(padX + 8, curY, '', {
            fontSize: '11px', color: '#666688', fontFamily: 'Arial'
        }).setOrigin(0, 0);
        this.questStepTexts.set(this.puzzleData.finalStep.stepId, finalTxt);

        this.rebuildQuestBook();
    }

    rebuildQuestBook() {
        for (const step of this.allSteps) {
            const txt = this.questStepTexts.get(step.stepId);
            if (!txt) continue;

            if (this.completedSteps.has(step.stepId)) {
                txt.setText(`✓ ${step.output}`);
                txt.setColor('#2ecc71');
            } else if (this.debugMode) {
                const inputs = step.inputs.map(inp => {
                    // Resolve stepId references to their output names
                    for (const branch of this.puzzleData.branches) {
                        for (const s of branch.steps) {
                            if (s.stepId === inp) return `[${s.output}]`;
                        }
                    }
                    return inp;
                }).join(' + ');
                const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
                txt.setText(`${pe}${inputs} → ${step.output}`);
                txt.setColor('#e67e22');
            } else if (this.isStepActionable(step)) {
                const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
                txt.setText(`◉ ${pe}${step.processor} ← ${step.inputs.length}`);
                txt.setColor('#ffffff');
            } else {
                const pe = step.processorEmoji ? `${step.processorEmoji} ` : '';
                txt.setText(`○ ${pe}${step.processor} ← ${step.inputs.length}`);
                txt.setColor('#666688');
            }
        }
    }

    isStepActionable(step) {
        for (const inp of step.inputs) {
            if (this.isStepId(inp)) {
                if (!this.availableIntermediates.has(inp)) return false;
            }
        }
        return true;
    }

    isStepId(input) {
        return /^b\d+_s\d+$/.test(input) || input === 'final';
    }
}
