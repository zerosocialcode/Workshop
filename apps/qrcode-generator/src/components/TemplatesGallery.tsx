import React from 'react';
import { QRStyleConfig } from '../types';
import { PRESET_THEMES } from '../utils/presets';

interface TemplatesGalleryProps {
  currentStyle: QRStyleConfig;
  onApplyPreset: (presetConfig: Partial<QRStyleConfig>) => void;
  onNavigateToStudio: () => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({
  onApplyPreset,
  onNavigateToStudio,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--line-soft)] pb-3">
        <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--ink)]">
          ARCHITECTURAL STYLE SHEETS & THEME PRESETS
        </h3>
        <p className="font-mono-code text-xs text-[var(--ink-soft)] mt-0.5">
          Select any verified design specification sheet to configure matrix geometries, optics, and framework banners instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRESET_THEMES.map((preset) => {
          const cfg = preset.config;
          const bg = cfg.backgroundColor || '#ffffff';
          const fg = cfg.dotColor?.color1 || '#000000';
          const fg2 = cfg.dotColor?.color2 || fg;
          const isGradient = cfg.dotColor?.type !== 'none';

          return (
            <div
              key={preset.id}
              className="spec-card p-4 flex flex-col justify-between"
            >
              <div>
                {/* Visual Preview Swatch */}
                <div
                  className="w-full h-32 rounded border border-[var(--line)] flex flex-col items-center justify-center p-3 relative overflow-hidden mb-3"
                  style={{
                    backgroundColor: bg,
                  }}
                >
                  {/* Decorative QR-like geometric block */}
                  <div className="w-16 h-16 rounded relative flex items-center justify-center border border-dashed border-black/20">
                    <div
                      className="w-10 h-10 rounded"
                      style={{
                        background: isGradient
                          ? `linear-gradient(45deg, ${fg}, ${fg2})`
                          : fg,
                      }}
                    />
                  </div>

                  {cfg.frame?.type && cfg.frame.type !== 'none' && (
                    <div
                      className="mt-2 text-[8px] font-mono-code font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: cfg.frame.bgColor || fg,
                        color: cfg.frame.textColor || '#ffffff',
                      }}
                    >
                      {cfg.frame.text || 'SPEC // SCAN'}
                    </div>
                  )}

                  {preset.badge && (
                    <span className="absolute top-2 right-2 font-mono-code text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
                      {preset.badge}
                    </span>
                  )}
                </div>

                <h4 className="font-display text-lg font-bold text-[var(--ink)] uppercase">
                  {preset.name}
                </h4>
                <p className="font-mono-code text-xs text-[var(--ink-soft)] mt-1 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onApplyPreset(preset.config);
                  onNavigateToStudio();
                }}
                className="btn-ghost w-full mt-4"
              >
                [ APPLY SPECIFICATION SHEET ]
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
