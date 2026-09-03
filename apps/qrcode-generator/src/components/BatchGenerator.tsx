import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { QRStyleConfig, BatchItem } from '../types';
import { renderQRToCanvas, createBatchZip } from '../utils/exportUtils';

interface BatchGeneratorProps {
  currentStyle: QRStyleConfig;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({ currentStyle }) => {
  const [mode, setMode] = useState<'text' | 'sequence'>('text');
  const [textInput, setTextInput] = useState<string>(
    'https://workshop.dev/spec-01\nhttps://workshop.dev/spec-02\nhttps://workshop.dev/spec-03\nhttps://workshop.dev/spec-04'
  );
  const [sequencePrefix, setSequencePrefix] = useState('SPEC_BATCH_');
  const [sequenceStart, setSequenceStart] = useState(1);
  const [sequenceCount, setSequenceCount] = useState(8);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerateBatch = async () => {
    let itemsToProcess: { content: string; filename: string }[] = [];

    if (mode === 'text') {
      const lines = textInput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      itemsToProcess = lines.map((line, idx) => ({
        content: line,
        filename: `qr_${String(idx + 1).padStart(3, '0')}_${line.slice(0, 15).replace(/[^a-z0-9]/gi, '_')}`,
      }));
    } else if (mode === 'sequence') {
      for (let i = 0; i < sequenceCount; i++) {
        const num = sequenceStart + i;
        const val = `${sequencePrefix}${String(num).padStart(3, '0')}`;
        itemsToProcess.push({
          content: val,
          filename: `qr_${val.replace(/[^a-z0-9]/gi, '_')}`,
        });
      }
    }

    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const initialBatch: BatchItem[] = itemsToProcess.map((item, idx) => ({
      id: `batch_${idx}_${Date.now()}`,
      content: item.content,
      filename: item.filename,
      status: 'generating',
    }));
    setBatchItems(initialBatch);

    const completedItems: BatchItem[] = [];

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      try {
        const canvas = await renderQRToCanvas(item.content, currentStyle, 600);
        completedItems.push({
          id: `batch_${i}_${Date.now()}`,
          content: item.content,
          filename: item.filename,
          status: 'ready',
          dataUrl: canvas.toDataURL('image/png'),
        });
      } catch (err: any) {
        completedItems.push({
          id: `batch_${i}_${Date.now()}`,
          content: item.content,
          filename: item.filename,
          status: 'error',
          error: err?.message || 'Failed',
        });
      }

      setProgress(Math.round(((i + 1) / itemsToProcess.length) * 100));
    }

    setBatchItems(completedItems);
    setIsProcessing(false);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  };

  const handleDownloadZip = async () => {
    const readyItems = batchItems.filter((b) => b.status === 'ready' && b.dataUrl);
    if (readyItems.length === 0) return;

    const canvases = await Promise.all(
      readyItems.map(async (item) => {
        const canvas = await renderQRToCanvas(item.content, currentStyle, 1024);
        return {
          filename: item.filename,
          canvas,
        };
      })
    );

    const zipBlob = await createBatchZip(canvases);
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_qr_matrix_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      setTextInput(lines.join('\n'));
      setMode('text');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="spec-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
          <div>
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--ink)]">
              BATCH MATRIX GENERATOR // BULK PRODUCTION
            </h3>
            <p className="font-mono-code text-xs text-[var(--ink-soft)] mt-0.5">
              Render arrays of calibrated QR codes simultaneously from multiline lists, CSVs, or indexed sequences.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[var(--bg-deep)] p-1 rounded border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1.5 rounded font-mono-code text-xs font-bold transition cursor-pointer ${
                mode === 'text'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              [ 01/LIST / MULTILINE ]
            </button>
            <button
              type="button"
              onClick={() => setMode('sequence')}
              className={`px-3 py-1.5 rounded font-mono-code text-xs font-bold transition cursor-pointer ${
                mode === 'sequence'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              [ 02/AUTO SEQUENCE ]
            </button>
          </div>
        </div>

        {/* Input Mode: Multi-line List */}
        {mode === 'text' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center font-mono-code text-xs">
              <label className="font-bold text-[var(--ink-soft)] uppercase">
                INPUT ITEM PAYLOADS (ONE ENTRY PER LINE):
              </label>
              <label className="text-[var(--accent)] hover:underline cursor-pointer font-bold">
                [ + UPLOAD CSV / TXT ]
                <input type="file" accept=".csv, .txt" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={5}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="https://example.com/asset-1&#10;https://example.com/asset-2&#10;https://example.com/asset-3"
              className="input-spec"
            />
            <div className="font-mono-code text-[10px] text-[var(--ink-faint)]">
              {textInput.split('\n').filter((l) => l.trim()).length} TOTAL ENTRIES QUEUED
            </div>
          </div>
        )}

        {/* Input Mode: Auto Sequence Builder */}
        {mode === 'sequence' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--bg-deep)] p-4 rounded border border-[var(--line)]">
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                PREFIX / IDENTIFIER
              </label>
              <input
                type="text"
                value={sequencePrefix}
                onChange={(e) => setSequencePrefix(e.target.value)}
                placeholder="SPEC_ASSET_"
                className="input-spec text-xs"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                START INDEX
              </label>
              <input
                type="number"
                min="1"
                value={sequenceStart}
                onChange={(e) => setSequenceStart(parseInt(e.target.value) || 1)}
                className="input-spec text-xs"
              />
            </div>
            <div>
              <label className="block font-mono-code text-[10px] font-bold uppercase text-[var(--ink-soft)] mb-1">
                QUANTITY COUNT
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={sequenceCount}
                onChange={(e) => setSequenceCount(Math.min(100, parseInt(e.target.value) || 1))}
                className="input-spec text-xs"
              />
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleGenerateBatch}
            disabled={isProcessing}
            className="btn-primary"
          >
            {isProcessing ? `[ PROCESSING: ${progress}% ]` : '[ GENERATE BATCH MATRIX ]'}
          </button>

          {batchItems.length > 0 && !isProcessing && (
            <button
              type="button"
              onClick={handleDownloadZip}
              className="btn-dark"
            >
              [ DOWNLOAD ALL ({batchItems.length}) AS ZIP ARCHIVE ]
            </button>
          )}
        </div>
      </div>

      {/* Generated Batch Grid */}
      {batchItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-mono-code text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
              GENERATED MATRIX QUEUE ({batchItems.filter((i) => i.status === 'ready').length}/{batchItems.length} READY)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {batchItems.map((item) => (
              <div
                key={item.id}
                className="spec-card p-3 flex flex-col items-center justify-between text-center gap-2"
              >
                {item.dataUrl ? (
                  <img
                    src={item.dataUrl}
                    alt={item.content}
                    className="w-24 h-24 rounded bg-[var(--paper)] p-1 object-contain border border-[var(--line)]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded bg-[var(--bg-deep)] flex items-center justify-center font-mono-code text-[10px] text-[var(--ink-soft)]">
                    RENDERING...
                  </div>
                )}

                <div className="w-full">
                  <div className="font-mono-code text-[11px] font-bold text-[var(--ink)] truncate">
                    {item.content}
                  </div>
                  <div className="font-mono-code text-[9px] text-[var(--ink-faint)] truncate">
                    {item.filename}.png
                  </div>
                </div>

                {item.dataUrl && (
                  <a
                    href={item.dataUrl}
                    download={`${item.filename}.png`}
                    className="btn-ghost w-full py-1 text-[10px]"
                  >
                    [ SAVE PNG ]
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
