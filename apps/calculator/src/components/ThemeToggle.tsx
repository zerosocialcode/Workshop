import React, { useEffect, useState, useRef } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [isFlooding, setIsFlooding] = useState(false);
  const [floodPos, setFloodPos] = useState({ x: '50%', y: '50%' });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('workshop-theme') as 'day' | 'night' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    const newTheme = theme === 'day' ? 'night' : 'day';
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setFloodPos({
        x: `${rect.left + rect.width / 2}px`,
        y: `${rect.top + rect.height / 2}px`
      });
    }

    setIsFlooding(true);
    
    setTimeout(() => {
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('workshop-theme', newTheme);
    }, 350);

    setTimeout(() => {
      setIsFlooding(false);
    }, 700);
  };

  return (
    <>
      <div 
        className={`light-flood ${isFlooding ? 'active' : ''}`} 
        style={{
          '--flood-x': floodPos.x,
          '--flood-y': floodPos.y,
        } as React.CSSProperties}
      />
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-[0.65rem] tracking-[0.16em] uppercase text-ink-faint">
          Lights
        </span>
        <button
          ref={buttonRef}
          onClick={toggleTheme}
          className="relative w-[76px] h-[44px] bg-paper border-2 border-ink rounded-md shrink-0 cursor-pointer overflow-hidden outline-none hover:brightness-105 transition-all"
          aria-label="Toggle theme"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          <div className="absolute inset-0 pointer-events-none before:content-[''] before:absolute before:w-1.5 before:h-1.5 before:rounded-full before:bg-ink before:opacity-30 before:top-1/2 before:-translate-y-1/2 before:left-1.5 after:content-[''] after:absolute after:w-1.5 after:h-1.5 after:rounded-full after:bg-ink after:opacity-30 after:top-1/2 after:-translate-y-1/2 after:right-1.5" />
          
          <div 
            className="absolute top-1 bottom-1 w-[32px] bg-ink rounded-sm flex items-center justify-center transition-all duration-400"
            style={{ 
              left: theme === 'day' ? '4px' : 'calc(100% - 36px)',
              transitionTimingFunction: 'cubic-bezier(.5,1.8,.5,1)'
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          </div>
        </button>
        <span className="font-mono text-[0.65rem] tracking-[0.16em] uppercase text-ink-faint">
          {theme === 'day' ? 'Day' : 'Night'}
        </span>
      </div>
    </>
  );
}
