import React, { useState } from 'react';
import { HistoryItem } from '../types';

interface HistoryViewProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onLoadPayload: (payload: string, category: 'qr' | 'barcode') => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onClearHistory,
  onToggleFavorite,
  onDeleteItem,
  onLoadPayload,
}) => {
  const [filter, setFilter] = useState<'all' | 'qr' | 'barcode' | 'favorites'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter((item) => {
    if (filter === 'qr') return item.category === 'qr';
    if (filter === 'barcode') return item.category === 'barcode';
    if (filter === 'favorites') return item.favorite;
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
        <div>
          <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--ink)]">
            ASSET REGISTRY LEDGER & SAVED CODES
          </h3>
          <p className="font-mono-code text-xs text-[var(--ink-soft)] mt-0.5">
            Locally persisted archive of generated matrix patterns and barcodes for rapid re-export and recall.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="btn-ghost text-[var(--fail)] hover:text-[var(--fail)] hover:border-[var(--fail)]"
          >
            [ PURGE ENTIRE LEDGER ]
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-[var(--bg-deep)] p-1 rounded border border-[var(--line)] w-fit font-mono-code text-xs">
        {[
          { id: 'all', label: `ALL (${history.length})` },
          { id: 'qr', label: 'QR MATRIX' },
          { id: 'barcode', label: '1D BARCODES' },
          { id: 'favorites', label: `STARRED (${history.filter((h) => h.favorite).length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded font-bold transition cursor-pointer ${
              filter === tab.id
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="spec-card p-12 text-center">
          <div className="font-mono-code text-xs font-bold text-[var(--ink-soft)] uppercase mb-1">
            [ REGISTRY LEDGER EMPTY ]
          </div>
          <p className="font-mono-code text-xs text-[var(--ink-faint)] max-w-sm mx-auto">
            Codes generated or downloaded in the QR Studio or Barcode Studio will automatically be indexed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="spec-card p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge-tag">
                      {item.type}
                    </span>
                    <span className="font-mono-code text-[10px] text-[var(--ink-faint)]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-mono-code text-xs">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item.id)}
                      className={`p-1 px-2 rounded border cursor-pointer ${
                        item.favorite
                          ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-deep)]'
                          : 'border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--ink)]'
                      }`}
                      title={item.favorite ? 'Unstar' : 'Star item'}
                    >
                      {item.favorite ? '★' : '☆'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 px-2 rounded border border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--fail)] hover:border-[var(--fail)] cursor-pointer"
                      title="Delete entry"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {item.previewDataUrl && (
                  <div className="w-full h-36 bg-[var(--bg-deep)] rounded flex items-center justify-center p-2 border border-[var(--line)] mb-3">
                    <img
                      src={item.previewDataUrl}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain rounded-sm"
                    />
                  </div>
                )}

                <h4 className="font-display text-base font-bold text-[var(--ink)] uppercase truncate">
                  {item.title}
                </h4>
                <p className="font-mono-code text-[11px] text-[var(--ink-soft)] truncate mt-0.5 select-all">
                  {item.rawPayload}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--line-soft)]">
                <button
                  type="button"
                  onClick={() => onLoadPayload(item.rawPayload, item.category)}
                  className="btn-primary flex-1 py-1 text-xs"
                >
                  [ LOAD STUDIO ]
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.rawPayload)}
                  className="btn-ghost py-1 text-xs"
                  title="Copy payload"
                >
                  {copiedId === item.id ? '[ COPIED ]' : '[ COPY ]'}
                </button>

                {item.previewDataUrl && (
                  <a
                    href={item.previewDataUrl}
                    download={`${item.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.png`}
                    className="btn-ghost py-1 text-xs"
                    title="Download PNG"
                  >
                    [ PNG ]
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
