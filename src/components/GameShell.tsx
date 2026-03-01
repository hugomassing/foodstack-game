import { useRef, useEffect, useState, type ReactNode } from 'react';
import { GAME_W, GAME_H } from '../config';

export function GameShell({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setScale(Math.min(vw / GAME_W, vh / GAME_H));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: GAME_W,
        height: GAME_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}