import Phaser from 'phaser';
import { FONT_FAMILY } from '../config';

export interface FoodCardColor {
  bg: number;
  wave: number;
  border: number;
}

export const FOOD_CARD_W = 94;
export const FOOD_CARD_H = 122;
export const FOOD_CARD_RADIUS = 11;

export const FOOD_CARD_COLORS: Record<string, FoodCardColor> = {
  yellow: { bg: 0xf4d03f, wave: 0xd4ac0d, border: 0xb7950b },
  red: { bg: 0xe74c3c, wave: 0xc0392b, border: 0xa93226 },
  orange: { bg: 0xf39c12, wave: 0xd68910, border: 0xba7609 },
  green: { bg: 0x2ecc71, wave: 0x27ae60, border: 0x1e8449 },
  blue: { bg: 0x5dade2, wave: 0x3498db, border: 0x2e86c1 },
  purple: { bg: 0x9b59b6, wave: 0x8e44ad, border: 0x7d3c98 },
  pink: { bg: 0xe91e63, wave: 0xc2185b, border: 0xad1457 },
  dark: { bg: 0x2c2c3a, wave: 0x1e1e2a, border: 0x14141e },
};

const ingredientColors = Object.values(FOOD_CARD_COLORS);

export function nameToColor(n: string): FoodCardColor {
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ingredientColors[Math.abs(hash) % ingredientColors.length];
}

// ── HSL helpers ──────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function hslToInt(h: number, s: number, l: number): number {
  const [r, g, b] = hslToRgb(h, s, l);
  return (r << 16) | (g << 8) | b;
}

/**
 * Derive a FoodCardColor from a hex string (e.g. "#e8a868").
 * Creates a soft pastel bg so the full-color sprite has strong contrast.
 */
export function hexToCardColor(hex: string): FoodCardColor {
  const raw = parseInt(hex.replace('#', ''), 16);
  const [h, s] = rgbToHsl((raw >> 16) & 0xff, (raw >> 8) & 0xff, raw & 0xff);

  // Pastel bg: keep hue, low saturation, high lightness
  const bgS = Math.min(s, 0.38);
  return {
    bg: hslToInt(h, bgS, 0.78),
    wave: hslToInt(h, bgS + 0.08, 0.64),
    border: hslToInt(h, bgS + 0.14, 0.5),
  };
}

export interface FoodCardConfig {
  name: string;
  emoji: string;
  color: FoodCardColor;
  wave?: boolean;
  width?: number;
  height?: number;
  assetId?: string | null;
}

export class FoodCard extends Phaser.GameObjects.Container {
  readonly shadow: Phaser.GameObjects.Graphics;
  readonly cardBody: Phaser.GameObjects.Graphics;
  readonly border: Phaser.GameObjects.Graphics;
  readonly nameText: Phaser.GameObjects.Text;
  readonly emojiText: Phaser.GameObjects.Text;
  readonly foodImage: Phaser.GameObjects.Image | null = null;

  private waveTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, config: FoodCardConfig) {
    super(scene, x, y);

    const { name, emoji, color } = config;
    const w = config.width ?? FOOD_CARD_W;
    const h = config.height ?? FOOD_CARD_H;
    const r = FOOD_CARD_RADIUS;
    const ox = -w / 2;
    const oy = -h / 2;

    // 1. Shadow
    this.shadow = scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.25);
    this.shadow.fillRoundedRect(ox + 4, oy + 4, w, h, r);

    // 2. Body
    this.cardBody = scene.add.graphics();
    this.cardBody.fillStyle(color.bg);
    this.cardBody.fillRoundedRect(ox, oy, w, h, r);

    // 3. Wave decoration
    const showWave = config.wave !== false;
    let waveLightGfx: Phaser.GameObjects.Graphics | null = null;
    let waveDarkGfx: Phaser.GameObjects.Graphics | null = null;

    if (showWave) {
      const blend = (a: number, b: number, t: number) => {
        const r1 = (a >> 16) & 0xff,
          g1 = (a >> 8) & 0xff,
          b1 = a & 0xff;
        const r2 = (b >> 16) & 0xff,
          g2 = (b >> 8) & 0xff,
          b2 = b & 0xff;
        const ri = Math.round(r1 + (r2 - r1) * t);
        const gi = Math.round(g1 + (g2 - g1) * t);
        const bi = Math.round(b1 + (b2 - b1) * t);
        return (ri << 16) | (gi << 8) | bi;
      };
      const lighterWaveColor = blend(color.wave, color.bg, 0.45);

      const segments = 20;
      const amplitude = 6;

      const rng = () => 0.8 + Math.random() * 0.4;
      const baseSlope = -4 + Math.random() * 8;
      const bobAmount = 3 + Math.random() * 2;
      const tiltAmount = 2 + Math.random() * 2;
      const phaseOffset = Math.random() * Math.PI * 2;
      const phaseDuration = 14000 * rng();
      const bobDuration = 7000 * rng();
      const tiltDuration = 9000 * rng();

      const backWaveYOffset = -8;
      const backPhaseShift = Math.PI * 0.7;

      function drawSingleWave(
        gfx: Phaser.GameObjects.Graphics,
        fillColor: number,
        waveBaseY: number,
        phase: number,
        bob: number,
        tilt: number,
        slope: number,
      ) {
        gfx.clear();
        gfx.fillStyle(fillColor);
        gfx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const px = ox + t * w;
          const sl = slope * (t - 0.5);
          const diag = tilt * (t - 0.5);
          const py = waveBaseY + bob + sl + diag + Math.sin(t * Math.PI * 2 + phase) * amplitude;
          if (i === 0) {
            gfx.moveTo(px, py);
          } else {
            gfx.lineTo(px, py);
          }
        }
        gfx.lineTo(ox + w, oy + h - r);
        gfx.arc(ox + w - r, oy + h - r, r, 0, Math.PI / 2, false);
        gfx.lineTo(ox + r, oy + h);
        gfx.arc(ox + r, oy + h - r, r, Math.PI / 2, Math.PI, false);
        const leftSl = slope * (0 - 0.5);
        const leftDiag = tilt * (0 - 0.5);
        gfx.lineTo(ox, waveBaseY + bob + leftSl + leftDiag + Math.sin(phase) * amplitude);
        gfx.closePath();
        gfx.fillPath();
      }

      const frontWaveY = oy + h * 0.65;
      const backWaveY = frontWaveY + backWaveYOffset;

      waveLightGfx = scene.add.graphics();
      waveDarkGfx = scene.add.graphics();

      drawSingleWave(
        waveLightGfx,
        lighterWaveColor,
        backWaveY,
        phaseOffset + backPhaseShift,
        0,
        0,
        baseSlope,
      );
      drawSingleWave(waveDarkGfx, color.wave, frontWaveY, phaseOffset, 0, 0, baseSlope);

      // Animate front wave
      const frontAnim = { phase: phaseOffset, bob: 0, tilt: 0 };
      this.waveTweens.push(
        scene.tweens.add({
          targets: frontAnim,
          phase: phaseOffset + Math.PI * 2,
          duration: phaseDuration,
          repeat: -1,
          ease: 'Linear',
          onUpdate: () => {
            drawSingleWave(
              waveDarkGfx!,
              color.wave,
              frontWaveY,
              frontAnim.phase,
              frontAnim.bob,
              frontAnim.tilt,
              baseSlope,
            );
          },
        }),
        scene.tweens.add({
          targets: frontAnim,
          bob: bobAmount,
          duration: bobDuration,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
        }),
        scene.tweens.add({
          targets: frontAnim,
          tilt: tiltAmount,
          duration: tiltDuration,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
        }),
      );

      // Animate back wave
      const backAnim = { phase: phaseOffset + backPhaseShift, bob: 0, tilt: 0 };
      this.waveTweens.push(
        scene.tweens.add({
          targets: backAnim,
          phase: phaseOffset + backPhaseShift + Math.PI * 2,
          duration: phaseDuration * 1.6,
          repeat: -1,
          ease: 'Linear',
          onUpdate: () => {
            drawSingleWave(
              waveLightGfx!,
              lighterWaveColor,
              backWaveY,
              backAnim.phase,
              backAnim.bob,
              backAnim.tilt,
              baseSlope,
            );
          },
        }),
        scene.tweens.add({
          targets: backAnim,
          bob: bobAmount * 0.8,
          duration: bobDuration * 1.7,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
        }),
        scene.tweens.add({
          targets: backAnim,
          tilt: tiltAmount * 0.7,
          duration: tiltDuration * 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
        }),
      );
    }

    // 4. Border stroke
    this.border = scene.add.graphics();
    this.border.lineStyle(2, color.border, 1);
    this.border.strokeRoundedRect(ox, oy, w, h, r);

    // 5. Image / emoji in the upper area (above the wave)
    const imageY = oy + h * 0.34;
    this.emojiText = scene.add.text(0, imageY, emoji, {
      fontSize: `${Math.round(h * 0.42)}px`,
      align: 'center',
    });
    this.emojiText.setOrigin(0.5, 0.5);

    // 6. Sprite image (if assetId provided and texture loaded)
    let imgShadow: Phaser.GameObjects.Image | null = null;
    const textureKey = config.assetId ? `food_${config.assetId}` : null;
    if (textureKey && scene.textures.exists(textureKey)) {
      const maxDim = Math.round(h * 0.42);

      // Drop shadow: offset, tinted for contrast against card bg
      const bgR = (color.bg >> 16) & 0xff;
      const bgG = (color.bg >> 8) & 0xff;
      const bgB = color.bg & 0xff;
      const bgLuma = (0.299 * bgR + 0.587 * bgG + 0.114 * bgB) / 255;
      const shadowTint = bgLuma < 0.3 ? 0xffffff : 0x000000;
      const shadowAlpha = bgLuma < 0.3 ? 0.3 : 0.2;

      imgShadow = scene.add.image(2, imageY + 3, textureKey);
      const shadowScale = Math.min(maxDim / imgShadow.width, maxDim / imgShadow.height);
      imgShadow.setScale(shadowScale);
      imgShadow.setOrigin(0.5, 0.5);
      imgShadow.setTint(shadowTint);
      imgShadow.setAlpha(shadowAlpha);

      const img = scene.add.image(0, imageY, textureKey);
      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      img.setScale(scale);
      img.setOrigin(0.5, 0.5);
      this.foodImage = img;
      this.emojiText.setVisible(false);
    }

    // 7. Name text inside the wave area
    this.nameText = scene.add.text(0, oy + h * 0.84, name.toUpperCase(), {
      fontFamily: FONT_FAMILY,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: w - 16 },
    });
    this.nameText.setOrigin(0.5, 0.5);

    // Assemble container
    const children: Phaser.GameObjects.GameObject[] = [this.shadow, this.cardBody];
    if (waveLightGfx) children.push(waveLightGfx);
    if (waveDarkGfx) children.push(waveDarkGfx);
    children.push(this.border, this.nameText, this.emojiText);
    if (imgShadow) children.push(imgShadow);
    if (this.foodImage) children.push(this.foodImage);
    this.add(children);
    this.setSize(w, h);

    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  destroy(fromScene?: boolean): void {
    for (const tween of this.waveTweens) {
      tween.destroy();
    }
    this.waveTweens.length = 0;
    super.destroy(fromScene);
  }
}