/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AstPassStage } from '../types';

interface AstPipelineViewerProps {
  stages: AstPassStage[];
}

export function AstPipelineViewer({ stages }: AstPipelineViewerProps) {
  const [selectedPassId, setSelectedPassId] = useState<string>(stages[0]?.id || 'pass_1');

  const currentStage = stages.find((s) => s.id === selectedPassId) || stages[0];

  return (
    <div className="spec-card p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[var(--line)] gap-2">
        <div>
          <span className="spec-eyebrow">DIAGNOSTIC PIPELINE // MULTI-PASS AST INSPECTOR</span>
          <h2 className="font-mono text-sm font-bold text-[var(--ink)] tracking-wider">
            STEP-BY-STEP TRANSFORMATION GRAPH
          </h2>
        </div>
        <span className="spec-badge ok">5-STAGE COMPILER VERIFIER</span>
      </div>

      {/* Stage Selector Horizontal Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono">
        {stages.map((stage, idx) => {
          const isSelected = stage.id === selectedPassId;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedPassId(stage.id)}
              className={`p-2.5 text-left border rounded-[3px] transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] ring-2 ring-[var(--accent)]'
                  : 'bg-[var(--bg-deep)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--ink)]'
              }`}
            >
              <div className="flex items-center justify-between text-[0.6rem] text-[var(--ink-faint)]">
                <span>PASS 0{idx + 1}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stage.active ? 'bg-[var(--ok)]' : 'bg-[var(--ink-faint)]'
                  }`}
                />
              </div>
              <div className="text-[0.68rem] font-bold mt-1 tracking-tight truncate">
                {stage.codeName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Pass Details & Intermediate AST Code View */}
      {currentStage && (
        <div className="p-3 bg-[var(--bg-deep)] border border-[var(--ink)] rounded-[3px] space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[var(--line)] gap-2">
            <div>
              <div className="text-[0.8rem] font-bold text-[var(--ink)]">{currentStage.name}</div>
              <div className="text-[0.68rem] text-[var(--ink-soft)] mt-0.5">
                {currentStage.description}
              </div>
            </div>
            <span className={`spec-badge ${currentStage.active ? 'ok' : 'warn'}`}>
              {currentStage.active ? 'TRANSFORM PASS ACTIVE' : 'BYPASSED IN PROFILE'}
            </span>
          </div>

          <div className="relative max-h-64 overflow-auto bg-[var(--paper)] border border-[var(--line)] p-3 rounded-[2px]">
            <pre className="text-[0.74rem] leading-5 text-[var(--ink)] whitespace-pre-wrap break-all font-mono">
              {currentStage.sampleCodeSnippet || '// Pass completed with no residual mutations'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
