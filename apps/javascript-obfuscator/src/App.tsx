/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ObfuscationOptions, ObfuscationPreset, ObfuscationMetrics, AstPassStage } from './types';
import { PRESET_CONFIGS, SAMPLE_SCRIPTS, generateRandomSeed } from './lib/presets';
import { obfuscateJavaScript, computeCoverageScore } from './lib/obfuscationEngine';
import { TitleBlock } from './components/TitleBlock';
import { EditorPane } from './components/EditorPane';
import { OutputPane } from './components/OutputPane';
import { ConfigPanel } from './components/ConfigPanel';
import { AstPipelineViewer } from './components/AstPipelineViewer';
import { PreviewRunnerModal } from './components/PreviewRunnerModal';
import { RegistrationMarks } from './components/RegistrationMarks';

export default function App() {
  const [sourceCode, setSourceCode] = useState<string>(SAMPLE_SCRIPTS[0].code);
  const [activePreset, setActivePreset] = useState<ObfuscationPreset>('industrial');
  const [options, setOptions] = useState<ObfuscationOptions>(PRESET_CONFIGS.industrial);
  const [obfuscatedCode, setObfuscatedCode] = useState<string>('');
  const [metrics, setMetrics] = useState<ObfuscationMetrics | null>(null);
  const [astStages, setAstStages] = useState<AstPassStage[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const debounceTimerRef = useRef<any>(null);

  const { score: currentCoverageScore, rating: currentCoverageRating } = computeCoverageScore(options);

  const handleRunObfuscation = useCallback(async () => {
    if (!sourceCode.trim()) {
      setObfuscatedCode('');
      setMetrics(null);
      setAstStages([]);
      setError(undefined);
      return;
    }

    setIsProcessing(true);
    setError(undefined);

    try {
      const res = await obfuscateJavaScript(sourceCode, options);
      if (res.error) {
        setError(res.error);
        setObfuscatedCode('');
      } else {
        setObfuscatedCode(res.obfuscatedCode);
        setMetrics(res.metrics);
        setError(undefined);
      }
      setAstStages(res.stages);
    } catch (err: any) {
      setError(err?.message || 'Transformation failed');
    } finally {
      setIsProcessing(false);
    }
  }, [sourceCode, options]);

  // Handle Preset Selection
  const handlePresetSelect = (preset: ObfuscationPreset) => {
    setActivePreset(preset);
    const newOptions = PRESET_CONFIGS[preset];
    setOptions(newOptions);
  };

  // Palette action: land directly on a specific preset via ?preset=
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('preset');
    const validPresets: ObfuscationPreset[] = ['draft', 'balanced', 'industrial', 'max_armor'];
    if (requested && (validPresets as string[]).includes(requested)) {
      handlePresetSelect(requested as ObfuscationPreset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Custom Options Change
  const handleOptionsChange = (newOptions: ObfuscationOptions) => {
    setOptions(newOptions);
  };

  const handleRandomizeSeed = () => {
    setOptions((prev) => ({
      ...prev,
      seed: generateRandomSeed(),
    }));
  };

  // Debounced auto-compilation when code or options change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleRunObfuscation();
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [sourceCode, options]);

  const handleVerifiedDownload = () => {
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

  return (
    <div className="relative min-h-screen text-[var(--ink)] p-4 sm:p-6 lg:p-8 flex flex-col justify-between max-w-[1600px] mx-auto">
      {/* Registration Marks in 4 Corners */}
      <RegistrationMarks />

      <div className="space-y-6">
        {/* Title Block Header */}
        <TitleBlock
          coverageRating={currentCoverageRating}
          coverageScore={currentCoverageScore}
          engineActive={!isProcessing}
        />

        {/* Security Disclaimer Banner */}
        <div className="p-3 bg-[var(--bg-deep)] border border-[var(--line)] rounded-[3px] font-mono text-[0.7rem] text-[var(--ink-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2">
            <span className="spec-badge accent shrink-0">SECURITY REALITY CHECK</span>
            <span>
              Obfuscation raises the reverse-engineering barrier by increasing AST entropy & complexity.
              It does <strong>not</strong> encrypt code at rest and <strong>cannot</strong> make client-side API secrets safe against inspection.
            </span>
          </div>
          <button
            onClick={() => setIsPreviewOpen(true)}
            disabled={!obfuscatedCode}
            className="btn-ghost text-[0.65rem] py-0.5 px-2 text-[var(--ink)] whitespace-nowrap self-start sm:self-auto"
          >
            [AUDIT RESISTANCE]
          </button>
        </div>

        {/* Main Work Surface: 2-Column Code Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Source Code Editor */}
          <div className="h-full">
            <EditorPane
              code={sourceCode}
              onChange={setSourceCode}
              onObfuscate={handleRunObfuscation}
              isProcessing={isProcessing}
              seed={options.seed}
              onRandomizeSeed={handleRandomizeSeed}
            />
          </div>

          {/* Obfuscated Output */}
          <div className="h-full">
            <OutputPane
              obfuscatedCode={obfuscatedCode}
              metrics={metrics}
              error={error}
              onOpenPreviewRunner={() => setIsPreviewOpen(true)}
            />
          </div>
        </div>

        {/* Granular AST Configuration Panel */}
        <ConfigPanel
          options={options}
          activePreset={activePreset}
          onOptionsChange={handleOptionsChange}
          onPresetSelect={handlePresetSelect}
        />

        {/* Step-by-Step Multi-Pass AST Inspector */}
        {astStages.length > 0 && <AstPipelineViewer stages={astStages} />}
      </div>

      {/* Sandboxed Preview Runner & Empirical Resistance Audit Modal */}
      <PreviewRunnerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        originalCode={sourceCode}
        obfuscatedCode={obfuscatedCode}
        options={options}
        onVerifiedDownload={handleVerifiedDownload}
      />

      {/* Technical Drawing Footer */}
      <footer className="pt-8 pb-4 mt-8 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[0.68rem] text-[var(--ink-faint)] select-none">
        <div className="flex items-center gap-3">
          <span>SPEC SHEET 01/01</span>
          <span>//</span>
          <span>ECMASCRIPT 2026</span>
          <span>//</span>
          <span className="text-[var(--ink-soft)]">WORKSHOP DRAFTING LAB</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ink-soft)]">
          <span>AUTHENTICATED AST ENGINE</span>
          <span className="spec-badge ok">BUILD VERIFIED</span>
        </div>
      </footer>
    </div>
  );
}
