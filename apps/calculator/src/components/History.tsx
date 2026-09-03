import React from 'react';
import { CalculationRecord } from '../types';

interface HistoryProps {
  history: CalculationRecord[];
  onClear: () => void;
  onSelect: (record: CalculationRecord) => void;
}

export default function History({ history, onClear, onSelect }: HistoryProps) {
  const exportHistory = () => {
    if (history.length === 0) return;
    
    let content = "Calculator History\n=================\n\n";
    history.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleString();
      content += `[${date}]\n${record.expression}\n= ${record.result}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator_history_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workshop-card flex flex-col h-full animate-fade-rise" style={{ animationDelay: '140ms' }}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-ink">
        <div>
          <div className="font-mono text-[0.65rem] tracking-[0.16em] uppercase text-ink-faint">
            Log 01 &mdash; Records
          </div>
          <h2 className="font-display text-2xl uppercase tracking-wider mt-1">History</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportHistory}
            disabled={history.length === 0}
            className="bg-transparent border border-line text-ink-soft hover:text-ink hover:border-ink uppercase font-mono text-[0.72rem] tracking-wider px-3 py-1 rounded-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export
          </button>
          <button 
            onClick={onClear}
            disabled={history.length === 0}
            className="bg-ink text-paper border border-ink uppercase font-mono text-[0.72rem] tracking-wider px-3 py-1 rounded-[3px] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {history.length === 0 ? (
          <div className="text-ink-soft text-sm italic font-body">No calculations recorded.</div>
        ) : (
          history.map((record) => (
            <div 
              key={record.id} 
              className="group cursor-pointer p-2 -mx-2 rounded hover:bg-line-soft transition-colors"
              onClick={() => onSelect(record)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-ink-faint">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="opacity-0 group-hover:opacity-100 font-mono text-[0.6rem] text-accent uppercase tracking-widest transition-opacity">
                  Restore
                </span>
              </div>
              <div className="font-mono text-ink text-sm break-all">{record.expression}</div>
              <div className="font-mono text-accent font-semibold text-right mt-1">= {record.result}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
