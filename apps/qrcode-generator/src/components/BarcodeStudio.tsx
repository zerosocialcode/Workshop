import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import confetti from 'canvas-confetti';
import { BarcodeConfig, BarcodeSymbology, HistoryItem } from '../types';
import { exportToPDF, copyCanvasToClipboard } from '../utils/exportUtils';

interface BarcodeStudioProps {
  onSaveToHistory: (item: HistoryItem) => void;
}

const BARCODE_FORMATS: {
  id: BarcodeSymbology;
  code: string;
  name: string;
  defaultVal: string;
  description: string;
}[] = [
  { id: 'CODE128', code: '01/C128', name: 'Code 128 (Universal Alpha-Numeric)', defaultVal: 'SPEC-84920-ALPHA', description: 'Universal high-density barcode for logistics & shipping' },
  { id: 'EAN13', code: '02/E13', name: 'EAN-13 (International Retail GTIN)', defaultVal: '590123412345', description: '13-digit standard for retail point of sale worldwide' },
  { id: 'UPC', code: '03/UPC', name: 'UPC-A (North American Retail)', defaultVal: '01234567890', description: '12-digit standard for North American retail packages' },
  { id: 'CODE39', code: '04/C39', name: 'Code 39 (Defense & Automotive)', defaultVal: 'WORKSHOP-39', description: 'Industrial military & aerospace component labeling' },
  { id: 'ITF14', code: '05/ITF', name: 'ITF-14 (Corrugated Carton Master)', defaultVal: '1001234567890', description: 'Heavy shipping containers & corrugated box packaging' },
  { id: 'EAN8', code: '06/E8', name: 'EAN-8 (Compact Package Retail)', defaultVal: '9638507', description: 'Short 8-digit code for small product packaging' },
  { id: 'MSI', code: '07/MSI', name: 'MSI Plessey (Warehouse Inventory)', defaultVal: '1234567', description: 'Shelf identification in storage & inventory libraries' },
  { id: 'pharmacode', code: '08/PHARM', name: 'Pharmacode (Pharmaceutical Control)', defaultVal: '12345', description: 'Packaging control in pharmaceutical production lines' },
  { id: 'codabar', code: '09/CODA', name: 'Codabar / NW-7 (Blood Banks & Libraries)', defaultVal: 'A12345678B', description: 'Blood bank vials, libraries, and air freight bills' },
];

export const BarcodeStudio: React.FC<BarcodeStudioProps> = ({ onSaveToHistory }) => {
  const [config, setConfig] = useState<BarcodeConfig>({
    format: 'CODE128',
    value: 'SPEC-84920-ALPHA',
    width: 2,
    height: 100,
    displayValue: true,
    fontOptions: '',
    font: 'monospace',
    textAlign: 'center',
    textPosition: 'bottom',
    textMargin: 4,
    fontSize: 14,
    background: '#ffffff',
    lineColor: '#23261f',
    margin: 16,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto checksum helper for EAN13
  const computeEAN13Checksum = (digits12: string): string => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(digits12[i] || '0', 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const rem = sum % 10;
    return rem === 0 ? '0' : String(10 - rem);
  };

  // Render Barcode
  useEffect(() => {
    if (!svgRef.current) return;
    setRenderError(null);

    try {
      let finalVal = config.value.trim();
      if (!finalVal) {
        setRenderError('Input value cannot be empty');
        return;
      }

      // Check digit correction
      if (config.format === 'EAN13' && /^\d{12}$/.test(finalVal)) {
        finalVal += computeEAN13Checksum(finalVal);
      } else if (config.format === 'UPC' && /^\d{11}$/.test(finalVal)) {
        let sum = 0;
        for (let i = 0; i < 11; i++) {
          const d = parseInt(finalVal[i], 10);
          sum += i % 2 === 0 ? d * 3 : d;
        }
        const rem = sum % 10;
        finalVal += rem === 0 ? '0' : String(10 - rem);
      }

      JsBarcode(svgRef.current, finalVal, {
        format: config.format,
        width: config.width,
        height: config.height,
        displayValue: config.displayValue,
        text: config.displayValue ? finalVal : undefined,
        fontOptions: config.fontOptions || undefined,
        font: config.font || 'monospace',
        textAlign: config.textAlign,
        textPosition: config.textPosition,
        textMargin: config.textMargin,
        fontSize: config.fontSize,
        background: config.background,
        lineColor: config.lineColor,
        margin: config.margin,
        valid: (valid) => {
          if (!valid) {
            setRenderError(`Value does not conform to ${config.format} symbology rules`);
          }
        },
      });
    } catch (err: any) {
      setRenderError(err?.message || 'Invalid barcode payload for this symbology');
    }
  }, [config]);

  const handleSelectFormat = (fmt: BarcodeSymbology) => {
    const preset = BARCODE_FORMATS.find((f) => f.id === fmt);
    setConfig((prev) => ({
      ...prev,
      format: fmt,
      value: preset?.defaultVal || '123456',
    }));
  };

  const getCanvasFromSVG = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      if (!svgRef.current) return reject('No SVG');
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // Hi-DPI
        canvas.width = (svgElement.clientWidth || 300) * scale;
        canvas.height = (svgElement.clientHeight || 120) * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        URL.revokeObjectURL(blobURL);
        resolve(canvas);
      };
      image.onerror = (e) => reject(e);
      image.src = blobURL;
    });
  };

  const handleDownloadPNG = async () => {
    try {
      const canvas = await getCanvasFromSVG();
      const link = document.createElement('a');
      link.download = `barcode_${config.format}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });

      onSaveToHistory({
        id: `barcode_${Date.now()}`,
        title: `${config.format}: ${config.value}`,
        category: 'barcode',
        type: config.format,
        rawPayload: config.value,
        timestamp: Date.now(),
        previewDataUrl: canvas.toDataURL('image/png'),
        favorite: false,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `barcode_${config.format}_${Date.now()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas = await getCanvasFromSVG();
      await exportToPDF(canvas, `${config.format} Barcode: ${config.value}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async () => {
    try {
      const canvas = await getCanvasFromSVG();
      await copyCanvasToClipboard(canvas);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Form & Calibration (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Symbology Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono-code text-[11px] uppercase tracking-widest text-[var(--ink-soft)] font-bold">
              SECTION 01 — 1D BARCODE SYMBOLOGY
            </label>
            <span className="badge-tag">
              SELECTED: {config.format}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {BARCODE_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => handleSelectFormat(fmt.id)}
                className={`p-2 rounded text-left transition cursor-pointer border ${
                  config.format === fmt.id
                    ? 'bg-[var(--paper)] border-[var(--accent)] shadow-sm'
                    : 'bg-transparent border-[var(--line)] hover:border-[var(--ink-soft)] hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`font-mono-code text-[9px] font-bold px-1 rounded ${
                      config.format === fmt.id
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-deep)] text-[var(--ink-soft)]'
                    }`}
                  >
                    {fmt.code}
                  </span>
                </div>
                <div className="font-mono-code text-xs font-bold text-[var(--ink)] truncate">
                  {fmt.name.split('(')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Barcode Value Input */}
        <div className="spec-card p-4 space-y-4">
          <div>
            <label className="block font-mono-code text-[11px] font-bold uppercase text-[var(--ink-soft)] mb-1">
              PAYLOAD CODE VALUE / DIGITS <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              id="input-barcode-value"
              value={config.value}
              onChange={(e) => setConfig((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Enter barcode string..."
              className="input-spec"
            />
            <p className="font-mono-code text-[10px] text-[var(--ink-faint)] mt-1.5">
              {BARCODE_FORMATS.find((f) => f.id === config.format)?.description}
            </p>
          </div>

          {/* Sizing & Dimension Calibrations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--line-soft)] pt-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                  BAR WIDTH CALIBRATION
                </label>
                <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                  {config.width}PX
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={config.width}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, width: parseFloat(e.target.value) }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)]">
                  BAR HEIGHT CALIBRATION
                </label>
                <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                  {config.height}PX
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                value={config.height}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, height: parseInt(e.target.value) }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>

          {/* Inks and Typography */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--line-soft)] pt-3">
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                BARCODE INK COLOR
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.lineColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, lineColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={config.lineColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, lineColor: e.target.value }))}
                  className="input-spec text-xs py-1 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                BACKGROUND SHEET INK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.background}
                  onChange={(e) => setConfig((prev) => ({ ...prev, background: e.target.value }))}
                  className="w-8 h-8 rounded border border-[var(--ink)] p-0.5 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={config.background}
                  onChange={(e) => setConfig((prev) => ({ ...prev, background: e.target.value }))}
                  className="input-spec text-xs py-1 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Text options */}
          <div className="border-t border-[var(--line-soft)] pt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none font-mono-code text-xs text-[var(--ink)]">
              <input
                type="checkbox"
                checked={config.displayValue}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, displayValue: e.target.checked }))
                }
                className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
              />
              <span>PRINT HUMAN-READABLE TEXT DIGITS</span>
            </label>
          </div>
        </div>
      </div>

      {/* Right Column: Live Barcode Preview & Exports (5 Cols) */}
      <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
        <div className="spec-card p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-[var(--line-soft)] pb-2 mb-4">
            <span className="font-mono-code text-[10px] font-bold tracking-widest text-[var(--ink-soft)] uppercase">
              SPEC DRAWING: 1D_BARCODE_OUTPUT
            </span>
            <span className="badge-tag badge-ok">SYMBOLOGY: {config.format}</span>
          </div>

          {/* Barcode Render Viewport */}
          <div className="relative w-full min-h-[220px] flex items-center justify-center p-4 bg-[var(--bg-deep)] border border-[var(--line)] rounded overflow-x-auto">
            {/* Registration Crosshairs */}
            <div className="absolute top-1.5 left-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none">
              +
            </div>
            <div className="absolute top-1.5 right-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none">
              +
            </div>
            <div className="absolute bottom-1.5 left-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none">
              +
            </div>
            <div className="absolute bottom-1.5 right-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none">
              +
            </div>

            <svg ref={svgRef} className="max-w-full h-auto object-contain rounded" />

            {renderError && (
              <div className="absolute inset-0 bg-[var(--bg)] p-4 flex flex-col items-center justify-center text-center">
                <span className="font-mono-code text-xs text-[var(--fail)] font-bold mb-1">
                  ERROR: INVALID SYMBOLOGY FORMAT
                </span>
                <span className="font-mono-code text-[10px] text-[var(--ink-soft)]">
                  {renderError}
                </span>
              </div>
            )}
          </div>

          {/* Telemetry Readout */}
          <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--line-soft)] text-center font-mono-code text-[10px]">
            <div>
              <span className="text-[var(--ink-faint)] block">FORMAT</span>
              <span className="font-bold text-[var(--ink)]">{config.format}</span>
            </div>
            <div>
              <span className="text-[var(--ink-faint)] block">VALUE LENGTH</span>
              <span className="font-bold text-[var(--ink)]">{config.value.length} CHARS</span>
            </div>
            <div>
              <span className="text-[var(--ink-faint)] block">BAR CALIBRATION</span>
              <span className="font-bold text-[var(--ink)]">{config.width}×{config.height}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadPNG}
              className="btn-primary w-full"
            >
              [ EXPORT PNG ]
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="btn-dark w-full"
            >
              {copied ? '[ IMAGE COPIED ]' : '[ COPY IMAGE ]'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadSVG}
              className="btn-ghost w-full"
            >
              [ SVG VECTOR ]
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="btn-ghost w-full"
            >
              [ PDF DOCUMENT ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
