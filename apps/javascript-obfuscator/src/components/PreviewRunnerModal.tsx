/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { executeInPreviewRunner } from '../lib/sandboxRunner';
import { runDeobfuscationResistanceAudit } from '../lib/obfuscationEngine';
import { ObfuscationOptions, PreviewExecutionResult, ResistanceReport } from '../types';

interface PreviewRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  obfuscatedCode: string;
  options: ObfuscationOptions;
  onVerifiedDownload?: () => void;
}

export function PreviewRunnerModal({
  isOpen,
  onClose,
  originalCode,
  obfuscatedCode,
  options,
  onVerifiedDownload,
}: PreviewRunnerModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'resistance'>('preview');
  const [runnerResult, setRunnerResult] = useState<PreviewExecutionResult | null>(null);
  const [resistanceReport, setResistanceReport] = useState<ResistanceReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeSuite = async () => {
    setIsRunning(true);
    try {
      // 1. Run empirical resistance audit
      const audit = runDeobfuscationResistanceAudit(originalCode, obfuscatedCode, options);
      setResistanceReport(audit);

      // 2. Run isolated iframe runtime preview
      const res = await executeInPreviewRunner(originalCode, obfuscatedCode);
      setRunnerResult(res);
    } catch (err: any) {
      setRunnerResult({
        status: 'failed',
        originalLogs: [],
        obfuscatedLogs: [],
        originalResult: 'EXECUTION_FAILED',
        obfuscatedResult: 'EXECUTION_FAILED',
        originalTimeMs: 0,
        obfuscatedTimeMs: 0,
        error: err?.message || 'Execution error',
        isEquivalent: false,
        isolated: true,
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && originalCode && obfuscatedCode) {
      executeSuite();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-[var(--paper)] border-2 border-[var(--ink)] rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b-2 border-[var(--ink)] bg-[var(--bg-deep)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="spec-eyebrow">SANDBOXED PREVIEW RUNNER & HEURISTIC TRANSFORM CHECK</span>
            <h2 className="font-mono text-base font-bold text-[var(--ink)]">
              RUNTIME EQUIVALENCE & STATIC TRANSFORM HEURISTIC SUITE
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={executeSuite}
              disabled={isRunning}
              className="btn-primary text-[0.7rem] py-1.5 px-3"
            >
              {isRunning ? '[RUNNING IN ISOLATED IFRAME...]' : '[RE-RUN ALL TESTS]'}
            </button>
            <button
              onClick={onClose}
              className="btn-ghost text-[0.7rem] py-1.5 px-3 hover:border-[var(--fail)] hover:text-[var(--fail)]"
            >
              [CLOSE]
            </button>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="px-4 py-2.5 bg-[var(--bg-deep)] border-b border-[var(--line)] font-mono text-[0.66rem] text-[var(--ink-soft)] flex items-start gap-2">
          <span className="spec-badge warn font-bold shrink-0">SECURITY & HEURISTIC NOTICE</span>
          <span>
            <strong>Static Inspection Heuristic:</strong> The checks below perform static AST pattern matching and string extraction tests against the compiled output to verify that obfuscation layers (string arrays, symbol mangling, CFF dispatchers) are physically present. They do not simulate external dynamic deobfuscation toolchains. Obfuscation raises reverse-engineering cost; it does not replace server-side security.
          </span>
        </div>

        {/* Tab Selector */}
        <div className="px-4 pt-2 bg-[var(--paper)] border-b border-[var(--line)] flex items-center gap-3 font-mono text-[0.72rem]">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'preview'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]'
            }`}
          >
            01 // ISOLATED RUNTIME PREVIEW ({runnerResult?.isEquivalent ? 'PASS' : 'CHECKING'})
          </button>
          <button
            onClick={() => setActiveTab('resistance')}
            className={`py-2 px-3 border-b-2 font-bold transition-all ${
              activeTab === 'resistance'
                ? 'border-[var(--accent)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-faint)] hover:text-[var(--ink)]'
            }`}
          >
            02 // HEURISTIC RESISTANCE CHECK ({resistanceReport ? `${resistanceReport.overallScore}% ${resistanceReport.grade}` : 'STANDBY'})
          </button>
        </div>

        {/* Tab 1: Isolated Preview Runner */}
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
            {/* Status Strip */}
            <div className="p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px] flex flex-wrap items-center justify-between gap-2 font-mono text-[0.72rem]">
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-soft)] font-semibold">ROUND-TRIP CORRECTNESS:</span>
                {isRunning ? (
                  <span className="spec-badge warn animate-pulse">EXECUTING IN SANDBOXED IFRAME...</span>
                ) : runnerResult?.isEquivalent ? (
                  <span className="spec-badge ok font-bold">100% FUNCTIONAL EQUIVALENCE VERIFIED</span>
                ) : runnerResult?.status === 'timeout' ? (
                  <span className="spec-badge warn font-bold">TIMEOUT (DEBUG PROTECTION OR SLOW DISPATCH)</span>
                ) : runnerResult?.status === 'mismatch' ? (
                  <span className="spec-badge fail font-bold">MISMATCH // RETURN VALUE OR LOG DIVERGENCE</span>
                ) : (
                  <span className="spec-badge fail font-bold">EXECUTION FAILED</span>
                )}
              </div>

              {runnerResult && (
                <div className="flex items-center gap-3 text-[0.68rem] text-[var(--ink-soft)]">
                  <span>
                    Original VM: <strong>{runnerResult.originalTimeMs}ms</strong>
                  </span>
                  <span>
                    Obfuscated VM: <strong>{runnerResult.obfuscatedTimeMs}ms</strong>
                  </span>
                  <span className="spec-badge ok text-[0.6rem]">SANDBOX: ALLOW-SCRIPTS</span>
                </div>
              )}
            </div>

            {/* Error banner if any */}
            {runnerResult?.error && (
              <div className="p-3 bg-[var(--bg-deep)] border border-[var(--fail)] rounded-[3px] font-mono text-[0.72rem] text-[var(--fail)]">
                <strong>ERROR OUTPUT:</strong> {runnerResult.error}
              </div>
            )}

            {/* Side-by-side Terminal outputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              {/* Original Terminal */}
              <div className="flex flex-col border border-[var(--ink)] bg-[var(--bg-deep)] rounded-[3px] overflow-hidden">
                <div className="p-2 bg-[var(--bg)] border-b border-[var(--line)] flex justify-between items-center text-[0.68rem]">
                  <span className="font-bold text-[var(--ink)]">SOURCE CODE RUNTIME</span>
                  <span className="spec-badge ok">ORIGINAL</span>
                </div>

                <div className="p-3 flex-1 overflow-auto max-h-64 space-y-2 text-[0.72rem]">
                  <div>
                    <span className="text-[var(--ink-faint)] text-[0.62rem] uppercase block">
                      RETURN VALUE:
                    </span>
                    <div className="p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] text-[var(--ink)] font-semibold break-all">
                      {runnerResult?.originalResult || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--ink-faint)] text-[0.62rem] uppercase block">
                      STDOUT / LOGS:
                    </span>
                    <div className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] text-[var(--ink)] min-h-[90px] max-h-40 overflow-y-auto space-y-1">
                      {runnerResult?.originalLogs && runnerResult.originalLogs.length > 0 ? (
                        runnerResult.originalLogs.map((l, i) => (
                          <div key={i} className="leading-tight break-all">
                            <span className="text-[var(--ink-faint)] mr-1">&gt;</span>
                            {l}
                          </div>
                        ))
                      ) : (
                        <span className="text-[var(--ink-faint)] italic">No console logs emitted</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Obfuscated Terminal */}
              <div className="flex flex-col border border-[var(--ink)] bg-[var(--bg-deep)] rounded-[3px] overflow-hidden">
                <div className="p-2 bg-[var(--bg)] border-b border-[var(--line)] flex justify-between items-center text-[0.68rem]">
                  <span className="font-bold text-[var(--ink)]">OBFUSCATED CODE RUNTIME</span>
                  <span className="spec-badge accent">PROTECTED</span>
                </div>

                <div className="p-3 flex-1 overflow-auto max-h-64 space-y-2 text-[0.72rem]">
                  <div>
                    <span className="text-[var(--ink-faint)] text-[0.62rem] uppercase block">
                      RETURN VALUE:
                    </span>
                    <div className="p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] text-[var(--ink)] font-semibold break-all">
                      {runnerResult?.obfuscatedResult || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[var(--ink-faint)] text-[0.62rem] uppercase block">
                      STDOUT / LOGS:
                    </span>
                    <div className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] text-[var(--ink)] min-h-[90px] max-h-40 overflow-y-auto space-y-1">
                      {runnerResult?.obfuscatedLogs && runnerResult.obfuscatedLogs.length > 0 ? (
                        runnerResult.obfuscatedLogs.map((l, i) => (
                          <div key={i} className="leading-tight break-all">
                            <span className="text-[var(--ink-faint)] mr-1">&gt;</span>
                            {l}
                          </div>
                        ))
                      ) : (
                        <span className="text-[var(--ink-faint)] italic">No console logs emitted</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deobfuscation Resistance Audit */}
        {activeTab === 'resistance' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
            {resistanceReport && (
              <>
                {/* Score Summary Card */}
                <div className="p-4 bg-[var(--bg-deep)] border-2 border-[var(--ink)] rounded-[3px] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="spec-eyebrow">STATIC TRANSFORM HEURISTIC RATING</span>
                    <div className="text-xl sm:text-2xl font-bold text-[var(--ink)] flex items-center gap-3">
                      <span>{resistanceReport.overallScore}% RESISTANCE INDEX</span>
                      <span className={`spec-badge ${resistanceReport.grade === 'TIER-A' ? 'ok' : resistanceReport.grade === 'TIER-B' ? 'accent' : 'warn'}`}>
                        {resistanceReport.grade}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[0.68rem]">
                    <div className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-[2px]">
                      <span className="text-[var(--ink-faint)] text-[0.58rem] uppercase block">STRINGS EXTRACTABLE</span>
                      <span className="font-bold text-[var(--ink)]">
                        {resistanceReport.originalStringsExtracted} / {resistanceReport.totalOriginalStrings}
                      </span>
                    </div>
                    <div className="p-2 bg-[var(--paper)] border border-[var(--line)] rounded-[2px]">
                      <span className="text-[var(--ink-faint)] text-[0.58rem] uppercase block">UNPACKER RESISTANCE</span>
                      <span className="font-bold text-[var(--ok)]">{resistanceReport.restringerResistance}</span>
                    </div>
                  </div>
                </div>

                {/* Test Items Grid */}
                <div className="space-y-2.5">
                  <span className="spec-eyebrow">STATIC TRANSFORM HEURISTIC VECTOR EVALUATION</span>
                  {resistanceReport.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-[3px] space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`spec-badge ${
                              item.status === 'PASSED'
                                ? 'ok'
                                : item.status === 'WARNING'
                                ? 'warn'
                                : 'fail'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="font-bold text-[0.75rem] text-[var(--ink)]">{item.name}</span>
                        </div>
                        <span className="text-[0.62rem] text-[var(--ink-faint)]">
                          VECTOR: {item.targetVector}
                        </span>
                      </div>
                      <p className="text-[0.68rem] text-[var(--ink-soft)]">{item.description}</p>
                      <div className="p-2 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[2px] text-[0.68rem] text-[var(--ink)]">
                        <strong>FINDINGS:</strong> {item.findings}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-[var(--bg-deep)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 font-mono text-[0.68rem] text-[var(--ink-soft)]">
          <div className="flex items-center gap-2">
            <span>ISOLATION: SECURE SANDBOXED IFRAME</span>
            <span>//</span>
            <span>NO DOM / COOKIE EXPOSURE</span>
          </div>

          <div className="flex items-center gap-2">
            {onVerifiedDownload && (
              <button
                onClick={onVerifiedDownload}
                className="btn-primary text-[0.7rem] py-1.5 px-3"
              >
                [DOWNLOAD VERIFIED CODE]
              </button>
            )}
            <button onClick={onClose} className="btn-secondary text-[0.7rem] py-1.5 px-3">
              [CLOSE]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
