import { invoke } from '@tauri-apps/api/core'
import { downloadFileBlob } from '../api/files'
import { isNativeShell } from '../platform'
import type { AgentFile, WorkspaceFile } from '../types'

type CacheableFile = AgentFile | WorkspaceFile

interface CachedFileRecord {
  id: number
  signature: string
  checksum: string
  filename: string
  mime_type: string | null
  size: number
  blob: Blob
  synced_at: string
}

export interface SyncedLocalFile {
  file: CacheableFile
  blob: Blob
  checksum: string
  objectUrl: string
  localPath: string
  updated: boolean
}

const DB_NAME = 'wensai-local-file-cache'
const DB_VERSION = 1
const STORE_NAME = 'files'

export async function syncLocalPreviewFile(file: CacheableFile): Promise<SyncedLocalFile> {
  const db = await openCacheDb()
  const signature = buildFileSignature(file)
  const cached = await readCachedFile(db, file.id)

  if (cached && cached.signature === signature && (!file.checksum || cached.checksum === file.checksum)) {
    const localPath = await ensureLocalPreviewPath(file, cached.blob)
    return {
      file,
      blob: cached.blob,
      checksum: cached.checksum,
      objectUrl: URL.createObjectURL(cached.blob),
      localPath,
      updated: false,
    }
  }

  const blob = (await downloadFileBlob(file.id)).data
  const checksum = await digestBlob(blob)
  if (file.checksum && checksum !== file.checksum) {
    throw new Error('LOCAL_FILE_CHECKSUM_MISMATCH')
  }

  const record: CachedFileRecord = {
    id: file.id,
    signature,
    checksum,
    filename: file.filename,
    mime_type: file.mime_type,
    size: file.size,
    blob,
    synced_at: new Date().toISOString(),
  }
  await writeCachedFile(db, record)
  const localPath = await ensureLocalPreviewPath(file, blob)

  return {
    file,
    blob,
    checksum,
    objectUrl: URL.createObjectURL(blob),
    localPath,
    updated: true,
  }
}

export async function readBlobAsText(blob: Blob) {
  return await blob.text()
}

function buildFileSignature(file: CacheableFile) {
  return [
    file.id,
    file.filename,
    file.size,
    file.mime_type || '',
    file.checksum || '',
    file.created_at || '',
  ].join(':')
}

async function ensureLocalPreviewPath(file: CacheableFile, blob: Blob) {
  if (!isNativeShell()) {
    return `IndexedDB://${DB_NAME}/${STORE_NAME}/${file.id}`
  }

  try {
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()))
    const result = await invoke<{ path: string }>('cache_local_preview_file', {
      taskId: file.task_id,
      fileId: file.id,
      filename: file.filename,
      bytes,
    })
    return result.path
  } catch (err) {
    console.error('Failed to write native local preview cache', err)
    return `IndexedDB://${DB_NAME}/${STORE_NAME}/${file.id}`
  }
}

async function digestBlob(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readCachedFile(db: IDBDatabase, id: number): Promise<CachedFileRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve((request.result as CachedFileRecord | undefined) || null)
    request.onerror = () => reject(request.error)
  })
}

function writeCachedFile(db: IDBDatabase, record: CachedFileRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
