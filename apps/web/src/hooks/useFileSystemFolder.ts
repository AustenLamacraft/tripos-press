/**
 * useFileSystemFolder — Custom hook for File System Access API
 *
 * Handles opening a folder picker, reading files, and syncing to disk.
 */

'use client'

import { useState, useCallback } from 'react'
import {
  computeFileHashes,
  loadMetadata,
  saveMetadata,
  readFile,
  writeFile,
  sha256,
  detectChanges,
  DEFAULT_METADATA,
  type TriposPressMetadata,
} from '@/lib/file-system'

export interface FolderSyncState {
  folderHandle: FileSystemDirectoryHandle | null
  folderName: string
  files: Record<string, string> // filename -> content
  hashes: Record<string, string> // filename -> SHA256
  metadata: TriposPressMetadata | null
  changes: {
    modified: string[]
    new: string[]
    unchanged: string[]
  } | null
  isLoading: boolean
  error: string | null
}

export function useFileSystemFolder() {
  const [state, setState] = useState<FolderSyncState>({
    folderHandle: null,
    folderName: '',
    files: {},
    hashes: {},
    metadata: null,
    changes: null,
    isLoading: false,
    error: null,
  })

  /**
   * Open folder picker and load folder state
   */
  const openFolder = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const folderHandle = await window.showDirectoryPicker()
      const folderName = folderHandle.name

      // Compute hashes for all .md files
      const hashes = await computeFileHashes(folderHandle)

      // Load stored metadata
      const metadata = await loadMetadata(folderHandle)

      // Detect changes
      const changes = detectChanges(hashes, metadata)

      // Read all modified and new files
      const files: Record<string, string> = {}
      for (const filename of [...changes.modified, ...changes.new]) {
        files[filename] = await readFile(folderHandle, filename)
      }

      setState((s) => ({
        ...s,
        folderHandle,
        folderName,
        files,
        hashes,
        metadata,
        changes,
        isLoading: false,
      }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to open folder'
      setState((s) => ({ ...s, isLoading: false, error: message }))
    }
  }, [])

  /**
   * Update a file in memory and on disk
   */
  const updateFile = useCallback(
    async (filename: string, content: string) => {
      if (!state.folderHandle) return

      try {
        // Write to disk
        await writeFile(state.folderHandle, filename, content)

        // Update hashes and files in state
        const newHash = await sha256(content)
        setState((s) => ({
          ...s,
          files: { ...s.files, [filename]: content },
          hashes: { ...s.hashes, [filename]: newHash },
        }))
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update file'
        setState((s) => ({ ...s, error: message }))
      }
    },
    [state.folderHandle],
  )

  /**
   * After successful publish, update stored metadata
   */
  const syncMetadata = useCallback(async () => {
    if (!state.folderHandle) return

    try {
      const newMetadata: TriposPressMetadata = {
        version: 1,
        files: state.hashes,
        lastSync: new Date().toISOString(),
      }
      await saveMetadata(state.folderHandle, newMetadata)
      setState((s) => ({ ...s, metadata: newMetadata }))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sync metadata'
      setState((s) => ({ ...s, error: message }))
    }
  }, [state.folderHandle, state.hashes])

  /**
   * Close folder (clear state)
   */
  const closeFolder = useCallback(() => {
    setState({
      folderHandle: null,
      folderName: '',
      files: {},
      hashes: {},
      metadata: null,
      changes: null,
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    state,
    openFolder,
    updateFile,
    syncMetadata,
    closeFolder,
  }
}
