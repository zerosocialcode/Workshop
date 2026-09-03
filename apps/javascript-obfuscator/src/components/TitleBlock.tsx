/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeSwitch } from './ThemeSwitch';

interface TitleBlockProps {
  coverageRating: string;
  coverageScore: number;
  engineActive: boolean;
}

export function TitleBlock({ coverageRating, coverageScore, engineActive }: TitleBlockProps) {
  return (
    <header className="relative w-full pb-5 mb-6 border-b-2 border-[var(--ink)] draw-underline">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        {/* Left: Title & Spec Identification */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="spec-eyebrow">
              SHEET 01 — JAVASCRIPT AST OBFUSCATION ENGINE
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[var(--line)] rounded-[3px] bg-[var(--bg-deep)]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  engineActive ? 'bg-[var(--ok)] animate-pulse' : 'bg-[var(--warn)]'
                }`}
              />
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--ink)]">
                {engineActive ? 'AST ENGINE ONLINE // READY' : 'PARSER STANDBY'}
              </span>
            </div>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[var(--ink)] tracking-tight">
            JAVASCRIPT OBFUSCATOR
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="font-mono text-[0.72rem] text-[var(--ink-soft)] uppercase tracking-wider">
              SPEC-R34 // MULTI-LAYER AST TRANSFORMATIONS // CONTROL FLOW FLATTENING // STRING CIPHER
            </span>
            <span className="spec-badge ok">ECMA-262 COMPLIANT</span>
            <span
              className={`spec-badge ${
                coverageScore >= 8.5 ? 'ok' : coverageScore >= 6.0 ? 'warn' : 'accent'
              }`}
            >
              COVERAGE INDEX: {coverageScore.toFixed(1)}/10
            </span>
          </div>
        </div>

        {/* Right: Technical Badges & Physical Wall Light Switch */}
        <div className="flex items-center gap-5 self-start md:self-end">
          <div className="hidden lg:flex flex-col text-right font-mono text-[0.68rem] text-[var(--ink-faint)] leading-tight">
            <span>DRAWING NO. 2026-AST-OBF</span>
            <span>DIGEST: WEB CRYPTO SHA-256</span>
            <span className="text-[var(--ink-soft)] font-semibold">{coverageRating}</span>
          </div>

          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
