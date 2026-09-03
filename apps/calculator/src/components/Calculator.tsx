import React, { useState, useEffect } from 'react';
import { evaluate } from 'mathjs';
import { CalculationRecord } from '../types';

interface CalculatorProps {
  onRecord: (record: CalculationRecord) => void;
  expressionToRestore?: string;
}

const SCIENTIFIC_BUTTONS = [
  { label: 'sin', val: 'sin(' }, { label: 'cos', val: 'cos(' }, { label: 'tan', val: 'tan(' },
  { label: 'asin', val: 'asin(' }, { label: 'acos', val: 'acos(' }, { label: 'atan', val: 'atan(' },
  { label: 'log', val: 'log10(' }, { label: 'ln', val: 'log(' }, { label: 'e', val: 'e' },
  { label: 'π', val: 'pi' }, { label: 'sqrt', val: 'sqrt(' }, { label: '^', val: '^' },
  { label: '(', val: '(' }, { label: ')', val: ')' }, { label: 'x!', val: '!' }
];

const BASIC_BUTTONS = [
  '7', '8', '9', '/',
  '4', '5', '6', '*',
  '1', '2', '3', '-',
  '0', '.', '=', '+'
];

export default function Calculator({ onRecord, expressionToRestore }: CalculatorProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (expressionToRestore !== undefined) {
      setExpression(expressionToRestore);
      setResult('');
      setError(false);
    }
  }, [expressionToRestore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default on Enter to avoid form submission issues if any exist
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      } else if (e.key === 'Backspace') {
        deleteLast();
      } else if (e.key === 'Escape') {
        clear();
      } else if (/^[0-9+\-*/.^()!]$/.test(e.key)) {
        handleInput(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expression]); // Need expression in dependencies for calculate to have the latest state

  const handleInput = (val: string) => {
    setError(false);
    
    if (val === '=') {
      calculate();
    } else {
      setExpression(prev => prev + val);
    }
  };

  const calculate = () => {
    if (!expression.trim()) return;
    
    try {
      const res = evaluate(expression);
      // Format number to avoid extremely long decimals
      const formattedRes = typeof res === 'number' ? Number(res.toPrecision(10)).toString() : res.toString();
      
      setResult(formattedRes);
      setError(false);
      
      onRecord({
        id: Math.random().toString(36).substr(2, 9),
        expression,
        result: formattedRes,
        timestamp: Date.now()
      });
      
    } catch (err) {
      setError(true);
      setResult('Error');
    }
  };

  const clear = () => {
    setExpression('');
    setResult('');
    setError(false);
  };

  const deleteLast = () => {
    setExpression(prev => prev.slice(0, -1));
    setError(false);
    setResult('');
  };

  return (
    <div className="workshop-card flex flex-col h-full animate-fade-rise" style={{ animationDelay: '70ms' }}>
      <div className="mb-4 pb-2 border-b-2 border-ink">
        <div className="font-mono text-[0.65rem] tracking-[0.16em] uppercase text-ink-faint flex justify-between">
          <span>Sheet 01 &mdash; Main</span>
          {error && <span className="text-fail animate-pulse">Bad Expression</span>}
        </div>
        <h2 className="font-display text-3xl uppercase tracking-wider mt-1 animate-draw-line relative inline-block">
          Calculator
          <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-ink" />
        </h2>
      </div>

      <div className="bg-bg-deep border border-ink p-4 rounded mb-6 min-h-[100px] flex flex-col justify-end items-end relative overflow-hidden">
        <div className="w-full text-right font-mono text-ink-soft text-lg mb-1 break-all tracking-wider min-h-[28px]">
          {expression || ' '}
        </div>
        <div className={`w-full text-right font-mono text-3xl font-semibold tracking-wider break-all ${error ? 'text-fail' : 'text-ink'}`}>
          {result || '0'}
        </div>
        {/* Glow effect for input */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-1">
        {/* Scientific Functions */}
        <div className="md:col-span-2 grid grid-cols-3 gap-2">
          {SCIENTIFIC_BUTTONS.map((btn, idx) => (
            <button
              key={idx}
              onClick={() => handleInput(btn.val)}
              className="bg-transparent border border-line text-ink hover:text-ink hover:border-ink font-mono text-xs uppercase rounded-[3px] py-2 transition-all hover:bg-line-soft active:translate-y-[1px]"
            >
              {btn.label}
            </button>
          ))}
          <button 
            onClick={clear}
            className="bg-warn text-paper border border-warn font-mono text-xs uppercase rounded-[3px] py-2 hover:brightness-110 active:translate-y-[1px] col-span-2"
          >
            Clear
          </button>
          <button 
            onClick={deleteLast}
            className="bg-transparent border border-line text-ink hover:border-ink font-mono text-xs uppercase rounded-[3px] py-2 hover:bg-line-soft active:translate-y-[1px]"
          >
            Del
          </button>
        </div>

        {/* Basic Functions */}
        <div className="md:col-span-3 grid grid-cols-4 gap-2">
          {BASIC_BUTTONS.map((btn, idx) => (
            <button
              key={idx}
              onClick={() => handleInput(btn)}
              className={`
                font-mono text-lg rounded-[3px] py-3 transition-all active:translate-y-[1px]
                ${btn === '=' 
                  ? 'bg-accent text-accent-ink border border-accent hover:brightness-110 shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_16%,transparent)]' 
                  : ['/', '*', '-', '+'].includes(btn)
                    ? 'bg-ink text-paper border border-ink hover:brightness-110'
                    : 'bg-paper text-ink border border-line hover:border-ink hover:-translate-y-[1px]'
                }
              `}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
