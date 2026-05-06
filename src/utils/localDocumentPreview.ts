import client, { API_BASE_URL, resolveApiUrl } from '../api/client'
import type { AgentFile, FilePreview, WorkspaceFile } from '../types'

type CacheableFile = AgentFile | WorkspaceFile

export interface LocalDocumentPreviewResult {
  pageImageUrls: string[]
  message: string
  cached: boolean
}

export interface LocalDocumentPreviewCacheInspection {
  status: 'valid' | 'missing' | 'stale'
  result: LocalDocumentPreviewResult | null
  message: string
}

interface CachedDocumentPreviewRecord {
  id: number
  file_hash: string | null
  signature: string
  page_images: string[]
  created_at: string
}

const DB_NAME = 'wensai-cloud-document-preview-cache'
const DB_VERSION = 1
const STORE_NAME = 'previews'

export function isLayoutPreviewFile(filename: string, mimeType: string | null) {
  const suffix = getFileSuffix(filename)
  return (
    mimeType === 'application/pdf' ||
    ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(suffix)
  )
}

export function isPdfFile(filename: string, mimeType: string | null) {
  return mimeType === 'application/pdf' || getFileSuffix(filename) === 'pdf'
}

export async function inspectDocumentPreviewCache(file: CacheableFile): Promise<LocalDocumentPreviewCacheInspection> {
  const db = await openPreviewDb()
  const cached = await readCachedPreview(db, file.id)
  if (!cached || !cached.page_images.length) {
    return {
      status: 'missing',
      result: null,
      message: '本地还没有图片缓存，将从云端解析结果同步一次。',
    }
  }

  const fileHash = getFileHash(file)
  if (fileHash) {
    if (cached.file_hash === fileHash) {
      return {
        status: 'valid',
        result: {
          pageImageUrls: cached.page_images,
          message: `哈希校验通过，无需更新。已读取 ${cached.page_images.length} 页本地图片缓存。`,
          cached: true,
        },
        message: '哈希校验通过，无需更新，已读取本地图片缓存。',
      }
    }

    return {
      status: 'stale',
      result: null,
      message: '文件哈希已变化，将从云端重新解析并同步本地图片缓存。',
    }
  }

  if (cached.signature === buildPreviewSignature(file)) {
    return {
      status: 'valid',
      result: {
        pageImageUrls: cached.page_images,
        message: `文件未提供哈希，已用元数据校验缓存。已读取 ${cached.page_images.length} 页本地图片缓存。`,
        cached: true,
      },
      message: '文件未提供哈希，已用元数据校验并读取本地图片缓存。',
    }
  }

  return {
    status: 'stale',
    result: null,
    message: '文件元数据已变化，将从云端重新解析并同步本地图片缓存。',
  }
}

export async function cacheCloudDocumentPreview(file: CacheableFile, preview: FilePreview): Promise<LocalDocumentPreviewResult | null> {
  if (preview.mode !== 'gallery' || !preview.page_image_urls.length) return null

  const pageImages = await Promise.all(preview.page_image_urls.map(downloadPreviewImageAsDataUrl))
  const db = await openPreviewDb()
  await writeCachedPreview(db, {
    id: file.id,
    file_hash: getFileHash(file),
    signature: buildPreviewSignature(file),
    page_images: pageImages,
    created_at: new Date().toISOString(),
  })

  return {
    pageImageUrls: pageImages,
    message: `已从云端同步 ${pageImages.length} 页图片到本地缓存。后续会通过哈希判断是否需要更新。`,
    cached: false,
  }
}

function getFileSuffix(filename: string) {
  return filename.toLowerCase().split('.').pop() || ''
}

function getFileHash(file: CacheableFile) {
  return file.checksum || null
}

function buildPreviewSignature(file: CacheableFile) {
  return [
    file.id,
    file.filename,
    file.size,
    file.mime_type || '',
    file.created_at || '',
  ].join(':')
}

async function downloadPreviewImageAsDataUrl(url: string) {
  const response = await client.get<Blob>(normalizePreviewImageUrl(url), { responseType: 'blob' })
  return blobToDataUrl(response.data)
}

function normalizePreviewImageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return resolveApiUrl(url)
  if (!API_BASE_URL.startsWith('http')) {
    const base = API_BASE_URL.replace(/\/+$/, '')
    if (base && url.startsWith(`${base}/`)) return url.slice(base.length) || '/'
  }
  return resolveApiUrl(url)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function openPreviewDb(): Promise<IDBDatabase> {
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

function readCachedPreview(db: IDBDatabase, id: number): Promise<CachedDocumentPreviewRecord | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve((request.result as CachedDocumentPreviewRecord | undefined) || null)
    request.onerror = () => reject(request.error)
  })
}

function writeCachedPreview(db: IDBDatabase, record: CachedDocumentPreviewRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
