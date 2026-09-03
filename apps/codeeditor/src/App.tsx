import { useState, useEffect } from 'react';
import { readDirectory, readFileContent, writeFileContent, populateDirectory, createFile, createDirectory, FileNode } from './FileSystem';
import { Editor } from './Editor';

function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('workshop-theme') || 'day');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('workshop-theme', theme);
  }, [theme]);

  const toggle = () => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9998';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = `radial-gradient(circle at top right, color-mix(in srgb, var(--paper) 80%, transparent), transparent)`;
    overlay.style.transition = 'opacity 0.7s ease';
    overlay.style.opacity = '0';
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '0.85';
      setTimeout(() => {
        setTheme(t => t === 'day' ? 'night' : 'day');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 700);
      }, 350);
    });
  };

  return (
    <div className="theme-switch-container animate-rise-in delay-100">
      <div className="ws-label">LIGHTS</div>
      <div className="theme-switch-plate" onClick={toggle}>
        <div className="theme-switch-rocker"></div>
      </div>
      <div className="ws-label">{theme === 'day' ? 'DAY' : 'NIGHT'}</div>
    </div>
  );
}

function CropMarks() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div className="absolute top-6 left-6 text-[var(--ink-faint)] opacity-50 text-[22px] leading-none select-none font-mono">+</div>
      <div className="absolute top-6 right-6 text-[var(--ink-faint)] opacity-50 text-[22px] leading-none select-none font-mono">+</div>
      <div className="absolute bottom-6 left-6 text-[var(--ink-faint)] opacity-50 text-[22px] leading-none select-none font-mono">+</div>
      <div className="absolute bottom-6 right-6 text-[var(--ink-faint)] opacity-50 text-[22px] leading-none select-none font-mono">+</div>
    </div>
  );
}

function FileTreeItem({ 
  node, 
  level, 
  onSelect, 
  onExpand, 
  expanded, 
  activePath 
}: { 
  node: FileNode, 
  level: number, 
  onSelect: (node: FileNode) => void, 
  onExpand: (node: FileNode) => void, 
  expanded: Set<string>, 
  activePath: string | null 
}) {
  const isDir = node.kind === 'directory';
  const isExpanded = expanded.has(node.path);
  const isActive = activePath === node.path;

  return (
    <div>
      <div 
        className={`flex items-center cursor-pointer px-2 py-1 transition-colors ${isActive ? 'bg-[var(--line-soft)] text-[var(--ink)]' : 'text-[var(--ink-soft)] hover:bg-[var(--line-soft)]'}`}
        style={{ paddingLeft: `${level * 12 + 16}px` }}
        onClick={() => isDir ? onExpand(node) : onSelect(node)}
      >
        <span className="ws-text-mono text-xs mr-2 w-3 text-center inline-block font-bold">
          {isDir ? (isExpanded ? '-' : '+') : '>'}
        </span>
        <span className="ws-text-mono text-xs whitespace-nowrap overflow-hidden text-ellipsis">
          {node.name}
        </span>
      </div>
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem 
              key={child.path} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect} 
              onExpand={onExpand} 
              expanded={expanded} 
              activePath={activePath} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenFolder = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setRootHandle(dirHandle);
      const entries = await readDirectory(dirHandle);
      setFileTree(entries);
      setExpandedFolders(new Set());
      setActiveFile(null);
      setFileContent('');
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(`Failed to open folder: ${err.message}. (May require opening in new tab)`);
      }
    }
  };

  const handleOpenFile = async () => {
    try {
      // @ts-ignore
      const [fileHandle] = await window.showOpenFilePicker();
      const node: FileNode = {
        name: fileHandle.name,
        kind: 'file',
        handle: fileHandle,
        path: fileHandle.name
      };
      const content = await readFileContent(fileHandle as FileSystemFileHandle);
      setActiveFile(node);
      setFileContent(content);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(`Failed to open file: ${err.message}. (May require opening in new tab)`);
      }
    }
  };

  const handleSelectFile = async (node: FileNode) => {
    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      setActiveFile(node);
      setFileContent(content);
    } catch (err: any) {
      setError(`Failed to read file: ${err.message}`);
    }
  };

  const handleExpandFolder = async (node: FileNode) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
      setExpandedFolders(newExpanded);
    } else {
      try {
        await populateDirectory(node);
        newExpanded.add(node.path);
        setExpandedFolders(newExpanded);
        setFileTree([...fileTree]); 
      } catch (err: any) {
        setError(`Failed to read folder: ${err.message}`);
      }
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    try {
      await writeFileContent(activeFile.handle as FileSystemFileHandle, fileContent);
    } catch (err: any) {
      setError(`Failed to save file: ${err.message}`);
    }
  };

  const handleCreateNew = async (kind: 'file' | 'directory') => {
    if (!rootHandle) return;
    const name = window.prompt(`Enter ${kind} name:`);
    if (!name) return;
    try {
      if (kind === 'file') {
        await createFile(rootHandle, name);
      } else {
        await createDirectory(rootHandle, name);
      }
      const entries = await readDirectory(rootHandle);
      setFileTree(entries);
      setExpandedFolders(new Set());
    } catch (err: any) {
      setError(`Failed to create ${kind}: ${err.message}`);
    }
  };

  return (
    <>
      <CropMarks />
      <div className="flex flex-col h-screen w-full p-8 relative z-10">
        <header className="flex justify-between items-end mb-6 animate-rise-in">
          <div>
            <h1 className="ws-text-display text-5xl leading-none">CodeEditor</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="w-full h-[2px] bg-[var(--ink)] mb-6 opacity-30 animate-rise-in delay-100"></div>

        <div className="flex flex-1 gap-6 min-h-0">
          <div className="ws-card w-72 flex flex-col gap-4 overflow-hidden animate-rise-in delay-170">
            <div className="flex flex-col gap-2 border-b border-[var(--line-soft)] pb-4">
              <button className="ws-btn-primary" onClick={handleOpenFolder}>
                OPEN FOLDER
              </button>
              <button className="ws-btn-secondary" onClick={handleOpenFile}>
                OPEN FILE
              </button>
              {rootHandle && (
                <div className="flex gap-2 mt-2">
                  <button className="ws-btn-ghost-small flex-1" onClick={() => handleCreateNew('file')}>+ FILE</button>
                  <button className="ws-btn-ghost-small flex-1" onClick={() => handleCreateNew('directory')}>+ DIR</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto -mx-4">
              {fileTree.map(node => (
                <FileTreeItem 
                  key={node.path}
                  node={node}
                  level={0}
                  onSelect={handleSelectFile}
                  onExpand={handleExpandFolder}
                  expanded={expandedFolders}
                  activePath={activeFile?.path || null}
                />
              ))}
              {fileTree.length === 0 && rootHandle && (
                <div className="ws-label text-center opacity-50 mt-4">EMPTY FOLDER</div>
              )}
              {!rootHandle && (
                <div className="ws-label text-center opacity-50 mt-4 px-4 leading-relaxed">
                  WORKSPACE IS EMPTY.<br/><br/>OPEN A FOLDER TO BEGIN.
                </div>
              )}
            </div>
          </div>

          <div className="ws-card flex-1 flex flex-col overflow-hidden p-0 animate-rise-in delay-240">
            {error && (
              <div className="absolute top-0 left-0 right-0 bg-[var(--fail)] text-[var(--paper)] px-4 py-2 text-xs font-mono z-50 flex justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="hover:opacity-75">X</button>
              </div>
            )}
            <Editor 
              file={activeFile} 
              content={fileContent} 
              onChange={setFileContent}
              onSave={handleSave} 
            />
          </div>
        </div>
      </div>
    </>
  );
}
