import React, { useState } from 'react';
import {
  QRStyleConfig,
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel,
  FrameType,
} from '../types';
import { PRESET_ICONS, svgPathToDataUrl } from '../utils/presets';
import { calculateContrastRatio, getContrastGrade } from '../utils/contrast';

interface StylingStudioProps {
  style: QRStyleConfig;
  onChange: (updater: (prev: QRStyleConfig) => QRStyleConfig) => void;
}

export const StylingStudio: React.FC<StylingStudioProps> = ({ style, onChange }) => {
  const [subTab, setSubTab] = useState<'shapes' | 'colors' | 'logo' | 'frame' | 'calibration'>('shapes');

  const contrast = calculateContrastRatio(
    style.dotColor.color1,
    style.backgroundColor
  );
  const grade = getContrastGrade(contrast);

  const dotPatterns: { id: DotType; label: string; preview: string }[] = [
    { id: 'square', label: 'Square Matrix', preview: '■' },
    { id: 'rounded', label: 'Chamfered Soft', preview: '●' },
    { id: 'extra-rounded', label: 'Pill Spheroid', preview: '●' },
    { id: 'dots', label: 'Circular Pins', preview: '●' },
    { id: 'classy', label: 'Industrial Diamond', preview: '◆' },
    { id: 'classy-rounded', label: 'Filleted Diamond', preview: '◈' },
  ];

  const eyePatterns: { id: CornerSquareType; label: string }[] = [
    { id: 'square', label: 'Square Orthogonal' },
    { id: 'dot', label: 'Circular Eye' },
    { id: 'extra-rounded', label: 'Squircle Precision' },
    { id: 'classy', label: 'Beveled Angle' },
  ];

  const eyeDots: { id: CornerDotType; label: string }[] = [
    { id: 'square', label: 'Square Core' },
    { id: 'dot', label: 'Circular Core' },
  ];

  const frames: { id: FrameType; label: string }[] = [
    { id: 'none', label: 'None (Raw Matrix)' },
    { id: 'bottom-banner', label: 'Footer Tag Banner' },
    { id: 'top-banner', label: 'Header Index Banner' },
    { id: 'badge', label: 'Technical Spec Stamp' },
    { id: 'polaroid', label: 'Document Sheet Margin' },
    { id: 'pill', label: 'Border Pill Callout' },
  ];

  const errorLevels: { level: ErrorCorrectionLevel; pct: string; desc: string }[] = [
    { level: 'L', pct: '7%', desc: 'Low density, high data capacity' },
    { level: 'M', pct: '15%', desc: 'Standard production baseline' },
    { level: 'Q', pct: '25%', desc: 'High redundancy for logos' },
    { level: 'H', pct: '30%', desc: 'Maximum durability for print' },
  ];

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onChange((prev) => ({
        ...prev,
        logo: {
          ...prev.logo,
          src: event.target?.result as string,
          presetIcon: null,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="spec-card p-4 space-y-4">
      {/* Studio Sub-Tab Bar */}
      <div className="flex bg-[var(--bg-deep)] p-1 rounded border border-[var(--line)] overflow-x-auto scrollbar-none">
        {[
          { id: 'shapes', label: '01/SHAPES' },
          { id: 'colors', label: '02/CHROMATICS' },
          { id: 'logo', label: '03/EMBLEM' },
          { id: 'frame', label: '04/FRAMEWORK' },
          { id: 'calibration', label: '05/OPTICS' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded text-xs font-mono-code font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 01: SHAPES & CORNERS */}
      {subTab === 'shapes' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
              MATRIX DATA CELL GEOMETRY
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dotPatterns.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, dotType: p.id }))}
                  className={`p-2.5 rounded border text-left transition cursor-pointer ${
                    style.dotType === p.id
                      ? 'bg-[var(--paper)] border-[var(--accent)] shadow-sm'
                      : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)]'
                  }`}
                >
                  <span className="font-mono-code text-xs font-bold text-[var(--ink)] block">
                    {p.label}
                  </span>
                  <span className="font-mono-code text-[9px] text-[var(--ink-faint)]">
                    STYLE_REF::{p.id.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--line-soft)] pt-3">
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
                POSITION RETICLE OUTER RING
              </label>
              <div className="space-y-1.5">
                {eyePatterns.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, cornerSquareType: e.id }))}
                    className={`w-full p-2 rounded border text-left transition cursor-pointer font-mono-code text-xs font-semibold ${
                      style.cornerSquareType === e.id
                        ? 'bg-[var(--paper)] border-[var(--accent)] text-[var(--ink)]'
                        : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
                POSITION RETICLE INNER CORE
              </label>
              <div className="space-y-1.5">
                {eyeDots.map((ed) => (
                  <button
                    key={ed.id}
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, cornerDotType: ed.id }))}
                    className={`w-full p-2 rounded border text-left transition cursor-pointer font-mono-code text-xs font-semibold ${
                      style.cornerDotType === ed.id
                        ? 'bg-[var(--paper)] border-[var(--accent)] text-[var(--ink)]'
                        : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {ed.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 02: CHROMATICS & CONTRAST */}
      {subTab === 'colors' && (
        <div className="space-y-4">
          {/* Contrast Diagnostic Pill */}
          <div className="flex items-center justify-between p-2.5 rounded border border-[var(--line)] bg-[var(--bg-deep)]">
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-xs font-bold text-[var(--ink)]">
                CONTRAST RATIO: {contrast.toFixed(2)}:1
              </span>
              <span
                className={`badge-tag ${
                  grade.isAcceptable ? 'badge-ok' : 'badge-fail'
                }`}
              >
                {grade.label}
              </span>
            </div>
            <span className="font-mono-code text-[10px] text-[var(--ink-soft)]">
              ISO/IEC 18004 STANDARD
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dot Ink Color */}
            <div className="space-y-2">
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                PRIMARY MATRIX INK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.dotColor.color1}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      dotColor: { ...prev.dotColor, color1: e.target.value },
                    }))
                  }
                  className="w-9 h-9 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={style.dotColor.color1}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      dotColor: { ...prev.dotColor, color1: e.target.value },
                    }))
                  }
                  className="input-spec text-xs py-1.5 flex-1 font-mono uppercase"
                />
              </div>

              {/* Gradient Toggle */}
              <div className="pt-2">
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                  GRADIENT MODE
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['none', 'linear', 'radial'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          dotColor: { ...prev.dotColor, type: t },
                        }))
                      }
                      className={`py-1 text-[10px] font-mono-code font-bold rounded border transition cursor-pointer uppercase ${
                        style.dotColor.type === t
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                          : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {style.dotColor.type !== 'none' && (
                <div className="space-y-2 pt-1">
                  <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                    SECONDARY GRADIENT STOP
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.dotColor.color2 || '#b8441f'}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          dotColor: { ...prev.dotColor, color2: e.target.value },
                        }))
                      }
                      className="w-9 h-9 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={style.dotColor.color2 || '#b8441f'}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          dotColor: { ...prev.dotColor, color2: e.target.value },
                        }))
                      }
                      className="input-spec text-xs py-1.5 flex-1 font-mono uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Background Paper Tone */}
            <div className="space-y-2">
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                PAPER SHEET / BACKGROUND
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.backgroundColor}
                  disabled={style.isTransparent}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="w-9 h-9 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent disabled:opacity-30"
                />
                <input
                  type="text"
                  value={style.isTransparent ? 'TRANSPARENT' : style.backgroundColor}
                  disabled={style.isTransparent}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="input-spec text-xs py-1.5 flex-1 font-mono uppercase disabled:opacity-50"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none font-mono-code text-xs text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={style.isTransparent}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        isTransparent: e.target.checked,
                      }))
                    }
                    className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
                  />
                  <span>ALPHA TRANSPARENT (PNG ONLY)</span>
                </label>
              </div>

              {/* Reticle Matching */}
              <div className="pt-3 border-t border-[var(--line-soft)] space-y-2">
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                  RETICLE EYE ACCENT INK
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.cornerSquareColor || style.dotColor.color1}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        cornerSquareColor: e.target.value,
                        cornerDotColor: e.target.value,
                      }))
                    }
                    className="w-9 h-9 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono-code text-xs text-[var(--ink-soft)]">
                    Match / Override position eyes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 03: EMBLEM / LOGO WATERMARK */}
      {subTab === 'logo' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
              TECHNICAL EMBLEM PRESETS
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_ICONS.map((icon) => {
                const isSelected = style.logo.presetIcon === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange((prev) => ({
                          ...prev,
                          logo: { ...prev.logo, presetIcon: null, src: null },
                        }));
                      } else {
                        const dataUrl = svgPathToDataUrl(icon.svgPath, style.dotColor.color1);
                        onChange((prev) => ({
                          ...prev,
                          logo: {
                            ...prev.logo,
                            presetIcon: icon.id,
                            src: dataUrl,
                          },
                        }));
                      }
                    }}
                    className={`p-2.5 rounded border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--paper)] border-[var(--accent)]'
                        : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-code text-[9px] font-bold px-1 rounded bg-[var(--bg-deep)] text-[var(--ink-soft)]">
                        {icon.code}
                      </span>
                    </div>
                    <span className="font-mono-code text-xs font-bold text-[var(--ink)] block truncate">
                      {icon.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--line-soft)] pt-3">
            <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
              CUSTOM ASSET FILE (SVG / PNG)
            </label>
            <div className="flex items-center gap-3">
              <label className="btn-ghost text-xs cursor-pointer">
                <span>[ UPLOAD LOGO FILE ]</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomLogoUpload}
                  className="hidden"
                />
              </label>
              {style.logo.src && (
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      logo: { ...prev.logo, src: null, presetIcon: null },
                    }))
                  }
                  className="font-mono-code text-xs text-[var(--fail)] hover:underline cursor-pointer"
                >
                  [ REMOVE EMBLEM ]
                </button>
              )}
            </div>
          </div>

          {style.logo.src && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--line-soft)] pt-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                    EMBLEM SCALE FACTOR
                  </label>
                  <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                    {Math.round(style.logo.size * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.35"
                  step="0.02"
                  value={style.logo.size}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      logo: { ...prev.logo, size: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                    SAFE MARGIN CLEARANCE
                  </label>
                  <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                    {style.logo.margin}PX
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={style.logo.margin}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      logo: { ...prev.logo, margin: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 04: FRAME & CALLOUT BANNER */}
      {subTab === 'frame' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
              FRAMEWORK SHELL ARCHETYPE
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {frames.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      frame: { ...prev.frame, type: f.id },
                    }))
                  }
                  className={`p-2.5 rounded border text-left transition cursor-pointer ${
                    style.frame.type === f.id
                      ? 'bg-[var(--paper)] border-[var(--accent)] shadow-sm'
                      : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)]'
                  }`}
                >
                  <span className="font-mono-code text-xs font-bold text-[var(--ink)] block">
                    {f.label}
                  </span>
                  <span className="font-mono-code text-[9px] text-[var(--ink-faint)]">
                    FRAME::{f.id.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {style.frame.type !== 'none' && (
            <div className="space-y-3 border-t border-[var(--line-soft)] pt-3">
              <div>
                <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                  CALLOUT PRIMARY BANNER TEXT
                </label>
                <input
                  type="text"
                  value={style.frame.text}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      frame: { ...prev.frame, text: e.target.value },
                    }))
                  }
                  placeholder="SPECIFICATION // SCAN HERE"
                  className="input-spec text-xs py-1.5"
                />
              </div>

              {style.frame.type === 'polaroid' && (
                <div>
                  <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                    SECONDARY SUBTITLE CAPTION
                  </label>
                  <input
                    type="text"
                    value={style.frame.subtext || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        frame: { ...prev.frame, subtext: e.target.value },
                      }))
                    }
                    placeholder="Ref. Code 9042 // Technical Archive"
                    className="input-spec text-xs py-1.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                    FRAME FILL INK
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.frame.bgColor}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          frame: { ...prev.frame, bgColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={style.frame.bgColor}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          frame: { ...prev.frame, bgColor: e.target.value },
                        }))
                      }
                      className="input-spec text-xs py-1 font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                    BANNER TEXT INK
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.frame.textColor}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          frame: { ...prev.frame, textColor: e.target.value },
                        }))
                      }
                      className="w-8 h-8 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={style.frame.textColor}
                      onChange={(e) =>
                        onChange((prev) => ({
                          ...prev,
                          frame: { ...prev.frame, textColor: e.target.value },
                        }))
                      }
                      className="input-spec text-xs py-1 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 05: OPTICS & CALIBRATION */}
      {subTab === 'calibration' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mono-code text-[10px] font-bold uppercase tracking-wider text-[var(--ink-soft)] mb-2">
              REED-SOLOMON ERROR REDUNDANCY LEVEL
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {errorLevels.map((el) => (
                <button
                  key={el.level}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({ ...prev, errorCorrectionLevel: el.level }))
                  }
                  className={`p-2.5 rounded border text-left transition cursor-pointer ${
                    style.errorCorrectionLevel === el.level
                      ? 'bg-[var(--paper)] border-[var(--accent)]'
                      : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-code text-xs font-bold text-[var(--ink)]">
                      LEVEL {el.level}
                    </span>
                    <span className="badge-tag">{el.pct}</span>
                  </div>
                  <p className="font-mono-code text-[9px] text-[var(--ink-soft)] leading-tight">
                    {el.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--line-soft)] pt-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                  MARGIN QUIET ZONE
                </label>
                <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                  {style.margin}PX
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={style.margin}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    margin: parseInt(e.target.value),
                  }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                  RASTER EXPORT RESOLUTION
                </label>
                <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                  {style.resolution}×{style.resolution} PX
                </span>
              </div>
              <select
                value={style.resolution}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    resolution: parseInt(e.target.value),
                  }))
                }
                className="input-spec text-xs py-1"
              >
                <option value="512">512px (Screen preview)</option>
                <option value="1024">1024px (Standard Web)</option>
                <option value="2048">2048px (Ultra-HD 2K Print)</option>
                <option value="4096">4096px (Master 4K Vector Raster)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
