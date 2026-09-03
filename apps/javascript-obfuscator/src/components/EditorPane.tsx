/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { SAMPLE_SCRIPTS } from '../lib/presets';
import { SampleScript } from '../types';

interface EditorPaneProps {
  code: string;
  onChange: (value: string) => void;
  onObfuscate: () => void;
  isProcessing: boolean;
  seed?: number;
  onRandomizeSeed?: () => void;
}

export function EditorPane({
  code,
  onChange,
  onObfuscate,
  isProcessing,
  seed,
  onRandomizeSeed,
}: EditorPaneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;
  const charCount = code.length;
  const byteCount = new Blob([code]).size;

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = (sample: SampleScript) => {
    onChange(sample.code);
    setShowSampleMenu(false);
  };

  return (
    <div
      className={`spec-card p-4 flex flex-col h-full ${
        isDragging ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[var(--line)] gap-2">
        <div className="flex items-center gap-2">
          <span className="spec-eyebrow">INPUT SOURCE // RAW ECMASCRIPT</span>
          <span className="spec-badge ok">STAGE 00</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sample Scripts Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSampleMenu(!showSampleMenu)}
              className="btn-ghost text-[0.68rem] py-1 px-2.5"
              title="Load standard production code fixtures"
            >
              [LOAD FIXTURES]
            </button>

            {showSampleMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-xl z-30 p-2 space-y-1 rounded-[3px]">
                <div className="spec-eyebrow px-2 py-1 border-b border-[var(--line)]">
                  SELECT FIXTURE SCRIPT
                </div>
                {SAMPLE_SCRIPTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleLoadSample(s)}
                    className="w-full text-left p-2 hover:bg-[var(--bg-deep)] border border-transparent hover:border-[var(--line)] rounded-[2px] transition-colors"
                  >
                    <div className="font-mono text-[0.72rem] font-bold text-[var(--ink)]">{s.name}</div>
                    <div className="font-mono text-[0.6rem] text-[var(--ink-soft)]">{s.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Import File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost text-[0.68rem] py-1 px-2.5"
            title="Import .js file from disk"
          >
            [IMPORT .JS]
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.ts,.mjs,.cjs,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Clear Button */}
          <button
            onClick={() => onChange('')}
            className="btn-ghost text-[0.68rem] py-1 px-2 text-[var(--fail)] hover:border-[var(--fail)]"
            title="Clear editor contents"
          >
            [CLEAR]
          </button>
        </div>
      </div>

      {/* Editor Body with line numbering */}
      <div className="relative flex-1 flex min-h-[380px] bg-[var(--bg-deep)] border border-[var(--ink)] rounded-[3px] overflow-hidden">
        {/* Line Numbers Column */}
        <div
          className="select-none py-3 px-2 bg-[var(--bg)] border-r border-[var(--line)] font-mono text-[0.7rem] text-[var(--ink-faint)] text-right min-w-[3rem] overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: Math.max(lineCount, 22) }).map((_, i) => (
            <div key={i} className="leading-5 h-5">
              {(i + 1).toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            placeholder="// Paste or write JavaScript source code here for multi-layered AST transformation...&#10;// Example:&#10;function calculateTotal(price, taxRate) {&#10;  const tax = price * taxRate;&#10;  return price + tax;&#10;}"
            spellCheck={false}
            className="w-full h-full p-3 font-mono text-[0.78rem] leading-5 text-[var(--ink)] bg-transparent resize-none focus:outline-none placeholder:text-[var(--ink-faint)]"
          />
        </div>
      </div>

      {/* Footer telemetry & primary action */}
      <div className="flex flex-wrap items-center justify-between pt-3 mt-3 border-t border-[var(--line)] gap-2">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[0.68rem] text-[var(--ink-soft)]">
          <span>LINES: <strong className="text-[var(--ink)]">{lineCount}</strong></span>
          <span>CHARS: <strong className="text-[var(--ink)]">{charCount}</strong></span>
          <span>SIZE: <strong className="text-[var(--ink)]">{(byteCount / 1024).toFixed(2)} KB</strong></span>
          {seed !== undefined && onRandomizeSeed && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--line)]">
              <span>SEED: <strong className="text-[var(--ink)]">{seed}</strong></span>
              <button
                onClick={onRandomizeSeed}
                className="btn-ghost text-[0.62rem] py-0.5 px-1.5 text-[var(--accent)] hover:border-[var(--accent)]"
                title="Randomize seed to generate a completely distinct AST hash variant"
              >
                [🎲 REROLL]
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onObfuscate}
          disabled={isProcessing || !code.trim()}
          className="btn-primary w-full sm:w-auto"
        >
          {isProcessing ? '[EXECUTING AST PASSES...]' : '[TRANSLATE & OBFUSCATE]'}
        </button>
      </div>
    </div>
  );
}
