import Phaser from "phaser";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";
import { GAME_W, FONT_FAMILY, TEXT_COLORS } from "../config";

type Category = "Style" | "Protein" | "Method" | "Base";
type Difficulty = "easy" | "medium" | "hard";

const WORD_LISTS: Record<Category, string[]> = {
  Style: ["Crispy", "Smoky", "Spicy", "Cheesy", "Tangy", "Herby"],
  Protein: ["Meatball", "Chicken", "Tofu", "Shrimp", "Mushroom", "Pulled Pork"],
  Method: ["Stuffed", "Glazed", "Grilled", "Braised", "Roasted", "Caramelized"],
  Base: ["Bun", "Bowl", "Wrap", "Taco", "Pasta", "Salad"],
};

const CATEGORIES = Object.keys(WORD_LISTS) as Category[];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Base layout constants at 960 px logical width.
// All positions and sizes are multiplied by s = width / GAME_W at runtime so
// the scene looks identical on any DPR (the canvas is GAME_W × DPR wide).
const BASE = {
  // y positions
  titleY: 28,
  subtitleY: 57,
  colHeaderY: 82,
  chipsStartY: 110,
  chipStep: 30,
  sepY: 272,
  dishY: 310,
  diffY: 356,
  errorY: 400,
  btnY: 456,
  // x
  colW: GAME_W / 4, // 240 — one quarter of the 960 px base width
  btnGap: 170, // distance between button centres
  diffOffsets: [-44, 32, 108] as number[], // easy / medium / hard from cx
  diffLabelOffset: -116, // "Difficulty:" from cx
  sepPad: 48,
  // font sizes (px at 960 px width)
  fsTitle: 44,
  fsSubtitle: 15,
  fsColHeader: 17,
  fsChip: 18,
  fsDish: 26,
  fsDiffLabel: 14,
  fsDiffOption: 16,
  fsBtn: 20,
  fsError: 14,
  fsLoading: 17,
  // button geometry
  btnW: 140,
  btnH: 44,
  btnR: 8,
} as const;

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
  private customNameInputEl!: HTMLInputElement;
  private diffButtons!: DiffButton[];
  private loadingText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width } = this.scale;

    // s scales every pixel value so the layout is DPR-independent.
    // On a standard display (DPR 1) s = 1; on Retina (DPR 2) s = 2.
    const s = width / GAME_W;
    const p = (v: number) => Math.round(v * s);
    const fs = (v: number) => `${Math.round(v * s)}px`;

    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.selections = {} as Record<Category, string>;
    this.wordChips = {};
    this.difficulty = "medium";
    this.isLoading = false;

    for (const cat of CATEGORIES) {
      const words = WORD_LISTS[cat];
      this.selections[cat] = words[Phaser.Math.Between(0, words.length - 1)];
    }

    // ── Header ────────────────────────────────────────────────────────────
    this.add
      .text(width / 2, p(BASE.titleY), "FoodStack", {
        fontSize: fs(BASE.fsTitle),
        fontStyle: "bold",
        color: TEXT_COLORS.GOLD,
        fontFamily: FONT_FAMILY,
        stroke: "#000000",
        strokeThickness: p(3),
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        p(BASE.subtitleY),
        "Pick your ingredients, cook your puzzle!",
        {
          fontSize: fs(BASE.fsSubtitle),
          color: TEXT_COLORS.BRANCH,
          fontFamily: FONT_FAMILY,
        },
      )
      .setOrigin(0.5);

    // ── Word columns — 4 equal columns spanning full canvas width ─────────
    const colW = p(BASE.colW);

    for (let c = 0; c < CATEGORIES.length; c++) {
      const cat = CATEGORIES[c];
      const cx = colW * c + colW / 2; // 1/8, 3/8, 5/8, 7/8 of canvas width

      this.add
        .text(cx, p(BASE.colHeaderY), cat, {
          fontSize: fs(BASE.fsColHeader),
          fontStyle: "bold",
          color: TEXT_COLORS.LINK,
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0.5);

      this.wordChips[cat] = [];
      const words = WORD_LISTS[cat];

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const y = p(BASE.chipsStartY) + w * p(BASE.chipStep);
        const txt = this.add
          .text(cx, y, word, {
            fontSize: fs(BASE.fsChip),
            color: TEXT_COLORS.DIM,
            fontFamily: FONT_FAMILY,
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        txt.on("pointerover", () => {
          if (this.selections[cat] !== word) txt.setColor("#ccccdd");
        });
        txt.on("pointerout", () => {
          if (this.selections[cat] !== word) txt.setColor(TEXT_COLORS.DIM);
        });
        txt.on("pointerdown", () => {
          if (this.isLoading) return;
          this.selections[cat] = word;
          this.refreshChips();
          this.refreshDishName();
        });

        this.wordChips[cat].push({ text: txt, word });
      }
    }

    // ── Separator ─────────────────────────────────────────────────────────
    const sep = this.add.graphics();
    sep.lineStyle(Math.max(1, p(1)), 0x333355, 1);
    sep.lineBetween(
      p(BASE.sepPad),
      p(BASE.sepY),
      width - p(BASE.sepPad),
      p(BASE.sepY),
    );

    // ── Dish name input (free-text override, falls back to composite) ──────
    if (!document.getElementById("foodstack-input-style")) {
      const style = document.createElement("style");
      style.id = "foodstack-input-style";
      style.textContent =
        "#foodstack-name-input::placeholder { color: #666688; }";
      document.head.appendChild(style);
    }

    this.customNameInputEl = document.createElement("input");
    this.customNameInputEl.id = "foodstack-name-input";
    this.customNameInputEl.type = "text";
    this.customNameInputEl.style.cssText = [
      `font-size: ${Math.round(BASE.fsDish * s)}px`,
      `font-family: ${FONT_FAMILY}`,
      `font-weight: bold`,
      `color: #ffffff`,
      `background: transparent`,
      `border: none`,
      `border-bottom: 2px solid #444466`,
      `outline: none`,
      `text-align: center`,
      `width: ${p(480)}px`,
      `caret-color: #f0c040`,
      `display: none`,
    ].join(";");
    const domInput = this.add.dom(
      width / 2,
      p(BASE.dishY),
      this.customNameInputEl,
    );
    domInput.setOrigin(0.5);

    // Show input when user starts typing any printable character
    const onKeyDown = (e: KeyboardEvent) => {
      if (this.isLoading) return;
      if (document.activeElement === this.customNameInputEl) return;
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      this.customNameInputEl.style.display = "";
      this.customNameInputEl.focus();
    };
    document.addEventListener("keydown", onKeyDown);

    // Hide again when blurred with empty value
    this.customNameInputEl.addEventListener("blur", () => {
      if (!this.customNameInputEl.value.trim()) {
        this.customNameInputEl.style.display = "none";
      }
    });

    this.events.once("shutdown", () =>
      document.removeEventListener("keydown", onKeyDown),
    );

    // ── Difficulty selector ───────────────────────────────────────────────
    this.add
      .text(width / 2 + p(BASE.diffLabelOffset), p(BASE.diffY), "Difficulty:", {
        fontSize: fs(BASE.fsDiffLabel),
        color: TEXT_COLORS.BRANCH,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5);

    this.diffButtons = [];
    for (let d = 0; d < DIFFICULTIES.length; d++) {
      const diff = DIFFICULTIES[d];
      const bx = width / 2 + p(BASE.diffOffsets[d]);
      const txt = this.add
        .text(bx, p(BASE.diffY), diff, {
          fontSize: fs(BASE.fsDiffOption),
          color: TEXT_COLORS.DIM,
          fontFamily: FONT_FAMILY,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      txt.on("pointerdown", () => {
        if (this.isLoading) return;
        this.difficulty = diff;
        this.refreshDifficulty();
      });

      this.diffButtons.push({ text: txt, diff });
    }

    // ── Action buttons — centred trio ─────────────────────────────────────
    this.createButton(
      s,
      width / 2 - p(BASE.btnGap),
      p(BASE.btnY),
      "Cook!",
      "#2ecc71",
      () => this.onCook(),
    );
    this.createButton(s, width / 2, p(BASE.btnY), "Demo", "#3498db", () =>
      this.onDemo(),
    );
    this.createButton(
      s,
      width / 2 + p(BASE.btnGap),
      p(BASE.btnY),
      "Load JSON",
      "#8e44ad",
      () => this.onLoadJSON(),
    );

    // ── Loading text (overlays dish name) ─────────────────────────────────
    this.loadingText = this.add
      .text(width / 2, p(BASE.dishY), "", {
        fontSize: fs(BASE.fsLoading),
        color: TEXT_COLORS.GOLD,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setVisible(false);

    // ── Error text ────────────────────────────────────────────────────────
    this.errorText = this.add
      .text(width / 2, p(BASE.errorY), "", {
        fontSize: fs(BASE.fsError),
        color: "#e74c3c",
        fontFamily: FONT_FAMILY,
        wordWrap: { width: width - p(120) },
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.refreshChips();
    this.refreshDishName();
    this.refreshDifficulty();
  }

  private createButton(
    s: number,
    x: number,
    y: number,
    label: string,
    color: string,
    callback: () => void,
  ) {
    const p = (v: number) => Math.round(v * s);
    const w = p(BASE.btnW),
      h = p(BASE.btnH),
      r = p(BASE.btnR);
    const bg = this.add.graphics();
    bg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);

    const txt = this.add
      .text(x, y, label, {
        fontSize: `${Math.round(BASE.fsBtn * s)}px`,
        fontStyle: "bold",
        color: TEXT_COLORS.WHITE,
        fontFamily: FONT_FAMILY,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerdown", callback);
    return { bg, txt };
  }

  private refreshChips() {
    for (const cat of CATEGORIES) {
      for (const chip of this.wordChips[cat]) {
        if (chip.word === this.selections[cat]) {
          chip.text.setColor(TEXT_COLORS.GOLD).setFontStyle("bold");
        } else {
          chip.text.setColor(TEXT_COLORS.DIM).setFontStyle("");
        }
      }
    }
  }

  private refreshDishName() {
    this.customNameInputEl.placeholder = CATEGORIES.map(
      (c) => this.selections[c],
    ).join(" ");
  }

  private refreshDifficulty() {
    for (const btn of this.diffButtons) {
      if (btn.diff === this.difficulty) {
        btn.text.setColor(TEXT_COLORS.GOLD).setFontStyle("bold");
      } else {
        btn.text.setColor(TEXT_COLORS.DIM).setFontStyle("");
      }
    }
  }

  private getDishName() {
    return (
      this.customNameInputEl.value.trim() ||
      CATEGORIES.map((c) => this.selections[c]).join(" ")
    );
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
        const base = current.replace(/\.+$/, "");
        this.loadingText.setText(base + ".".repeat((dotCount % 3) + 1));
      },
    });

    const inputWasVisible = this.customNameInputEl.style.display !== "none";
    this.customNameInputEl.style.display = "none";

    try {
      const puzzleData = await convex.action(
        api.generator.generateOrGetRecipe,
        {
          dishName,
          difficulty: this.difficulty,
        },
      );
      dots.destroy();
      this.loadingText.setVisible(false);
      if (inputWasVisible) this.customNameInputEl.style.display = "";
      this.isLoading = false;
      this.scene.start("CookingPuzzleScene", { puzzleData });
    } catch (err) {
      dots.destroy();
      this.loadingText.setVisible(false);
      if (inputWasVisible) this.customNameInputEl.style.display = "";
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
