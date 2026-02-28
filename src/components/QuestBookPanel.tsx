import { useCallback } from 'react';
import { QUEST_PANEL_W, GAME_H, FONT_FAMILY } from '../config';
import { useGameStore } from '../App';
import type { Step } from '../types';

const M = 8;
const SB_W = QUEST_PANEL_W - M * 2; // 224
const SB_H = GAME_H - M * 2; // 524
const PAD = 12;

export function QuestBookPanel() {
  const puzzleData = useGameStore((s) => s.puzzleData);
  const completedStepIds = useGameStore((s) => s.completedStepIds);
  const availableIntermediates = useGameStore((s) => s.availableIntermediates);
  const stepCount = useGameStore((s) => s.stepCount);
  const totalSteps = useGameStore((s) => s.totalSteps);

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

  const dishLabel =
    puzzleData.dishName.length > 26
      ? puzzleData.dishName.slice(0, 24) + '\u2026'
      : puzzleData.dishName;

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
          background: '#fffaf0',
          border: '4px solid #3e2723',
          boxShadow: '6px 8px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Yellow header */}
        <div
          style={{
            background: '#ffca28',
            padding: '16px 12px 12px',
            borderBottom: '4px solid #3e2723',
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
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #3e2723',
            }}
          />
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#3e2723' }}>RECIPE</div>
          <div style={{ fontSize: 11, color: '#d84315', marginTop: 4 }}>{dishLabel}</div>
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
          }}
        >
          {/* Progress row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#a1887f' }}>PROGRESS</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 'bold',
                color: '#3e2723',
                background: '#e0e0e0',
                borderRadius: 4,
                padding: '2px 8px',
              }}
            >
              {stepCount}/{totalSteps} STEPS
            </span>
          </div>

          {/* Step rows */}
          {puzzleData.branches.map((branch) => (
            <div key={branch.name} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#8d6e63', marginBottom: 4 }}>
                — {branch.name.toUpperCase()}
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
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#8d6e63', marginBottom: 4 }}>— FINAL</div>
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
              height: 28,
              borderRadius: 8,
              background: '#ffffff',
              border: '2px solid #8d6e63',
              boxShadow: '2px 3px 0 rgba(141,110,99,0.35)',
              fontSize: 10,
              fontWeight: 'bold',
              color: '#8d6e63',
              fontFamily: FONT_FAMILY,
              cursor: 'pointer',
              marginTop: 8,
              flexShrink: 0,
            }}
          >
            ↓ EXPORT JSON
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
  const emoji = step.processorEmoji ?? '';
  const label = (emoji ? emoji + ' ' : '') + step.processor.toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 30,
        borderRadius: 8,
        marginBottom: 4,
        padding: '0 6px',
        background: actionable ? '#ffecb3' : 'transparent',
        border: actionable ? '2px solid #ffca28' : '2px solid transparent',
      }}
    >
      {/* Status circle */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          flexShrink: 0,
          marginRight: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(completed
            ? { background: '#4caf50' }
            : actionable
              ? { border: '2px solid #ffca28', background: 'transparent', position: 'relative' as const }
              : { border: '2px solid #bdbdbd', background: 'transparent' }),
        }}
      >
        {completed && (
          <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>
        )}
        {actionable && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ffca28',
            }}
          />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          fontSize: 12,
          fontWeight: 'bold',
          color: completed ? '#4caf50' : actionable ? '#3e2723' : '#9ca3af',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {completed ? '✓ ' + step.processor.toUpperCase() : label}
      </span>

      {/* Input count */}
      {!completed && (
        <span style={{ fontSize: 12, color: actionable ? '#8d6e63' : '#9ca3af', flexShrink: 0 }}>
          ← {step.inputs.length}
        </span>
      )}
    </div>
  );
}
