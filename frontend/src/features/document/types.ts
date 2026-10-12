import type { ActiveStatus } from '@/lib/api-types'

export type DocumentAudience = 'ALL_RESIDENTS' | 'OWNERS' | 'TENANTS' | 'MANAGEMENT'

export interface DocumentCategory {
  id: number
  name: string
  description?: string
  /** #RRGGBB */
  color: string
  status: ActiveStatus
  /** Số tài liệu (mọi tòa) thuộc danh mục. */
  documentCount: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface DocumentCategoryOption {
  id: number
  name: string
  color: string
  status: ActiveStatus
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
  buildingCode: string
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

/** `fileId` chỉ dùng khi thêm mới; thay tệp qua `ReplaceFileRequest`. */
export interface DocumentRequest {
  code: string | null
  name: string
  description: string | null
  categoryId: number
  audience: DocumentAudience
  tags: string[]
  fileId?: number
  version?: number
}

export interface ReplaceFileRequest {
  fileId: number
  note: string | null
  version: number
}

/** Một phiên bản tệp; `id` không có = phiên bản hiện tại. */
export interface DocumentFileVersion {
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
