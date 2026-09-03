/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ObfuscationMetrics } from '../types';

interface OutputPaneProps {
  obfuscatedCode: string;
  metrics: ObfuscationMetrics | null;
  error?: string;
  onOpenPreviewRunner: () => void;
}

export function OutputPane({
  obfuscatedCode,
  metrics,
  error,
  onOpenPreviewRunner,
}: OutputPaneProps) {
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [isFormatted, setIsFormatted] = useState(false);

  const handleCopy = () => {
    if (!obfuscatedCode) return;
    navigator.clipboard.writeText(obfuscatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = () => {
    if (!metrics?.sha256Checksum) return;
    navigator.clipboard.writeText(metrics.sha256Checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownload = () => {
    if (!obfuscatedCode) return;
    const blob = new Blob([obfuscatedCode], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protected_script_${metrics?.sha256Checksum.slice(0, 8) || 'obf'}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple safe formatter for human inspection without destroying obfuscation
  const getDisplayCode = () => {
    if (!obfuscatedCode) return '';
    if (!isFormatted) return obfuscatedCode;
    try {
      return obfuscatedCode
        .replace(/;/g, ';\n')
        .replace(/\{/g, '{\n  ')
        .replace(/\}/g, '\n}\n');
    } catch {
      return obfuscatedCode;
    }
  };

  const displayCode = getDisplayCode();
  const lineCount = displayCode ? displayCode.split('\n').length : 0;

  return (
    <div className="spec-card p-4 flex flex-col h-full">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[var(--line)] gap-2">
        <div className="flex items-center gap-2">
          <span className="spec-eyebrow">OBFUSCATED OUTPUT // TRANSFORMED BINARY</span>
          {metrics && (
            <span className="spec-badge ok">
              COVERAGE INDEX {metrics.coverageScore.toFixed(1)}/10
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Beautify Toggle */}
          <button
            onClick={() => setIsFormatted(!isFormatted)}
            disabled={!obfuscatedCode}
            className="btn-ghost text-[0.68rem] py-1 px-2.5"
            title="Toggle linebreaks for human inspection"
          >
            {isFormatted ? '[VIEW COMPACT]' : '[INSPECT FORMAT]'}
          </button>

          {/* Preview Runner & Heuristic Checks Button */}
          <button
            onClick={onOpenPreviewRunner}
            disabled={!obfuscatedCode}
            className="btn-secondary text-[0.68rem] py-1 px-2.5"
            title="Execute original vs obfuscated in isolated sandbox and run heuristic transform checks"
          >
            [PREVIEW RUNNER & CHECKS]
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!obfuscatedCode}
            className="btn-ghost text-[0.68rem] py-1 px-2.5"
          >
            {copied ? '[COPIED TO CLIPBOARD]' : '[COPY CODE]'}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!obfuscatedCode}
            className="btn-ghost text-[0.68rem] py-1 px-2.5"
          >
            [EXPORT .JS]
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative flex-1 flex min-h-[380px] bg-[var(--bg-deep)] border border-[var(--ink)] rounded-[3px] overflow-hidden">
        {error ? (
          <div className="w-full h-full p-5 font-mono text-[0.78rem] text-[var(--fail)] bg-[var(--bg-deep)] flex flex-col justify-center items-start space-y-2">
            <span className="spec-badge fail font-bold">PARSER / TRANSFORM ERROR</span>
            <p className="font-semibold">{error}</p>
            <p className="text-[var(--ink-soft)] text-[0.7rem]">
              Check syntax or adjust reserved global identifiers in configuration.
            </p>
          </div>
        ) : obfuscatedCode ? (
          <>
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

            {/* Read-only Text */}
            <div className="relative flex-1 overflow-auto">
              <pre className="p-3 font-mono text-[0.76rem] leading-5 text-[var(--ink)] whitespace-pre-wrap break-all select-all">
                {displayCode}
              </pre>
            </div>
          </>
        ) : (
          <div className="w-full h-full p-6 font-mono text-[0.75rem] text-[var(--ink-faint)] flex flex-col items-center justify-center text-center space-y-2">
            <span className="spec-eyebrow">READY FOR TRANSFORMATION</span>
            <p className="max-w-md text-[var(--ink-soft)]">
              Input source code on the left and click <strong>[TRANSLATE & OBFUSCATE]</strong> to execute the multi-pass AST compiler.
            </p>
          </div>
        )}
      </div>

      {/* Telemetry Spec-Sheet Matrix */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-[var(--line)] font-mono text-[0.66rem]">
          <div className="p-2 border border-[var(--line)] rounded-[2px] bg-[var(--paper)]">
            <div className="text-[var(--ink-faint)] text-[0.6rem] uppercase">SHANNON ENTROPY</div>
            <div className="text-[var(--ink)] font-bold text-[0.8rem]">
              {metrics.obfuscatedEntropy.toFixed(2)}{' '}
              <span className="text-[var(--ok)] text-[0.65rem]">bits/char</span>
            </div>
            <div className="text-[var(--ink-soft)] text-[0.58rem]">
              Orig: {metrics.originalEntropy.toFixed(2)} bits
            </div>
          </div>

          <div className="p-2 border border-[var(--line)] rounded-[2px] bg-[var(--paper)]">
            <div className="text-[var(--ink-faint)] text-[0.6rem] uppercase">OUTPUT EXPANSION</div>
            <div className="text-[var(--ink)] font-bold text-[0.8rem]">
              {(metrics.obfuscatedSize / 1024).toFixed(2)} KB{' '}
              <span className="text-[var(--warn)] text-[0.65rem]">
                ({metrics.sizeRatio > 0 ? `+${metrics.sizeRatio}%` : `${metrics.sizeRatio}%`})
              </span>
            </div>
            <div className="text-[var(--ink-soft)] text-[0.58rem]">
              Orig: {(metrics.originalSize / 1024).toFixed(2)} KB
            </div>
          </div>

          <div className="p-2 border border-[var(--line)] rounded-[2px] bg-[var(--paper)]">
            <div className="text-[var(--ink-faint)] text-[0.6rem] uppercase">TRANSFORMATION TIME</div>
            <div className="text-[var(--ink)] font-bold text-[0.8rem]">
              {metrics.transformationDurationMs} ms
            </div>
            <div className="text-[var(--ink-soft)] text-[0.58rem]">
              CFF Dispatches: {metrics.cffBlocksCount}
            </div>
          </div>

          <div className="p-2 border border-[var(--line)] rounded-[2px] bg-[var(--paper)]">
            <div className="flex items-center justify-between text-[0.6rem] uppercase text-[var(--ink-faint)]">
              <span>SHA-256 (WEB CRYPTO)</span>
              <button
                onClick={handleCopyHash}
                className="text-[var(--ink-soft)] hover:text-[var(--ink)] font-mono text-[0.55rem]"
              >
                {copiedHash ? '[COPIED]' : '[COPY]'}
              </button>
            </div>
            <div
              className="text-[var(--ink)] font-bold text-[0.72rem] truncate"
              title={`Full SHA-256: ${metrics.sha256Checksum}`}
            >
              {metrics.sha256Checksum.slice(0, 12)}...
            </div>
            <div className="text-[var(--ok)] text-[0.58rem]">GENUINE CRYPTO DIGEST</div>
          </div>
        </div>
      )}
    </div>
  );
}
