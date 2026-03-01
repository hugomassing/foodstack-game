import { useCallback } from 'react';
import { QUEST_PANEL_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import type { Step } from '../types';
import { useTranslation } from '../i18n';
import { localize } from '../i18n/localize';
import {
  Check,
  Download,
  ArrowLeft,
  Heart,
} from 'lucide-react';

const M = 8;
const SB_W = QUEST_PANEL_W - M * 2;
const SB_H = GAME_H - M * 2;
const PAD = 12;

const PROCESSOR_ASSET: Record<string, string> = {
  chop: 'knife',
  slice: 'scissors',
  dice: 'knife',
  mince: 'knife',
  cut: 'scissors',
  fry: 'frying_pan',
  'stir-fry': 'frying_pan',
  'deep-fry': 'frying_pan',
  'flash-fry': 'frying_pan',
  sauté: 'frying_pan',
  sear: 'frying_pan',
  grill: 'fire',
  roast: 'fire',
  char: 'fire',
  broil: 'fire',
  flambe: 'fire',
  toast: 'shallow_pan',
  caramelize: 'shallow_pan',
  melt: 'shallow_pan',
  bake: 'oven_mitt',
  boil: 'cooking_pot',
  steam: 'cooking_pot',
  braise: 'cooking_pot',
  simmer: 'cooking_pot',
  poach: 'cooking_pot',
  blanch: 'cooking_pot',
  stew: 'cooking_pot',
  reduce: 'cooking_pot',
  mix: 'bowl_spoon',
  blend: 'bowl_spoon',
  whisk: 'bowl_spoon',
  toss: 'bowl_spoon',
  combine: 'bowl_spoon',
  marinate: 'bowl_spoon',
  fold: 'spoon',
  stir: 'spoon',
  mash: 'spoon',
  crush: 'spoon',
  knead: 'spoon',
  assemble: 'fork_knife',
  layer: 'fork_knife',
  stack: 'fork_knife',
  plate: 'plate',
  season: 'salt_shaker',
  garnish: 'salt_shaker',
  dress: 'salt_shaker',
  drizzle: 'pouring_liquid',
  glaze: 'pouring_liquid',
  coat: 'pouring_liquid',
  spread: 'knife',
  stuff: 'plate',
  fill: 'plate',
  wrap: 'plate',
  shape: 'plate',
  freeze: 'cooking_pot',
  chill: 'cooking_pot',
  cool: 'cooking_pot',
};

function getProcessorSprite(processor: string): string {
  const key = processor.toLowerCase().trim();
  const assetId = PROCESSOR_ASSET[key] ?? 'fork_knife';
  return `/assets/sprites/food/utensil/${assetId}.png`;
}

export function QuestBookPanel() {
  const puzzleData = useGameStore((s) => s.puzzleData);
  const completedStepIds = useGameStore((s) => s.completedStepIds);
  const availableIntermediates = useGameStore((s) => s.availableIntermediates);
  const stepCount = useGameStore((s) => s.stepCount);
  const totalSteps = useGameStore((s) => s.totalSteps);
  const gameMode = useGameStore((s) => s.gameMode);
  const survivalLives = useGameStore((s) => s.survivalLives);
  const survivalRound = useGameStore((s) => s.survivalRound);
  const { t } = useTranslation();

  const isStepActionable = useCallback(
    (step: Step) => {
      for (const inp of step.inputs) {
        if (/^b\d+_s\d+$/.test(inp) || inp === 'final') {
          if (!availableIntermediates.has(inp)) return false;
        }
      }
      return true;
    },
    [availableIntermediates],
  );

  const onExportJSON = () => {
    if (!puzzleData) return;
    const json = JSON.stringify(puzzleData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${puzzleData.dishName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!puzzleData) return null;

  const localizedDishName = localize(puzzleData.dishName, puzzleData.dishNameI18n);

  return (
    <div
      style={{
        position: 'absolute',
        left: M,
        top: M,
        width: SB_W,
        height: SB_H,
        zIndex: 20,
        fontFamily: FONT_FAMILY,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 20,
          background: '#3e2723',
          border: '4px solid #3e2723',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Yellow header */}
        <div
          style={{
            background: '#ffca28',
            padding: '14px 12px 10px',
            borderBottom: '3px solid #3e2723',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Pin circle */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #3e2723',
            }}
          />
          <div style={{ fontSize: 11, fontWeight: 900, color: '#3e2723', letterSpacing: '0.04em' }}>
            {t('quest.recipe')}
          </div>
          <div style={{ fontSize: 11, color: '#d84315', marginTop: 2, fontWeight: 900, lineHeight: 1.3 }}>
            {localizedDishName}
          </div>
          {gameMode === 'survival' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span
                style={{ fontSize: 9, fontWeight: 900, color: '#3e2723', letterSpacing: '0.06em' }}
              >
                {t('survival.round', { round: survivalRound })}
              </span>
              <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {Array.from({ length: Math.min(survivalLives, 10) }).map((_, i) => (
                  <Heart key={i} size={10} strokeWidth={2} fill="#e53935" color="#e53935" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            padding: `10px ${PAD}px`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '0 0 16px 16px',
          }}
        >
          {/* Progress row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span
              style={{ fontSize: 10, color: '#a1887f', fontWeight: 900, letterSpacing: '0.08em' }}
            >
              {t('quest.progress')}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: '#3e2723',
                background: '#f5f0e8',
                borderRadius: 6,
                padding: '3px 8px',
                border: '1.5px solid #e0d6c8',
              }}
            >
              {t('game.steps', { current: stepCount, total: totalSteps })}
            </span>
          </div>

          {/* Step rows */}
          {puzzleData.branches.map((branch) => (
            <div key={branch.name} style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontSize: 10,
                  color: '#8d6e63',
                  marginBottom: 4,
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <div style={{ width: 12, height: 1.5, background: '#d7ccc8', borderRadius: 1 }} />
                {localize(branch.name, branch.nameI18n).toUpperCase()}
              </div>
              {branch.steps.map((step) => (
                <StepRow
                  key={step.stepId}
                  step={step}
                  completed={completedStepIds.has(step.stepId)}
                  actionable={!completedStepIds.has(step.stepId) && isStepActionable(step)}
                />
              ))}
            </div>
          ))}

          {/* Final */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                fontSize: 10,
                color: '#8d6e63',
                marginBottom: 4,
                fontWeight: 900,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div style={{ width: 12, height: 1.5, background: '#d7ccc8', borderRadius: 1 }} />
              {t('quest.final')}
            </div>
            <StepRow
              step={puzzleData.finalStep}
              completed={completedStepIds.has(puzzleData.finalStep.stepId)}
              actionable={
                !completedStepIds.has(puzzleData.finalStep.stepId) &&
                isStepActionable(puzzleData.finalStep)
              }
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Export button */}
          <button
            onClick={onExportJSON}
            style={{
              width: '100%',
              height: 30,
              borderRadius: 8,
              background: '#ffffff',
              border: '2px solid #d7ccc8',
              fontSize: 10,
              fontWeight: 900,
              color: '#8d6e63',
              fontFamily: FONT_FAMILY,
              cursor: 'pointer',
              marginTop: 8,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              letterSpacing: '0.06em',
            }}
          >
            <Download size={12} strokeWidth={3} />
            {t('quest.exportJson')}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  completed,
  actionable,
}: {
  step: Step;
  completed: boolean;
  actionable: boolean;
}) {
  const sprite = getProcessorSprite(step.processor);
  const title = localize(step.questTitle ?? step.output, step.questTitleI18n ?? step.outputI18n);
  const description = step.hint ? localize(step.hint, step.hintI18n) : undefined;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        borderRadius: 8,
        marginBottom: 4,
        padding: '5px 6px',
        background: completed ? '#e8f5e9' : actionable ? '#fff8e1' : 'transparent',
        border: completed
          ? '2px solid #a5d6a7'
          : actionable
            ? '2px solid #ffca28'
            : '2px solid transparent',
      }}
    >
      {/* Status circle */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          flexShrink: 0,
          marginRight: 6,
          marginTop: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(completed
            ? { background: '#4caf50' }
            : actionable
              ? {
                  border: '2px solid #ffca28',
                  background: '#fff8e1',
                  position: 'relative' as const,
                }
              : { border: '2px solid #d0d0d0', background: 'transparent' }),
        }}
      >
        {completed && <Check size={11} strokeWidth={3.5} color="#fff" />}
        {actionable && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#ffca28',
            }}
          />
        )}
      </div>

      {/* Processor icon */}
      <div
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          marginRight: 6,
          marginTop: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={sprite}
          alt=""
          style={{
            width: 16,
            height: 16,
            opacity: completed ? 0.7 : actionable ? 1 : 0.35,
            filter: completed ? 'hue-rotate(90deg) saturate(1.5)' : 'none',
          }}
        />
      </div>

      {/* Title + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 900,
              color: completed ? '#4caf50' : actionable ? '#3e2723' : '#9ca3af',
              letterSpacing: '0.02em',
              textTransform: 'capitalize',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          >
            {title}
          </span>

          {/* Input count */}
          {!completed && (
            <span
              style={{
                fontSize: 10,
                color: actionable ? '#8d6e63' : '#bdbdbd',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontWeight: 900,
              }}
            >
              <ArrowLeft size={9} strokeWidth={3} />
              {step.inputs.length}
            </span>
          )}
        </div>

        {/* Description (hint) */}
        {description && !completed && (
          <div
            style={{
              fontSize: 9,
              fontStyle: 'italic',
              color: actionable ? '#8d6e63' : '#bdbdbd',
              marginTop: 1,
              lineHeight: 1.3,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}