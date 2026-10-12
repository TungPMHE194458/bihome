import type { ActiveStatus } from '@/lib/api-types'

export interface AssetCategory {
  id: number
  buildingId: number
  buildingName: string
  name: string
  description?: string
  unit: string
  status: ActiveStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface AssetCategoryOption {
  id: number
  name: string
  unit: string
  status: ActiveStatus
}

export interface AssetCategoryRequest {
  buildingId: number | null
  name: string
  description: string | null
  unit: string
  status: ActiveStatus
  version?: number
}

export interface AssetItem {
  id: number
  buildingId: number
  buildingName: string
  apartmentId: number
  apartmentCode: string
  apartmentName: string
  categoryId: number
  categoryName: string
  name: string
  plateNumber?: string
  /** Thẻ từ đang dùng / khoá liên kết với xe. */
  accessCardNo?: string
  description?: string
  unit: string
  entryDate: string
  exitDate?: string
  status: ActiveStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface AssetItemRequest {
  apartmentId: number
  categoryId: number
  name: string
  plateNumber: string | null
  description: string | null
  unit: string | null
  entryDate: string
  exitDate: string | null
  status: ActiveStatus
  version?: number
}
