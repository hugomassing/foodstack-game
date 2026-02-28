import Phaser from 'phaser';

export interface FoodCardColor {
  bg: number;
  wave: number;
  border: number;
}

export interface FoodCardProps {
  scene: Phaser.Scene;
  x: number;
  y: number;
  name: string;
  emoji: string;
  color: FoodCardColor;
  wave?: boolean; // default true
  width?: number;
  height?: number;
}

export const FOOD_CARD_W = 112;
export const FOOD_CARD_H = 146;
export const FOOD_CARD_RADIUS = 14;

export const FOOD_CARD_COLORS: Record<string, FoodCardColor> = {
  yellow: { bg: 0xf4d03f, wave: 0xd4ac0d, border: 0xb7950b },
  red: { bg: 0xe74c3c, wave: 0xc0392b, border: 0xa93226 },
  orange: { bg: 0xf39c12, wave: 0xd68910, border: 0xba7609 },
  green: { bg: 0x2ecc71, wave: 0x27ae60, border: 0x1e8449 },
  blue: { bg: 0x5dade2, wave: 0x3498db, border: 0x2e86c1 },
  purple: { bg: 0x9b59b6, wave: 0x8e44ad, border: 0x7d3c98 },
  pink: { bg: 0xe91e63, wave: 0xc2185b, border: 0xad1457 },
};

export function createFoodCard(props: FoodCardProps): Phaser.GameObjects.Container {
  const { scene, x, y, name, emoji, color } = props;
  const w = props.width ?? FOOD_CARD_W;
  const h = props.height ?? FOOD_CARD_H;
  const r = FOOD_CARD_RADIUS;

  // All coordinates relative to container origin (top-left of card at 0,0)
  const ox = -w / 2;
  const oy = -h / 2;

  // 1. Shadow
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.25);
  shadow.fillRoundedRect(ox + 4, oy + 4, w, h, r);

  // 2. Body
  const body = scene.add.graphics();
  body.fillStyle(color.bg);
  body.fillRoundedRect(ox, oy, w, h, r);

  // 3. Wave decoration (optional) — two layers: lighter back wave + darker front wave
  const showWave = props.wave !== false;
  let waveLightGfx: Phaser.GameObjects.Graphics | null = null;
  let waveDarkGfx: Phaser.GameObjects.Graphics | null = null;

  if (showWave) {
    // Derive a lighter wave color by blending bg and wave at ~40% toward bg
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

    // Per-card randomization
    const rng = () => 0.8 + Math.random() * 0.4;
    const baseSlope = -4 + Math.random() * 8;
    const bobAmount = 3 + Math.random() * 2;
    const tiltAmount = 2 + Math.random() * 2;
    const phaseOffset = Math.random() * Math.PI * 2;
    const phaseDuration = 14000 * rng();
    const bobDuration = 7000 * rng();
    const tiltDuration = 9000 * rng();

    // Back wave (lighter) — sits a bit higher, with its own phase offset
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

    // Initial draw
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
    });
    scene.tweens.add({
      targets: frontAnim,
      bob: bobAmount,
      duration: bobDuration,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: frontAnim,
      tilt: tiltAmount,
      duration: tiltDuration,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Animate back wave — slightly different timing for offset feel
    const backAnim = { phase: phaseOffset + backPhaseShift, bob: 0, tilt: 0 };
    scene.tweens.add({
      targets: backAnim,
      phase: phaseOffset + backPhaseShift + Math.PI * 2,
      duration: phaseDuration * 1.15,
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
    });
    scene.tweens.add({
      targets: backAnim,
      bob: bobAmount * 0.8,
      duration: bobDuration * 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: backAnim,
      tilt: tiltAmount * 0.7,
      duration: tiltDuration * 1.3,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  // 4. Border stroke
  const border = scene.add.graphics();
  border.lineStyle(2, color.border, 1);
  border.strokeRoundedRect(ox, oy, w, h, r);

  // 5. Name text — bold, uppercase, dark, near top
  const nameText = scene.add.text(0, oy + 14, name.toUpperCase(), {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    fontStyle: 'bold',
    color: '#2C3E50',
    align: 'center',
    wordWrap: { width: w - 16 },
  });
  nameText.setOrigin(0.5, 0);

  // 6. Emoji — 40px, centered vertically in the card body (between name and bottom)
  const nameBottom = oy + 14 + nameText.height;
  const emojiY = nameBottom + (oy + h - nameBottom) / 2;
  const emojiText = scene.add.text(0, emojiY, emoji, {
    fontSize: `${Math.round(h * 0.42)}px`,
    align: 'center',
  });
  emojiText.setOrigin(0.5, 0.5);

  // Assemble container — lighter back wave behind darker front wave
  const children: Phaser.GameObjects.GameObject[] = [shadow, body];
  if (waveLightGfx) children.push(waveLightGfx);
  if (waveDarkGfx) children.push(waveDarkGfx);
  children.push(border, nameText, emojiText);
  const container = scene.add.container(x, y, children);
  container.setSize(w, h);

  return container;
}