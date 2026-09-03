import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { QRStyleConfig, HistoryItem } from '../types';
import {
  renderQRToCanvas,
  renderQRToSVG,
  exportToPDF,
  copyCanvasToClipboard,
} from '../utils/exportUtils';
import { calculateContrastRatio, getContrastGrade } from '../utils/contrast';

interface QRCodeRendererProps {
  payload: string;
  style: QRStyleConfig;
  title: string;
  onSaveToHistory: (item: HistoryItem) => void;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({
  payload,
  style,
  title,
  onSaveToHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedCanvas, setRenderedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const contrast = calculateContrastRatio(style.dotColor.color1, style.backgroundColor);
  const grade = getContrastGrade(contrast);

  useEffect(() => {
    let isCancelled = false;
    setIsRendering(true);
    setRenderError(null);

        renderQRToCanvas(payload, style, 800)
      .then((canvas) => {
        if (isCancelled) return;
        setRenderedCanvas(canvas);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          canvas.className = 'max-w-full max-h-full w-auto h-auto object-contain select-none rounded-sm shadow-xs block m-auto';
          canvas.style.maxWidth = '100%';
          canvas.style.maxHeight = '100%';
          canvas.style.width = 'auto';
          canvas.style.height = 'auto';
          canvas.style.objectFit = 'contain';
          containerRef.current.appendChild(canvas);
        }
        setIsRendering(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        setRenderError(err?.message || 'Matrix render failed');
        setIsRendering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [payload, style]);

  const handleDownloadPNG = async () => {
    try {
      const highResCanvas = await renderQRToCanvas(payload, style, style.resolution || 2048);
      const link = document.createElement('a');
      link.download = `qrcode_${Date.now()}.png`;
      link.href = highResCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });

      onSaveToHistory({
        id: `qr_${Date.now()}`,
        title: title || 'QR Code',
        category: 'qr',
        type: 'QR-Matrix',
        rawPayload: payload,
        timestamp: Date.now(),
        previewDataUrl: highResCanvas.toDataURL('image/png'),
        favorite: false,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadSVG = async () => {
    try {
      const svgString = await renderQRToSVG(payload, style);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcode_${Date.now()}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!renderedCanvas) return;
    try {
      await exportToPDF(renderedCanvas, title || 'QR Code Specification');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyImage = async () => {
    if (!renderedCanvas) return;
    try {
      await copyCanvasToClipboard(renderedCanvas);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy unsupported', err);
    }
  };

  const handlePrintSheet = () => {
    if (!renderedCanvas) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const imgData = renderedCanvas.toDataURL('image/png');
    printWindow.document.write(`
      <html>
        <head>
          <title>PRINT SPECIFICATION // QR CODE</title>
          <style>
            body { font-family: 'JetBrains Mono', monospace; margin: 20mm; text-align: center; color: #23261f; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15mm; }
            .item { border: 1px dashed #c7bb98; padding: 10mm; text-align: center; }
            img { max-width: 100%; height: auto; }
            .caption { font-size: 11px; margin-top: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2 style="font-size:16px; margin-bottom: 20px;">TECHNICAL ASSET PRINT MATRIX // 3x3 STICKER SHEET</h2>
          <div class="grid">
            ${Array(6)
              .fill(0)
              .map(
                () => `
              <div class="item">
                <img src="${imgData}" />
                <div class="caption">${title.slice(0, 24)}</div>
              </div>
            `
              )
              .join('')}
          </div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Spec Card Canvas Container */}
      <div className="spec-card p-5 flex flex-col items-center">
        {/* Drawing Header Eyebrow */}
        <div className="w-full flex items-center justify-between border-b border-[var(--line-soft)] pb-2 mb-4">
          <span className="font-mono-code text-[10px] font-bold tracking-widest text-[var(--ink-soft)] uppercase">
            SPEC DRAWING: MATRIX_OUTPUT
          </span>
          <span
            className={`badge-tag ${
              grade.isAcceptable ? 'badge-ok' : 'badge-fail'
            }`}
          >
            OPTICS: {grade.label}
          </span>
        </div>

        {/* Live Canvas Viewport with Registration Crosses */}
        <div className="relative w-full aspect-square max-w-[360px] flex items-center justify-center p-5 bg-[var(--bg-deep)] border border-[var(--line)] rounded overflow-hidden">
          {/* 4 Corner Registration Crosshairs */}
          <div className="absolute top-1.5 left-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none z-10 pointer-events-none">
            +
          </div>
          <div className="absolute top-1.5 right-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none z-10 pointer-events-none">
            +
          </div>
          <div className="absolute bottom-1.5 left-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none z-10 pointer-events-none">
            +
          </div>
          <div className="absolute bottom-1.5 right-1.5 font-mono-code text-[11px] text-[var(--ink-faint)] leading-none select-none z-10 pointer-events-none">
            +
          </div>

          <div
            ref={containerRef}
            className="w-full h-full max-w-full max-h-full flex items-center justify-center overflow-hidden"
          />

          {isRendering && (
            <div className="absolute inset-0 bg-[var(--bg-deep)]/80 flex items-center justify-center font-mono-code text-xs font-bold text-[var(--ink)] z-20">
              [ COMPUTING MATRIX... ]
            </div>
          )}

          {renderError && (
            <div className="absolute inset-0 bg-[var(--bg)] p-4 flex flex-col items-center justify-center text-center z-20">
              <span className="font-mono-code text-xs text-[var(--fail)] font-bold mb-1">
                ERROR: PAYLOAD EXCEEDS MATRIX CAPACITY
              </span>
              <span className="font-mono-code text-[10px] text-[var(--ink-soft)]">
                Try reducing text size or lowering error correction level.
              </span>
            </div>
          )}
        </div>

        {/* Telemetry Readout */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--line-soft)] text-center font-mono-code text-[10px]">
          <div>
            <span className="text-[var(--ink-faint)] block">ECC LEVEL</span>
            <span className="font-bold text-[var(--ink)]">LEVEL {style.errorCorrectionLevel}</span>
          </div>
          <div>
            <span className="text-[var(--ink-faint)] block">PAYLOAD BYTES</span>
            <span className="font-bold text-[var(--ink)]">{payload.length}B</span>
          </div>
          <div>
            <span className="text-[var(--ink-faint)] block">RASTER OUTPUT</span>
            <span className="font-bold text-[var(--ink)]">{style.resolution}PX</span>
          </div>
        </div>
      </div>

      {/* Export Action Controls */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            id="btn-download-png"
            onClick={handleDownloadPNG}
            className="btn-primary w-full"
          >
            [ EXPORT ULTRA-HD PNG ]
          </button>

          <button
            type="button"
            id="btn-copy-clipboard"
            onClick={handleCopyImage}
            className="btn-dark w-full"
          >
            {copied ? '[ IMAGE COPIED TO CLIPBOARD ]' : '[ COPY IMAGE TO CLIPBOARD ]'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            id="btn-download-svg"
            onClick={handleDownloadSVG}
            className="btn-ghost w-full"
          >
            [ SVG VECTOR ]
          </button>
          <button
            type="button"
            id="btn-download-pdf"
            onClick={handleDownloadPDF}
            className="btn-ghost w-full"
          >
            [ PDF DOC ]
          </button>
          <button
            type="button"
            id="btn-print-sheet"
            onClick={handlePrintSheet}
            className="btn-ghost w-full"
          >
            [ PRINT SHEET ]
          </button>
        </div>
      </div>
    </div>
  );
};
