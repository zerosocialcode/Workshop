import React, { useRef } from 'react';
import { FileNode } from './FileSystem';

export function Editor({
  file,
  content,
  onChange,
  onSave
}: {
  file: FileNode | null,
  content: string,
  onChange: (c: string) => void,
  onSave: () => void
}) {
  const linesRef = useRef<HTMLDivElement>(null);

  const lines = content.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1).join('\n');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (linesRef.current) {
      linesRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-soft)] bg-[var(--paper)]">
        <div className="ws-text-mono uppercase tracking-widest opacity-50 mb-4">No file selected</div>
        <div className="text-sm">Select a file from the explorer or create a new one.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--paper)]">
      <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--line)]">
        <div className="ws-label flex gap-2">
          <span>{file.path}</span>
        </div>
        <button className="ws-btn-ghost-small" onClick={onSave}>SAVE (CMD+S)</button>
      </div>
      <div className="ws-editor-container flex-1 rounded-none border-0">
        <div className="ws-editor-lines select-none" ref={linesRef}>
          {lineNumbers}
        </div>
        <textarea
          className="ws-editor-textarea flex-1"
          value={content}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
