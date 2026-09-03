import React, { useState, useEffect } from 'react';
import Calculator from './components/Calculator';
import History from './components/History';
import ThemeToggle from './components/ThemeToggle';
import { CalculationRecord } from './types';

export default function App() {
  const [history, setHistory] = useState<CalculationRecord[]>([]);
  const [expressionToRestore, setExpressionToRestore] = useState<string | undefined>();

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('calculator-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem('calculator-history', JSON.stringify(history));
  }, [history]);

  // Deep-link support for Quick Find (Phase 5): "calculate 25% of 480" /
  // "12 * 8" resolves to a synthetic action opening straight here with
  // ?expr=<expression> already filled in — reuses the exact same restore
  // path History rows use, so it behaves identically to picking a past
  // calculation. See resolver.js, parseMathExpression().
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expr = params.get('expr');
    if (expr) setExpressionToRestore(expr);
  }, []);

  const handleRecord = (record: CalculationRecord) => {
    setHistory(prev => [record, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleRestore = (record: CalculationRecord) => {
    setExpressionToRestore(record.expression);
  };

  return (
    <>
      {/* Registration crop marks */}
      <div className="crop-mark crop-mark-tl" />
      <div className="crop-mark crop-mark-tr" />
      <div className="crop-mark crop-mark-bl" />
      <div className="crop-mark crop-mark-br" />

      <div className="min-h-screen p-4 md:p-8 flex flex-col max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8 animate-fade-rise z-10">
          <div>

            <h1 className="font-display text-4xl uppercase tracking-wider mt-1">
              Calculator
            </h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
          <div className="lg:col-span-8">
            <Calculator 
              onRecord={handleRecord} 
              expressionToRestore={expressionToRestore} 
            />
          </div>
          <div className="lg:col-span-4 h-[500px] lg:h-auto">
            <History 
              history={history} 
              onClear={handleClearHistory}
              onSelect={handleRestore}
            />
          </div>
        </main>
      </div>
    </>
  );
}
