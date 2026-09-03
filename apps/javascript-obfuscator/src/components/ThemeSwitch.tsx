/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, MouseEvent } from 'react';

export function ThemeSwitch() {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [isFlooding, setIsFlooding] = useState(false);
  const [floodCoords, setFloodCoords] = useState({ x: 0, y: 0 });
  const switchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('workshop-theme') as 'day' | 'night' | null;
    const initialTheme = saved === 'night' ? 'night' : 'day';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = (e: MouseEvent) => {
    if (isFlooding) return;

    const rect = switchRef.current?.getBoundingClientRect();
    const clickX = rect ? rect.left + rect.width / 2 : e.clientX;
    const clickY = rect ? rect.top + rect.height / 2 : e.clientY;

    setFloodCoords({ x: clickX, y: clickY });
    setIsFlooding(true);

    // Swap theme at midpoint of physical light flood
    setTimeout(() => {
      const nextTheme = theme === 'day' ? 'night' : 'day';
      setTheme(nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('workshop-theme', nextTheme);
    }, 350);

    setTimeout(() => {
      setIsFlooding(false);
    }, 700);
  };

  return (
    <>
      {/* Radial Light Flood Overlay */}
      {isFlooding && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${floodCoords.x}px ${floodCoords.y}px, ${
              theme === 'day' ? '#0d1d31' : '#ece5d2'
            } 0%, rgba(0,0,0,0.85) 100%)`,
            animation: 'lightFlood 0.7s ease-in-out forwards',
          }}
        />
      )}

      <div className="flex flex-col items-center select-none" id="themeToggleWrapper">
        <span className="spec-eyebrow mb-1">LIGHTS</span>
        <button
          ref={switchRef}
          id="themeToggle"
          onClick={toggleTheme}
          aria-label="Toggle Workshop Lighting"
          className="light-switch-plate relative focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <div className={`light-switch-rocker ${theme === 'night' ? 'night' : ''}`}>
            <div className="light-switch-dot" />
          </div>
        </button>
        <span className="font-mono text-[0.68rem] uppercase font-semibold text-[var(--ink-soft)] mt-1 tracking-wider">
          {theme === 'day' ? 'DAY // PAPER' : 'NIGHT // BLUEPRINT'}
        </span>
      </div>
    </>
  );
}
