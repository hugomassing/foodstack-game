import { useState, useRef, useCallback } from 'react';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { gameStore } from '../store/gameStore';
import { FONT_FAMILY } from '../config';
import type { PuzzleData } from '../types';

type Category = 'Style' | 'Filling' | 'Method' | 'Base';

const WORD_LISTS: Record<Category, string[]> = {
  Style: ['Crispy', 'Smoky', 'Spicy', 'Cheesy', 'Tangy', 'Herby', 'Zesty'],
  Filling: ['Ham', 'Chicken', 'Tofu', 'Shrimp', 'Mushroom', 'Meatball'],
  Method: ['Stuffed', 'Glazed', 'Grilled', 'Braised', 'Roasted', 'Caramelized'],
  Base: ['Bun', 'Bowl', 'Wrap', 'Taco', 'Pasta', 'Salad'],
};

const CATEGORIES: Category[] = ['Style', 'Filling', 'Method', 'Base'];

function randomSelections(): Record<Category, number> {
  const result = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    result[cat] = Math.floor(Math.random() * WORD_LISTS[cat].length);
  }
  return result;
}

export function GameMenu() {
  const [indices, setIndices] = useState(randomSelections);
  const [customName, setCustomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getDishName = useCallback(() => {
    const raw = customName.trim();
    return raw || CATEGORIES.map((c) => WORD_LISTS[c][indices[c]]).join(' ');
  }, [customName, indices]);

  const generatedName = CATEGORIES.map((c) => WORD_LISTS[c][indices[c]]).join(' ').toUpperCase();

  const cycleWord = (cat: Category, dir: 1 | -1) => {
    if (isLoading) return;
    setIndices((prev) => ({
      ...prev,
      [cat]: (prev[cat] + dir + WORD_LISTS[cat].length) % WORD_LISTS[cat].length,
    }));
  };

  const onCook = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    const dishName = getDishName();
    setLoadingMsg(`Generating "${dishName}"…`);

    try {
      const puzzleData = await convex.action(
        api.generator.generateOrGetRecipe,
        { dishName, difficulty: 'medium' },
      );
      setIsLoading(false);
      gameStore.getState().startGame(puzzleData as PuzzleData);
    } catch (err) {
      setIsLoading(false);
      setLoadingMsg('');
      setError((err as Error).message);
    }
  };

  const onDemo = async () => {
    if (isLoading) return;
    const module = await import('../data/mockPuzzle.json');
    gameStore.getState().startGame(module.default as PuzzleData);
  };

  const onLoadJSON = () => {
    if (isLoading) return;
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
          gameStore.getState().startGame(puzzleData);
        } catch {
          setError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const font = FONT_FAMILY;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font,
        zIndex: 10,
      }}
    >
      {/* Card */}
      <div
        style={{
          width: 580,
          padding: '24px 32px 20px',
          background: '#fffaf0',
          borderRadius: 20,
          border: '4px solid #3e2723',
          boxShadow: '0 8px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: '#3e2723',
            margin: '0 0 8px',
          }}
        >
          CREATE RECIPE
        </h1>

        {/* Selector rows */}
        {CATEGORIES.map((cat) => (
          <SelectorRow
            key={cat}
            category={cat}
            value={WORD_LISTS[cat][indices[cat]]}
            onPrev={() => cycleWord(cat, -1)}
            onNext={() => cycleWord(cat, 1)}
            disabled={isLoading}
          />
        ))}

        {/* Summary box */}
        <div
          style={{
            width: '100%',
            marginTop: 8,
            background: '#ffca28',
            borderRadius: 16,
            border: '3px solid #3e2723',
            boxShadow: '0 6px 0 #3e2723',
            padding: '10px 16px 14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#b45309', marginBottom: 4 }}>
            SELECTED ORDER
          </div>
          {customName.trim() ? (
            <input
              ref={inputRef}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{
                fontSize: 19,
                fontWeight: 'bold',
                color: '#3e2723',
                fontFamily: font,
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid #3e2723',
                outline: 'none',
                textAlign: 'center',
                width: '90%',
                caretColor: '#b45309',
                textTransform: 'uppercase',
              }}
            />
          ) : (
            <div
              style={{
                fontSize: 19,
                fontWeight: 'bold',
                color: '#3e2723',
                cursor: 'text',
                minHeight: 26,
              }}
              onClick={() => {
                setCustomName(' ');
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              {isLoading && loadingMsg ? loadingMsg : generatedName}
            </div>
          )}
        </div>

        {/* START RECIPE button */}
        <PushButton
          label="▶  START RECIPE"
          color="#4caf50"
          shadow="#2e7d32"
          height={48}
          shadowDepth={8}
          onClick={onCook}
          disabled={isLoading}
          style={{ width: '100%', marginTop: 8 }}
        />

        {/* DEMO / LOAD buttons */}
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <PushButton
            label="DEMO"
            color="#29b6f6"
            shadow="#0277bd"
            height={40}
            shadowDepth={6}
            onClick={onDemo}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <PushButton
            label="LOAD"
            color="#9e9e9e"
            shadow="#616161"
            height={40}
            shadowDepth={6}
            onClick={onLoadJSON}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 13, color: '#e74c3c', textAlign: 'center', marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectorRow({
  category,
  value,
  onPrev,
  onNext,
  disabled,
}: {
  category: Category;
  value: string;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: 44,
        background: '#f5f0e8',
        borderRadius: 8,
        border: '2px solid #e8ddd0',
        boxShadow: '0 3px 0 rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
      }}
    >
      <span style={{ fontSize: 11, color: '#a1887f', width: 80, flexShrink: 0 }}>
        {category.toUpperCase()}
      </span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ArrowBtn glyph="‹" onClick={onPrev} disabled={disabled} />
        <span style={{ fontSize: 17, fontWeight: 'bold', color: '#3e2723', minWidth: 120, textAlign: 'center' }}>
          {value.toUpperCase()}
        </span>
        <ArrowBtn glyph="›" onClick={onNext} disabled={disabled} />
      </div>
    </div>
  );
}

function ArrowBtn({ glyph, onClick, disabled }: { glyph: string; onClick: () => void; disabled: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: hover && !disabled ? '#ddd5c8' : '#e8e0d8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 22,
        color: '#3e2723',
        userSelect: 'none',
        fontFamily: FONT_FAMILY,
      }}
    >
      {glyph}
    </div>
  );
}

function PushButton({
  label,
  color,
  shadow,
  height,
  shadowDepth,
  onClick,
  disabled,
  style,
}: {
  label: string;
  color: string;
  shadow: string;
  height: number;
  shadowDepth: number;
  onClick: () => void;
  disabled: boolean;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        height: height + shadowDepth,
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        ...style,
      }}
      onMouseDown={() => {
        if (!disabled) setPressed(true);
      }}
      onMouseUp={() => {
        if (pressed) {
          setPressed(false);
          onClick();
        }
      }}
      onMouseLeave={() => setPressed(false)}
    >
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          top: shadowDepth,
          left: 0,
          right: 0,
          height,
          borderRadius: 10,
          background: shadow,
        }}
      />
      {/* Face */}
      <div
        style={{
          position: 'absolute',
          top: pressed ? shadowDepth : 0,
          left: 0,
          right: 0,
          height,
          borderRadius: 10,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'top 0.05s',
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 'bold', color: '#ffffff', fontFamily: FONT_FAMILY }}>
          {label}
        </span>
      </div>
    </div>
  );
}
