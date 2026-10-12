import type { ActiveStatus } from '@/lib/api-types'

export type BuildingType = 'BUILDING' | 'COMPOUND' | 'RENTAL'

/** Dữ liệu rút gọn cho bộ chọn tòa nhà ở header (GET /buildings/options). */
export interface BuildingOption {
  id: number
  code: string
  name: string
  address?: string
  coverImageUrl?: string
  status: ActiveStatus
}

export interface BuildingSummary {
  id: number
  code: string
  name: string
  fullAddress: string
  type: BuildingType
  apartmentCount: number
  floorsAbove?: number
  floorsBelow?: number
  status: ActiveStatus
  coverImageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface BuildingImage {
  fileId: number
  url: string
  cover: boolean
}

export interface BuildingDetail extends BuildingSummary {
  /** Cư dân còn ở (Đang ở + Tạm vắng). */
  residentCount: number
  /** Số căn có ít nhất một cư dân Đang ở. */
  occupiedApartmentCount: number
  province: string
  ward: string
  addressDetail: string
  investor?: string
  hotline?: string
  managementEmail?: string
  description?: string
  images: BuildingImage[]
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface BuildingRequest {
  code: string
  name: string
  province: string
  ward: string
  addressDetail: string
  type: BuildingType
  floorsAbove: number | null
  floorsBelow: number | null
  investor: string | null
  hotline: string | null
  managementEmail: string | null
  description: string | null
  status: ActiveStatus
  images: { fileId: number; cover: boolean }[]
  version?: number
}
