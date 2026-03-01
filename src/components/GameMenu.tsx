import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { convex } from '../lib/convex';
import { gameStore } from '../store/gameStore';
import { FONT_FAMILY } from '../config';
import type { PuzzleData } from '../types';
import { ChevronLeft, ChevronRight, Play, Upload } from 'lucide-react';

const LOADING_MESSAGES = [
  { emoji: '🥕', text: 'Preparing ingredients' },
  { emoji: '🔪', text: 'Chopping vegetables' },
  { emoji: '🍳', text: 'Heating up the pan' },
  { emoji: '🧂', text: 'Gathering spices' },
  { emoji: '🥄', text: 'Grabbing utensils' },
  { emoji: '📖', text: 'Reading the cookbook' },
  { emoji: '👨‍🍳', text: 'Calling the chef' },
  { emoji: '🔥', text: 'Preheating the oven' },
  { emoji: '🧈', text: 'Melting the butter' },
  { emoji: '🫗', text: 'Mixing the batter' },
];

type Category = 'Style' | 'Filling' | 'Method' | 'Base';

const WORD_LISTS: Record<Category, string[]> = {
  Style: ['Crispy', 'Smoky', 'Spicy', 'Cheesy', 'Tangy', 'Herby', 'Zesty'],
  Filling: ['Ham', 'Chicken', 'Tofu', 'Shrimp', 'Mushroom', 'Meatball'],
  Method: ['Stuffed', 'Glazed', 'Grilled', 'Braised', 'Roasted', 'Caramelized'],
  Base: ['Bun', 'Bowl', 'Wrap', 'Taco', 'Pasta', 'Salad'],
};

const CATEGORIES: Category[] = ['Style', 'Filling', 'Method', 'Base'];

const FOOD_ICONS = ['🍖', '🥩', '🍕', '🥪', '🥕', '🍴', '🔥', '💧', '☕'];

function randomSelections(): Record<Category, number> {
  const result = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    result[cat] = Math.floor(Math.random() * WORD_LISTS[cat].length);
  }
  return result;
}

function LoadingCard({ dishName }: { dishName: string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
        setFading(false);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const msg = LOADING_MESSAGES[msgIndex];

  return (
    <>
      <style>{`
        @keyframes loadingSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.15); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-10deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes loadingDots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }
        @keyframes loadingDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          width: 380,
          padding: '36px 28px 32px',
          background: '#fffaf0',
          borderRadius: 28,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Top pin */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: '#ff5252',
              borderRadius: '50%',
              border: '3px solid #3e2723',
              boxShadow: '0 2px 0 #3e2723',
            }}
          />
        </div>

        {/* Dish name */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: '#d84315',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: FONT_FAMILY,
          }}
        >
          Cooking up...
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#3e2723',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            fontFamily: FONT_FAMILY,
            textAlign: 'center',
          }}
        >
          {dishName}
        </div>

        {/* Animated emoji */}
        <div
          style={{
            fontSize: 64,
            animation: 'loadingSpin 1.6s ease-in-out infinite',
            lineHeight: 1,
            margin: '8px 0',
            transition: 'opacity 0.3s',
            opacity: fading ? 0 : 1,
          }}
        >
          {msg.emoji}
        </div>

        {/* Rotating message */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#5d4037',
            fontFamily: FONT_FAMILY,
            textAlign: 'center',
            transition: 'opacity 0.3s',
            opacity: fading ? 0 : 1,
            minHeight: 28,
          }}
        >
          {msg.text}
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ffca28',
                border: '2px solid #3e2723',
                animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function GameMenu() {
  const [indices, setIndices] = useState(randomSelections);
  const [customName, setCustomName] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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

    try {
      const puzzleData = await convex.action(
        api.generator.generateOrGetRecipe,
        { dishName, difficulty },
      );
      setIsLoading(false);
      gameStore.getState().startGame(puzzleData as PuzzleData, difficulty);
    } catch (err) {
      setIsLoading(false);
      setError((err as Error).message);
    }
  };

  const onDemo = async () => {
    if (isLoading) return;
    const module = await import('../data/mockPuzzle.json');
    gameStore.getState().startGame(module.default as PuzzleData, 'medium');
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
          gameStore.getState().startGame(puzzleData, 'medium');
        } catch {
          setError('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const font = FONT_FAMILY;

  if (isLoading) {
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
          overflow: 'hidden',
        }}
      >
        {/* Background food pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 40,
              padding: 24,
              height: '100%',
              width: '100%',
              transform: 'rotate(-5deg) scale(1.3)',
            }}
          >
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {FOOD_ICONS[i % FOOD_ICONS.length]}
              </div>
            ))}
          </div>
        </div>
        <LoadingCard dishName={getDishName()} />
      </div>
    );
  }

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
        overflow: 'hidden',
      }}
    >
      {/* Background food pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 40,
            padding: 24,
            height: '100%',
            width: '100%',
            transform: 'rotate(-5deg) scale(1.3)',
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
              }}
            >
              {FOOD_ICONS[i % FOOD_ICONS.length]}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          width: 480,
          padding: '20px 28px 16px',
          background: '#fffaf0',
          borderRadius: 28,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
          marginTop: 8,
          zIndex: 10,
        }}
      >
        {/* Top pin */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: '#ff5252',
              borderRadius: '50%',
              border: '3px solid #3e2723',
              boxShadow: '0 2px 0 #3e2723',
            }}
          />
        </div>

        {/* Header */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#3e2723',
            margin: '2px 0 6px',
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
          }}
        >
          Create Recipe
        </h1>

        {/* Difficulty selector */}
        <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isLoading} />

        {/* Selector rows */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
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
        </div>

        {/* Summary box */}
        <div
          style={{
            width: '100%',
            background: '#ffca28',
            borderRadius: 14,
            border: '3px solid #3e2723',
            boxShadow: '0 5px 0 #3e2723',
            padding: '10px 16px 12px',
            textAlign: 'center',
            position: 'relative',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: '#d84315',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            SELECTED ORDER
          </div>
          {customName.trim() ? (
            <input
              ref={inputRef}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: '#3e2723',
                fontFamily: font,
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid #3e2723',
                outline: 'none',
                textAlign: 'center',
                width: '90%',
                caretColor: '#d84315',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            />
          ) : (
            <div
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: '#3e2723',
                cursor: 'text',
                minHeight: 24,
                lineHeight: 1.2,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
              onClick={() => {
                setCustomName(' ');
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              {generatedName}
            </div>
          )}
        </div>

        {/* START RECIPE button */}
        <PushButton
          icon={<Play size={18} fill="currentColor" strokeWidth={0} />}
          label="START RECIPE"
          color="#4caf50"
          hoverColor="#43a047"
          height={44}
          shadowDepth={6}
          onClick={onCook}
          disabled={isLoading}
          style={{ width: '100%' }}
        />

        {/* DEMO / LOAD buttons */}
        <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 2 }}>
          <PushButton
            label="DEMO"
            color="#29b6f6"
            hoverColor="#03a9f4"
            height={36}
            shadowDepth={5}
            onClick={onDemo}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <PushButton
            icon={<Upload size={14} strokeWidth={3} />}
            label="LOAD"
            color="#9e9e9e"
            hoverColor="#757575"
            height={36}
            shadowDepth={5}
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
        background: '#ffffff',
        borderRadius: 14,
        border: '2px solid #e0e0e0',
        boxShadow: '0 3px 0 #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: 4,
      }}
    >
      <div style={{ width: 80, paddingLeft: 8, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: '#a1887f',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {category}
        </span>
      </div>
      <ArrowBtn direction="left" onClick={onPrev} disabled={disabled} />
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 900,
          color: '#3e2723',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          userSelect: 'none',
        }}
      >
        {value}
      </div>
      <ArrowBtn direction="right" onClick={onNext} disabled={disabled} />
    </div>
  );
}

function ArrowBtn({ direction, onClick, disabled }: { direction: 'left' | 'right'; onClick: () => void; disabled: boolean }) {
  const [hover, setHover] = useState(false);
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: hover && !disabled ? '#eeeeee' : '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        color: '#3e2723',
        userSelect: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        transition: 'background 0.15s',
      }}
    >
      <Icon size={20} strokeWidth={3} />
    </div>
  );
}

const DIFFICULTIES = [
  { value: 'easy' as const, label: 'EASY', icon: '🌶️' },
  { value: 'medium' as const, label: 'MEDIUM', icon: '🌶️🌶️' },
  { value: 'hard' as const, label: 'HARD', icon: '🌶️🌶️🌶️' },
];

function DifficultySelector({
  value,
  onChange,
  disabled,
}: {
  value: 'easy' | 'medium' | 'hard';
  onChange: (v: 'easy' | 'medium' | 'hard') => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        gap: 6,
        marginBottom: 4,
      }}
    >
      {DIFFICULTIES.map((d) => {
        const active = value === d.value;
        return (
          <div
            key={d.value}
            onClick={disabled ? undefined : () => onChange(d.value)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 10,
              border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
              background: active ? '#3e2723' : '#ffffff',
              color: active ? '#ffffff' : '#3e2723',
              textAlign: 'center',
              cursor: disabled ? 'default' : 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s',
              boxShadow: active ? '0 3px 0 #2a1a12' : '0 3px 0 #e0e0e0',
            }}
          >
            <div style={{ fontSize: 12, lineHeight: 1 }}>{d.icon}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.08em',
                fontFamily: FONT_FAMILY,
                marginTop: 2,
              }}
            >
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PushButton({
  icon,
  label,
  color,
  hoverColor,
  height,
  shadowDepth,
  onClick,
  disabled,
  style,
}: {
  icon?: React.ReactNode;
  label: string;
  color: string;
  hoverColor: string;
  height: number;
  shadowDepth: number;
  onClick: () => void;
  disabled: boolean;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);

  const borderWidth = 3;
  const outerRadius = 14;
  const innerRadius = outerRadius - borderWidth;

  return (
    <div
      style={{
        borderRadius: outerRadius,
        border: `${borderWidth}px solid #3e2723`,
        background: '#3e2723',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
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
    >
      {/* Face */}
      <div
        style={{
          height,
          borderRadius: innerRadius,
          background: hover && !disabled && !pressed ? hoverColor : color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: pressed ? 0 : shadowDepth,
          marginTop: pressed ? shadowDepth : 0,
          transition: 'margin 0.08s, background 0.15s',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: FONT_FAMILY,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
