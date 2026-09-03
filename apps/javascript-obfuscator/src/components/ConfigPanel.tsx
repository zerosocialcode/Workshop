/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  ObfuscationOptions,
  ObfuscationPreset,
  IdentifierNamesGenerator,
} from '../types';
import { COMMON_RESERVED_PRESETS, generateRandomSeed } from '../lib/presets';

interface ConfigPanelProps {
  options: ObfuscationOptions;
  activePreset: ObfuscationPreset;
  onOptionsChange: (newOptions: ObfuscationOptions) => void;
  onPresetSelect: (preset: ObfuscationPreset) => void;
}

export function ConfigPanel({
  options,
  activePreset,
  onOptionsChange,
  onPresetSelect,
}: ConfigPanelProps) {
  const [customReservedInput, setCustomReservedInput] = useState('');

  const updateOption = <K extends keyof ObfuscationOptions>(
    key: K,
    value: ObfuscationOptions[K]
  ) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  const handleRerollSeed = () => {
    updateOption('seed', generateRandomSeed());
  };

  const handleAddReservedName = () => {
    const trimmed = customReservedInput.trim();
    if (trimmed && !options.reservedNames.includes(trimmed)) {
      updateOption('reservedNames', [...options.reservedNames, trimmed]);
      setCustomReservedInput('');
    }
  };

  const handleRemoveReservedName = (name: string) => {
    updateOption(
      'reservedNames',
      options.reservedNames.filter((n) => n !== name)
    );
  };

  const handleAddPresetReservedSet = (items: string[]) => {
    const combined = Array.from(new Set([...options.reservedNames, ...items]));
    updateOption('reservedNames', combined);
  };

  return (
    <div className="spec-card p-4 space-y-6">
      {/* Header with Preset Selector */}
      <div className="space-y-3 pb-4 border-b border-[var(--line)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="spec-eyebrow">CONFIGURATION SPEC // AST MULTI-LAYER MATRIX</span>
            <h2 className="font-mono text-sm font-bold text-[var(--ink)] tracking-wider">
              TRANSFORMATION PROFILES & STRATEGY
            </h2>
          </div>
          <span className="spec-badge accent">PROFILE: {activePreset.toUpperCase()}</span>
        </div>

        {/* Preset Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['draft', 'balanced', 'industrial', 'max_armor'] as ObfuscationPreset[]).map((p) => {
            const labels: Record<ObfuscationPreset, { title: string; desc: string }> = {
              draft: { title: '01 // DRAFT', desc: 'Light mangle & compact minification' },
              balanced: { title: '02 // BALANCED', desc: 'Hex identifiers + Base64 strings' },
              industrial: { title: '03 // INDUSTRIAL', desc: 'Layered RC4 + CFF 0.70 + Bitwise' },
              max_armor: { title: '04 // MAXIMUM ARMOR', desc: 'Dual RC4/B64 + CFF 0.75 + Decoy' },
            };
            const isSelected = activePreset === p;

            return (
              <button
                key={p}
                onClick={() => onPresetSelect(p)}
                className={`p-2.5 text-left border rounded-[3px] transition-all font-mono ${
                  isSelected
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--bg-deep)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--ink)]'
                }`}
              >
                <div className="text-[0.72rem] font-bold tracking-wide">{labels[p].title}</div>
                <div
                  className={`text-[0.58rem] ${
                    isSelected ? 'text-[var(--ink-soft)]' : 'text-[var(--ink-faint)]'
                  }`}
                >
                  {labels[p].desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seed Randomization & Build Determinism Control Bar */}
      <div className="p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px] flex flex-wrap items-center justify-between gap-3 font-mono text-[0.72rem]">
        <div className="flex items-center gap-3">
          <span className="spec-eyebrow mb-0">PER-BUILD RANDOMIZATION SEED:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={options.seed || 1234567}
              onChange={(e) => updateOption('seed', parseInt(e.target.value) || 0)}
              className="spec-input w-28 p-1 text-center font-bold font-mono text-[0.75rem]"
            />
            <button
              onClick={handleRerollSeed}
              className="btn-secondary text-[0.68rem] py-1 px-2"
              title="Generate fresh pseudo-random seed to vary AST symbol tables on every build"
            >
              [REROLL SEED]
            </button>
          </div>
        </div>

        <div className="text-[var(--ink-soft)] text-[0.65rem] max-w-md">
          Different seeds produce completely distinct symbol hashes and cipher rotations for identical source code.
        </div>
      </div>

      {/* Granular Multi-Layer AST Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-[0.72rem]">
        {/* Layer 1: Identifiers & Scope */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 01</span>
              <div className="font-bold text-[var(--ink)]">IDENTIFIER & SCOPE MANGLING</div>
            </div>
            <span className="spec-badge ok">AST PASS</span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[0.62rem] uppercase text-[var(--ink-faint)] mb-1">
                VARIABLE GENERATOR
              </label>
              <select
                value={options.identifierNamesGenerator}
                onChange={(e) =>
                  updateOption('identifierNamesGenerator', e.target.value as IdentifierNamesGenerator)
                }
                className="spec-input w-full p-1.5 text-[0.72rem]"
              >
                <option value="hexadecimal">Hexadecimal (_0x4a1f, _0x8b2e)</option>
                <option value="mangled">Mangled Short (a, b, c)</option>
                <option value="dictionary">Dictionary Confusing (O0, OO, O0O)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={options.renameGlobals}
                onChange={(e) => updateOption('renameGlobals', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Rename Global Scopes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.transformObjectKeys}
                onChange={(e) => updateOption('transformObjectKeys', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Transform Object Key Properties</span>
            </label>
          </div>
        </div>

        {/* Layer 2: String Table & Encryption */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 02</span>
              <div className="font-bold text-[var(--ink)]">STRING CIPHER & ROTATION MATRIX</div>
            </div>
            <span className="spec-badge ok">CIPHER PASS</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.stringArray}
                onChange={(e) => updateOption('stringArray', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)] font-bold">Extract String Array Table</span>
            </label>

            {options.stringArray && (
              <>
                <div>
                  <label className="block text-[0.62rem] uppercase text-[var(--ink-faint)] mb-1">
                    CIPHER ENCODING
                  </label>
                  <select
                    value={
                      options.stringArrayEncoding.includes('rc4') &&
                      options.stringArrayEncoding.includes('base64')
                        ? 'dual'
                        : options.stringArrayEncoding.includes('rc4')
                        ? 'rc4'
                        : options.stringArrayEncoding.includes('base64')
                        ? 'base64'
                        : 'none'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'dual') updateOption('stringArrayEncoding', ['rc4', 'base64']);
                      else if (val === 'rc4') updateOption('stringArrayEncoding', ['rc4']);
                      else if (val === 'base64') updateOption('stringArrayEncoding', ['base64']);
                      else updateOption('stringArrayEncoding', ['none']);
                    }}
                    className="spec-input w-full p-1.5 text-[0.72rem]"
                  >
                    <option value="dual">Dual RC4 + Base64 (Defeats naive single-pass unpackers)</option>
                    <option value="rc4">RC4 Dynamic Key Cipher</option>
                    <option value="base64">Base64 Table Encoding</option>
                    <option value="none">Plain Indexed Table</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.stringArrayRotate}
                      onChange={(e) => updateOption('stringArrayRotate', e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[0.65rem] text-[var(--ink)]">IIFE Array Shift</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.stringArrayShuffle}
                      onChange={(e) => updateOption('stringArrayShuffle', e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[0.65rem] text-[var(--ink)]">Index Shuffle</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.stringArrayIndexesChaining}
                      onChange={(e) => updateOption('stringArrayIndexesChaining', e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[0.65rem] text-[var(--ink)]">Index Chaining</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.splitStrings}
                      onChange={(e) => updateOption('splitStrings', e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-[0.65rem] text-[var(--ink)]">Split Chunks</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Layer 3: Control Flow Flattening */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 03</span>
              <div className="font-bold text-[var(--ink)]">CONTROL FLOW FLATTENING (CFF)</div>
            </div>
            <span className="spec-badge ok">DISPATCH PASS</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.controlFlowFlattening}
                onChange={(e) => updateOption('controlFlowFlattening', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)] font-bold">Flatten AST Control Graph</span>
            </label>

            {options.controlFlowFlattening && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[0.62rem] uppercase text-[var(--ink-faint)]">
                  <span>TRANSFORMATION THRESHOLD</span>
                  <span className="font-bold text-[var(--ink)]">
                    {Math.round(options.controlFlowFlatteningThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={options.controlFlowFlatteningThreshold}
                  onChange={(e) =>
                    updateOption('controlFlowFlatteningThreshold', parseFloat(e.target.value))
                  }
                  className="w-full accent-[var(--accent)]"
                />
                <span className="text-[0.6rem] text-[var(--ink-soft)] block">
                  Replaces sequential logic with pseudo-random state-machine switch loops.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Layer 4: Dead Code Injection & Opaque Predicates */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 04</span>
              <div className="font-bold text-[var(--ink)]">DEAD CODE & OPAQUE PREDICATES</div>
            </div>
            <span className="spec-badge ok">DECOY PASS</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.deadCodeInjection}
                onChange={(e) => updateOption('deadCodeInjection', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)] font-bold">Inject Decoy Branches</span>
            </label>

            {options.deadCodeInjection && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[0.62rem] uppercase text-[var(--ink-faint)]">
                  <span>INJECTION PROBABILITY</span>
                  <span className="font-bold text-[var(--ink)]">
                    {Math.round(options.deadCodeInjectionThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={options.deadCodeInjectionThreshold}
                  onChange={(e) =>
                    updateOption('deadCodeInjectionThreshold', parseFloat(e.target.value))
                  }
                  className="w-full accent-[var(--accent)]"
                />
                <span className="text-[0.6rem] text-[var(--ink-soft)] block">
                  Inserts unreachable decoy loops with mathematical tautology guards.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Layer 5: Constant Folding & Expression Mutation */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 05</span>
              <div className="font-bold text-[var(--ink)]">CONSTANT FOLDING & BITWISE</div>
            </div>
            <span className="spec-badge ok">MATH PASS</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.numbersToExpressions}
                onChange={(e) => updateOption('numbersToExpressions', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Convert Numbers to Bitwise Polynomials</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.unicodeEscapeSequence}
                onChange={(e) => updateOption('unicodeEscapeSequence', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Unicode Character Escaping</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.compact}
                onChange={(e) => updateOption('compact', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Single-line Production Minification</span>
            </label>
          </div>
        </div>

        {/* Layer 6: Anti-Tampering & Self Defending */}
        <div className="space-y-3 p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px]">
          <div className="border-b border-[var(--line)] pb-1.5 flex justify-between items-center">
            <div>
              <span className="spec-eyebrow">LAYER 06</span>
              <div className="font-bold text-[var(--ink)]">SELF-DEFENDING & ANTI-TAMPER</div>
            </div>
            <span className="spec-badge ok">GUARD PASS</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.selfDefending}
                onChange={(e) => updateOption('selfDefending', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Anti-Beautification / Format Tamper Trap</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.debugProtection}
                onChange={(e) => updateOption('debugProtection', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Anti-Debugging Lockout (`debugger;` trap)</span>
            </label>

            {options.debugProtection && (
              <div className="space-y-1 pt-1 pl-4 border-l-2 border-[var(--accent)]">
                <div className="flex justify-between text-[0.62rem] uppercase text-[var(--ink-faint)]">
                  <span>DEBUG PROTECTION INTERVAL</span>
                  <span className="font-bold text-[var(--ink)]">
                    {options.debugProtectionInterval > 0 ? `${options.debugProtectionInterval} ms` : '2000 ms (default)'}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="500"
                  placeholder="2000"
                  value={options.debugProtectionInterval || 2000}
                  onChange={(e) =>
                    updateOption('debugProtectionInterval', Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="spec-input w-full p-1 text-[0.72rem]"
                />
                <span className="text-[0.58rem] text-[var(--ink-soft)] block">
                  Periodic timer interval (in milliseconds) for debugger freeze trap.
                </span>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.disableConsoleOutput}
                onChange={(e) => updateOption('disableConsoleOutput', e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--ink)]">Disable Console Output Calls</span>
            </label>
          </div>
        </div>
      </div>

      {/* Surface Reserved-Name Protection UI Prominently */}
      <div className="p-4 bg-[var(--bg-deep)] border-2 border-[var(--line)] rounded-[3px] space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div>
            <span className="spec-eyebrow">RUNTIME INTERFACE PRESERVATION</span>
            <h3 className="text-[0.78rem] font-bold text-[var(--ink)]">
              RESERVED IDENTIFIER PROTECTION LIST ({options.reservedNames.length} PRESERVED)
            </h3>
          </div>
          <span className="text-[0.62rem] text-[var(--ink-soft)]">
            Prevents mangling of external API bindings, exported objects, and global hooks
          </span>
        </div>

        {/* Quick Add Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.65rem] text-[var(--ink-faint)] uppercase">QUICK PRESETS:</span>
          {COMMON_RESERVED_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleAddPresetReservedSet(preset.items)}
              className="btn-ghost text-[0.62rem] py-0.5 px-2"
              title={`Add ${preset.items.join(', ')}`}
            >
              + {preset.name}
            </button>
          ))}
          <button
            onClick={() => updateOption('reservedNames', [])}
            className="btn-ghost text-[0.62rem] py-0.5 px-2 text-[var(--fail)] hover:border-[var(--fail)]"
          >
            [CLEAR ALL]
          </button>
        </div>

        {/* Active Reserved Badges List */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] min-h-[46px] max-h-32 overflow-y-auto">
          {options.reservedNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[2px] text-[0.65rem] font-bold text-[var(--ink)]"
            >
              {name}
              <button
                onClick={() => handleRemoveReservedName(name)}
                className="text-[var(--ink-faint)] hover:text-[var(--fail)] ml-1 font-mono"
                title={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
          {options.reservedNames.length === 0 && (
            <span className="text-[0.65rem] text-[var(--ink-faint)] italic">
              No reserved identifiers specified. All symbols subject to renaming.
            </span>
          )}
        </div>

        {/* Add custom token input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add identifier (e.g. myPublicApiFunction, currentUser)..."
            value={customReservedInput}
            onChange={(e) => setCustomReservedInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddReservedName();
              }
            }}
            className="spec-input flex-1 p-1.5 text-[0.72rem]"
          />
          <button
            onClick={handleAddReservedName}
            disabled={!customReservedInput.trim()}
            className="btn-secondary text-[0.68rem] py-1.5 px-3"
          >
            [+ ADD TO RESERVED]
          </button>
        </div>
      </div>
    </div>
  );
}
