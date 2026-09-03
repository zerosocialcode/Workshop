export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  path: string;
  children?: FileNode[];
}

export async function readDirectory(dirHandle: FileSystemDirectoryHandle, path: string = ''): Promise<FileNode[]> {
  const entries: FileNode[] = [];
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      entries.push({
        name: entry.name,
        kind: 'file',
        handle: entry,
        path: entryPath
      });
    } else if (entry.kind === 'directory') {
      entries.push({
        name: entry.name,
        kind: 'directory',
        handle: entry,
        path: entryPath,
        children: []
      });
    }
  }
  entries.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
  return entries;
}

export async function populateDirectory(dirNode: FileNode): Promise<void> {
  if (dirNode.kind !== 'directory') return;
  dirNode.children = await readDirectory(dirNode.handle as FileSystemDirectoryHandle, dirNode.path);
}

export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

export async function writeFileContent(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
  // @ts-ignore
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createFile(dirHandle: FileSystemDirectoryHandle, name: string): Promise<FileSystemFileHandle> {
  return await dirHandle.getFileHandle(name, { create: true });
}

export async function createDirectory(dirHandle: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  return await dirHandle.getDirectoryHandle(name, { create: true });
}
