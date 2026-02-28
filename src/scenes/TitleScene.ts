import Phaser from "phaser";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";
import { GAME_W, FONT_FAMILY } from "../config";

type Category = "Style" | "Filling" | "Method" | "Base";

const WORD_LISTS: Record<Category, string[]> = {
  Style: ["Crispy", "Smoky", "Spicy", "Cheesy", "Tangy", "Herby", "Zesty"],
  Filling: ["Ham", "Chicken", "Tofu", "Shrimp", "Mushroom", "Meatball"],
  Method: ["Stuffed", "Glazed", "Grilled", "Braised", "Roasted", "Caramelized"],
  Base: ["Bun", "Bowl", "Wrap", "Taco", "Pasta", "Salad"],
};

const CATEGORIES = Object.keys(WORD_LISTS) as Category[];

// All coordinates are logical px at GAME_W = 960.
// s = canvas.width / GAME_W scales everything to the physical canvas size.
const B = {
  cardX: 190,
  cardY: 18,
  cardW: 580,
  cardH: 478,
  cardR: 20,
  pinCX: 480,
  pinCY: 18,
  pinR: 14,

  titleY: 52,

  // Selector rows — h=44, gap=6 between rows
  rowLeft: 210,
  rowInnerW: 540,
  rowH: 44,
  rowYs: { Style: 82, Filling: 132, Method: 182, Base: 232 } as Record<
    Category,
    number
  >,
  labelX: 226,
  leftArrowCX: 314,
  rightArrowCX: 646,
  valueCX: 480,
  arrowSz: 34,

  // Summary box
  sumX: 210,
  sumY: 288,
  sumW: 540,
  sumH: 88,
  sumR: 16,
  sumLabelY: 306,
  dishY: 338,

  // Action buttons
  // START RECIPE: full width, taller, prominent 3D shadow
  startX: 210,
  startY: 388,
  startW: 540,
  startH: 48,
  startShadow: 8,
  // DEMO / LOAD: side by side. Shadow bottom = 446+40+6 = 492 ≤ card bottom (496)
  demoX: 210,
  demoY: 446,
  demoW: 262,
  demoH: 40,
  demoShadow: 6,
  loadX: 480,
  loadY: 446,
  loadW: 270,
  loadH: 40,
  loadShadow: 6,

  errorY: 490,
} as const;

export class TitleScene extends Phaser.Scene {
  private selections!: Record<Category, string>;
  private selectorTexts!: Record<Category, Phaser.GameObjects.Text>;
  private summaryText!: Phaser.GameObjects.Text;
  private isLoading!: boolean;
  private customNameInputEl!: HTMLInputElement;
  private domInput!: Phaser.GameObjects.DOMElement;
  private loadingSpinner!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;

  // Difficulty hidden from UI; defaults to "medium" for the API call
  private readonly difficulty = "medium" as const;

  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width } = this.scale;
    const s = width / GAME_W;
    const p = (v: number) => Math.round(v * s);
    const fs = (v: number) => `${Math.round(v * s)}px`;

    // ── Init state ────────────────────────────────────────────────────────────
    this.selections = {} as Record<Category, string>;
    this.selectorTexts = {} as Record<Category, Phaser.GameObjects.Text>;
    this.isLoading = false;

    for (const cat of CATEGORIES) {
      const words = WORD_LISTS[cat];
      this.selections[cat] = words[Phaser.Math.Between(0, words.length - 1)];
    }

    // ── Red background + food icon decorations ───────────────────────────────
    this.cameras.main.setBackgroundColor("#d32f2f");
    this.drawFoodDecorations(s);

    // ── Card shadow + card ────────────────────────────────────────────────────
    const cardX = p(B.cardX),
      cardY = p(B.cardY);
    const cardW = p(B.cardW),
      cardH = p(B.cardH),
      cardR = p(B.cardR);

    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x3e2723, 1);
    cardShadow.fillRoundedRect(cardX, cardY + p(8), cardW, cardH, cardR);

    const card = this.add.graphics();
    card.fillStyle(0xfffaf0, 1);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, cardR);
    card.lineStyle(p(4), 0x3e2723, 1);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, cardR);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add
      .text(p(B.valueCX), p(B.titleY), "CREATE RECIPE", {
        fontSize: fs(32),
        fontStyle: "bold",
        color: "#3e2723",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);

    // ── Selector rows ─────────────────────────────────────────────────────────
    for (const cat of CATEGORIES) {
      this.createSelectorRow(s, cat, B.rowYs[cat]);
    }

    // ── Summary box ───────────────────────────────────────────────────────────
    const sX = p(B.sumX),
      sY = p(B.sumY),
      sW = p(B.sumW),
      sH = p(B.sumH),
      sR = p(B.sumR);

    const sumShadow = this.add.graphics();
    sumShadow.fillStyle(0x3e2723, 1);
    sumShadow.fillRoundedRect(sX, sY + p(6), sW, sH, sR);

    const sumBox = this.add.graphics();
    sumBox.fillStyle(0xffca28, 1);
    sumBox.fillRoundedRect(sX, sY, sW, sH, sR);
    sumBox.lineStyle(p(3), 0x3e2723, 1);
    sumBox.strokeRoundedRect(sX, sY, sW, sH, sR);

    this.add
      .text(p(B.valueCX), p(B.sumLabelY), "SELECTED ORDER", {
        fontSize: fs(10),
        fontStyle: "bold",
        color: "#b45309",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);

    this.summaryText = this.add
      .text(p(B.valueCX), p(B.dishY), "", {
        fontSize: fs(19),
        fontStyle: "bold",
        color: "#3e2723",
        fontFamily: FONT_FAMILY,
        align: "center",
        wordWrap: { width: p(480) },
      })
      .setOrigin(0.5);

    // ── HTML input overlay on summary text ────────────────────────────────────
    if (!document.getElementById("foodstack-input-style")) {
      const style = document.createElement("style");
      style.id = "foodstack-input-style";
      style.textContent =
        "#foodstack-name-input::placeholder { color: #b45309; opacity: 0.6; }";
      document.head.appendChild(style);
    }

    this.customNameInputEl = document.createElement("input");
    this.customNameInputEl.id = "foodstack-name-input";
    this.customNameInputEl.type = "text";
    this.customNameInputEl.style.cssText = [
      `font-size: ${p(18)}px`,
      `font-family: ${FONT_FAMILY}`,
      `font-weight: bold`,
      `color: #3e2723`,
      `background: transparent`,
      `border: none`,
      `border-bottom: 2px solid #3e2723`,
      `outline: none`,
      `text-align: center`,
      `width: ${p(480)}px`,
      `caret-color: #b45309`,
      `text-transform: uppercase`,
    ].join(";");
    this.domInput = this.add.dom(
      p(B.valueCX),
      p(B.dishY),
      this.customNameInputEl,
    );
    this.domInput.setOrigin(0.5);
    this.domInput.setVisible(false);

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.isLoading) return;
      if (document.activeElement === this.customNameInputEl) return;
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      this.summaryText.setVisible(false);
      this.domInput.setVisible(true);
      this.customNameInputEl.focus();
    };
    document.addEventListener("keydown", onKeyDown);

    this.customNameInputEl.addEventListener("blur", () => {
      if (!this.customNameInputEl.value.trim()) {
        this.domInput.setVisible(false);
        this.summaryText.setVisible(true);
      }
    });

    this.events.once("shutdown", () =>
      document.removeEventListener("keydown", onKeyDown),
    );

    // ── START RECIPE button (full width, prominent) ───────────────────────────
    this.createStyledButton(
      s,
      B.startX,
      B.startY,
      B.startW,
      B.startH,
      B.startShadow,
      "▶  START RECIPE",
      0x4caf50,
      0x2e7d32,
      () => this.onCook(),
    );

    // ── DEMO / LOAD buttons ───────────────────────────────────────────────────
    this.createStyledButton(
      s,
      B.demoX,
      B.demoY,
      B.demoW,
      B.demoH,
      B.demoShadow,
      "DEMO",
      0x29b6f6,
      0x0277bd,
      () => this.onDemo(),
    );
    this.createStyledButton(
      s,
      B.loadX,
      B.loadY,
      B.loadW,
      B.loadH,
      B.loadShadow,
      "LOAD",
      0x9e9e9e,
      0x616161,
      () => this.onLoadJSON(),
    );

    // ── Loading indicator ─────────────────────────────────────────────────────
    const cx = p(B.valueCX);
    this.loadingSpinner = this.add.graphics();
    this.loadingSpinner.lineStyle(Math.max(1, p(2)), 0x3e2723, 0.9);
    this.loadingSpinner.arc(0, 0, p(8), 0, Phaser.Math.DegToRad(270));
    this.loadingSpinner.strokePath();
    this.loadingSpinner.setPosition(cx - p(72), p(B.dishY));
    this.loadingSpinner.setVisible(false);

    this.loadingText = this.add
      .text(cx - p(58), p(B.dishY), "", {
        fontSize: fs(12),
        color: "#3e2723",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    // ── Error text ────────────────────────────────────────────────────────────
    this.errorText = this.add
      .text(cx, p(B.errorY), "", {
        fontSize: fs(13),
        color: "#e74c3c",
        fontFamily: FONT_FAMILY,
        wordWrap: { width: p(520) },
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.refreshSelectors();
    this.refreshDishName();
  }

  // ── Food icon background decorations ──────────────────────────────────────
  private drawFoodDecorations(s: number) {
    const { width, height } = this.scale;
    const keys = [
      "bg_burrito",
      "bg_pizza",
      "bg_ramen",
      "bg_chicken",
      "bg_shrimp",
    ];
    const rng = new Phaser.Math.RandomDataGenerator(["foodstack-title-bg"]);
    const cols = 12;
    const rows = 7;
    const cellW = width / cols;
    const cellH = height / rows;
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
        img
          .setScale(iconSize / 512)
          .setAngle(angle)
          .setAlpha(0.12)
          .setBlendMode(Phaser.BlendModes.MULTIPLY);
      }
    }
  }

  // ── Selector row ───────────────────────────────────────────────────────────
  private createSelectorRow(s: number, cat: Category, rowTopY: number) {
    const p = (v: number) => Math.round(v * s);
    const fs = (v: number) => `${Math.round(v * s)}px`;
    const rX = p(B.rowLeft),
      rY = p(rowTopY),
      rW = p(B.rowInnerW),
      rH = p(B.rowH);
    const rowCY = rY + Math.round(rH / 2);
    const r = p(8);

    // Row shadow + bg
    const rowShadow = this.add.graphics();
    rowShadow.fillStyle(0x000000, 0.07);
    rowShadow.fillRoundedRect(rX, rY + p(3), rW, rH, r);

    const rowBg = this.add.graphics();
    rowBg.fillStyle(0xf5f0e8, 1);
    rowBg.fillRoundedRect(rX, rY, rW, rH, r);
    rowBg.lineStyle(p(2), 0xe8ddd0, 1);
    rowBg.strokeRoundedRect(rX, rY, rW, rH, r);

    // Category label
    this.add
      .text(p(B.labelX), rowCY, cat.toUpperCase(), {
        fontSize: fs(11),
        color: "#a1887f",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0, 0.5);

    // Arrow buttons (use rowCY so they align with label/value text)
    this.createArrowBtn(s, p(B.leftArrowCX), rowCY, "‹", () =>
      this.prevWord(cat),
    );
    this.createArrowBtn(s, p(B.rightArrowCX), rowCY, "›", () =>
      this.nextWord(cat),
    );

    // Value text — UPPERCASE
    const valueTxt = this.add
      .text(p(B.valueCX), rowCY, this.selections[cat].toUpperCase(), {
        fontSize: fs(17),
        fontStyle: "bold",
        color: "#3e2723",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);
    this.selectorTexts[cat] = valueTxt;
  }

  // ── Arrow button ───────────────────────────────────────────────────────────
  private createArrowBtn(
    s: number,
    cx: number,
    cy: number,
    glyph: string,
    cb: () => void,
  ) {
    const p = (v: number) => Math.round(v * s);
    const sz = p(B.arrowSz),
      r = p(8);

    const bg = this.add.graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? 0xddd5c8 : 0xe8e0d8, 1);
      bg.fillRoundedRect(cx - sz / 2, cy - sz / 2, sz, sz, r);
    };
    drawBg(false);

    const txt = this.add
      .text(cx, cy, glyph, {
        fontSize: `${p(22)}px`,
        color: "#3e2723",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerover", () => {
      if (!this.isLoading) drawBg(true);
    });
    txt.on("pointerout", () => drawBg(false));
    txt.on("pointerdown", () => {
      if (!this.isLoading) cb();
    });
  }

  // ── 3D push-button ─────────────────────────────────────────────────────────
  private createStyledButton(
    s: number,
    x: number,
    y: number,
    w: number,
    h: number,
    shadowDepth: number,
    label: string,
    fillHex: number,
    shadowHex: number,
    cb: () => void,
  ) {
    const p = (v: number) => Math.round(v * s);
    const bx = p(x),
      by = p(y),
      bw = p(w),
      bh = p(h);
    const offset = p(shadowDepth),
      r = p(10);

    // Static shadow (never moves)
    const shadow = this.add.graphics();
    shadow.fillStyle(shadowHex, 1);
    shadow.fillRoundedRect(bx, by + offset, bw, bh, r);

    const fill = this.add.graphics();
    const drawFill = (pressed: boolean) => {
      fill.clear();
      const dy = pressed ? offset : 0;
      fill.fillStyle(fillHex, 1);
      fill.fillRoundedRect(bx, by + dy, bw, bh, r);
    };
    drawFill(false);

    const txt = this.add
      .text(bx + bw / 2, by + bh / 2, label, {
        fontSize: `${p(17)}px`,
        fontStyle: "bold",
        color: "#ffffff",
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);
    const textBaseY = txt.y;

    // Interactive zone spans the full visual area (fill + shadow)
    const zone = this.add
      .zone(bx + bw / 2, by + (bh + offset) / 2, bw, bh + offset)
      .setInteractive({ useHandCursor: true });

    let pressed = false;
    zone.on("pointerdown", () => {
      if (this.isLoading) return;
      pressed = true;
      drawFill(true);
      txt.y = textBaseY + offset;
    });
    zone.on("pointerup", () => {
      if (!pressed) return;
      pressed = false;
      drawFill(false);
      txt.y = textBaseY;
      cb();
    });
    zone.on("pointerout", () => {
      if (pressed) {
        pressed = false;
        drawFill(false);
        txt.y = textBaseY;
      }
    });
  }

  // ── State helpers ──────────────────────────────────────────────────────────
  private nextWord(cat: Category) {
    const words = WORD_LISTS[cat];
    const idx = words.indexOf(this.selections[cat]);
    this.selections[cat] = words[(idx + 1) % words.length];
    this.refreshSelectors();
    this.refreshDishName();
  }

  private prevWord(cat: Category) {
    const words = WORD_LISTS[cat];
    const idx = words.indexOf(this.selections[cat]);
    this.selections[cat] = words[(idx - 1 + words.length) % words.length];
    this.refreshSelectors();
    this.refreshDishName();
  }

  private refreshSelectors() {
    for (const cat of CATEGORIES) {
      if (this.selectorTexts[cat]) {
        this.selectorTexts[cat].setText(this.selections[cat].toUpperCase());
      }
    }
  }

  private refreshDishName() {
    const name = CATEGORIES.map((c) => this.selections[c])
      .join(" ")
      .toUpperCase();
    this.customNameInputEl.placeholder = name;
    if (this.summaryText) {
      this.summaryText.setText(name);
    }
  }

  private getDishName() {
    // Return original-case name for the API (input value or from selections)
    const raw = this.customNameInputEl.value.trim();
    return raw || CATEGORIES.map((c) => this.selections[c]).join(" ");
  }

  // ── Action handlers ────────────────────────────────────────────────────────
  private async onCook() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.errorText.setVisible(false);

    const dishName = this.getDishName();

    this.loadingSpinner.setVisible(true);
    this.tweens.add({
      targets: this.loadingSpinner,
      angle: 360,
      duration: 700,
      repeat: -1,
      ease: "Linear",
    });
    this.loadingText.setText(`Generating "${dishName}"…`).setVisible(true);

    const inputWasVisible = this.domInput.visible;
    this.domInput.setVisible(false);
    this.summaryText.setVisible(false);

    const hideLoading = () => {
      this.tweens.killTweensOf(this.loadingSpinner);
      this.loadingSpinner.setAngle(0).setVisible(false);
      this.loadingText.setVisible(false);
      if (!inputWasVisible) this.summaryText.setVisible(true);
    };

    try {
      const puzzleData = await convex.action(
        api.generator.generateOrGetRecipe,
        { dishName, difficulty: this.difficulty },
      );
      hideLoading();
      if (inputWasVisible) this.domInput.setVisible(true);
      this.isLoading = false;
      this.scene.start("CookingPuzzleScene", { puzzleData });
    } catch (err) {
      hideLoading();
      if (inputWasVisible) this.domInput.setVisible(true);
      this.isLoading = false;
      this.errorText.setText((err as Error).message).setVisible(true);
    }
  }

  private async onDemo() {
    if (this.isLoading) return;
    const module = await import("../data/mockPuzzle.json");
    this.scene.start("CookingPuzzleScene", { puzzleData: module.default });
  }

  private onLoadJSON() {
    if (this.isLoading) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const puzzleData = JSON.parse(ev.target!.result as string);
          this.scene.start("CookingPuzzleScene", { puzzleData });
        } catch {
          this.errorText.setText("Invalid JSON file").setVisible(true);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
