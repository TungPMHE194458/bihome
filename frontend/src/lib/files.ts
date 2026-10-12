import { useQuery } from '@tanstack/react-query'
import type { FilePurpose, FileResponse } from '@/lib/api-types'
import { apiPath, http } from '@/lib/http'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png'
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024

export async function uploadFile(
  file: File,
  purpose: FilePurpose,
  onProgress?: (percent: number) => void,
): Promise<FileResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', purpose)
  const res = await http.post<FileResponse>('/files', form, {
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total))
    },
  })
  return res.data
}

/**
 * /files cần Bearer token nên không dùng thẳng URL trong <img src>;
 * tải blob qua axios rồi tạo object URL (được cache theo URL).
 */
export function useAuthImage(url?: string | null): string | undefined {
  const query = useQuery({
    queryKey: ['file-blob', url],
    enabled: !!url,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await http.get<Blob>(apiPath(url!), { responseType: 'blob' })
      return URL.createObjectURL(res.data)
    },
  })
  return query.data
}

export async function downloadFile(url: string, fileName: string): Promise<void> {
  const res = await http.get<Blob>(apiPath(url), { responseType: 'blob', params: { download: true } })
  saveBlob(res.data, fileName)
}

/** Tải file do API sinh ra (vd Excel); tên file lấy từ Content-Disposition nếu có. */
export async function downloadFromApi(
  path: string,
  params: Record<string, string | number> | undefined,
  fallbackName: string,
): Promise<void> {
  const res = await http.get<Blob>(path, { responseType: 'blob', params })
  saveBlob(res.data, fileNameFromDisposition(res.headers['content-disposition']) ?? fallbackName)
}

export function fileNameFromDisposition(header: unknown): string | undefined {
  if (typeof header !== 'string') return undefined
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) return decodeURIComponent(encoded[1].replace(/"/g, ''))
  return /filename="?([^";]+)"?/i.exec(header)?.[1]
}

function saveBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
}
