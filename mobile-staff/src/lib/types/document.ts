/** Tài liệu + danh mục. Khớp frontend/src/features/document/types.ts. */
import type { ActiveStatus } from './common'

export type DocumentAudience = 'ALL_RESIDENTS' | 'OWNERS' | 'TENANTS' | 'MANAGEMENT'

export interface DocumentCategory {
  id: number
  name: string
  description?: string
  /** #RRGGBB in hoa. */
  color: string
  status: ActiveStatus
  documentCount: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface DocumentCategoryOption {
  id: number
  name: string
  color: string
}

export interface DocumentCategoryRequest {
  name: string
  description: string | null
  color: string
  status: ActiveStatus
  version?: number
}

export interface DocumentItem {
  id: number
  buildingId: number
  buildingName: string
  code: string
  name: string
  description?: string
  categoryId: number
  categoryName: string
  categoryColor: string
  audience: DocumentAudience
  tags: string[]
  fileName: string
  fileSize: number
  contentType: string
  fileVersionNo: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface DocumentRequest {
  code: string | null
  name: string
  description: string | null
  categoryId: number
  audience: DocumentAudience
  tags: string[]
  /** Bắt buộc khi tạo mới; bỏ qua khi sửa (dùng API thay file riêng). */
  fileId?: number
  version?: number
}

export interface ReplaceFileRequest {
  fileId: number
  note: string | null
  version: number
}

export interface DocumentFileVersion {
  /** undefined = bản hiện tại. */
  id?: number
  versionNo: number
  current: boolean
  fileName: string
  fileSize: number
  contentType: string
  uploadedAt: string
  uploadedBy?: string
  replacedAt?: string
  replacedBy?: string
  note?: string
}

export function canPreview(contentType: string): boolean {
  return contentType === 'application/pdf' || contentType.startsWith('image/')
}
