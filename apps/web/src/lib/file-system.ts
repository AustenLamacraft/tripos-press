/**
 * File System utilities for Phase 7a — Local folder editing
 */

export interface TriposPressMetadata {
  version: 1
  files: Record<string, string> // filename -> SHA256 hash
  lastSync: string // ISO timestamp
}

export const DEFAULT_METADATA: TriposPressMetadata = {
  version: 1,
  files: {},
  lastSync: new Date().toISOString(),
}

/**
 * Compute SHA256 hash of a string (browser crypto API)
 */
export async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Scan a folder and compute hashes for all .md files
 */
export async function computeFileHashes(
  folderHandle: FileSystemDirectoryHandle,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}

  for await (const entry of folderHandle.entries()) {
    const [name, handle] = entry
    if (name.endsWith('.md') && handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle
      const file = await fileHandle.getFile()
      const content = await file.text()
      hashes[name] = await sha256(content)
    }
  }

  return hashes
}

/**
 * Load .tripos-press.json from folder (returns null if not found)
 */
export async function loadMetadata(
  folderHandle: FileSystemDirectoryHandle,
): Promise<TriposPressMetadata | null> {
  try {
    const fileHandle = await folderHandle.getFileHandle('.tripos-press.json')
    const file = await fileHandle.getFile()
    const content = await file.text()
    return JSON.parse(content) as TriposPressMetadata
  } catch {
    return null
  }
}

/**
 * Save .tripos-press.json to folder
 */
export async function saveMetadata(
  folderHandle: FileSystemDirectoryHandle,
  metadata: TriposPressMetadata,
): Promise<void> {
  const fileHandle = await folderHandle.getFileHandle('.tripos-press.json', { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(metadata, null, 2))
  await writable.close()
}

/**
 * Read a single .md file from folder
 */
export async function readFile(
  folderHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<string> {
  const fileHandle = await folderHandle.getFileHandle(filename)
  const file = await fileHandle.getFile()
  return file.text()
}

/**
 * Write a single .md file to folder
 */
export async function writeFile(
  folderHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const fileHandle = await folderHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Compare current hashes with stored metadata
 * Returns: { modified: string[], new: string[], unchanged: string[] }
 */
export function detectChanges(
  currentHashes: Record<string, string>,
  storedMetadata: TriposPressMetadata | null,
): {
  modified: string[]
  new: string[]
  unchanged: string[]
} {
  const storedHashes = storedMetadata?.files ?? {}
  const modified: string[] = []
  const unchanged: string[] = []
  const newFiles: string[] = []

  for (const [filename, hash] of Object.entries(currentHashes)) {
    if (filename === '.tripos-press.json') continue

    if (storedHashes[filename] === undefined) {
      newFiles.push(filename)
    } else if (storedHashes[filename] === hash) {
      unchanged.push(filename)
    } else {
      modified.push(filename)
    }
  }

  return { modified, new: newFiles, unchanged }
}
