import type { ActiveStatus } from '@/lib/api-types'

export type ApartmentType = 'APARTMENT' | 'PENTHOUSE' | 'VILLA' | 'DUPLEX' | 'SHOPHOUSE' | 'PREMISES' | 'OFFICE'
export type OwnershipType = 'RENT' | 'OWN'
export type UsageStatus = 'VACANT' | 'OCCUPIED' | 'RENOVATING'

export interface ApartmentSummary {
  id: number
  buildingId: number
  buildingCode: string
  buildingName: string
  code: string
  name: string
  floorNo: string
  bedrooms?: number
  rooms?: number
  area: number
  type: ApartmentType
  ownershipType: OwnershipType
  usageStatus: UsageStatus
  status: ActiveStatus
  /** Chủ sở hữu còn ở (chủ hộ chính trước); nhiều người thì thêm "(+N)". */
  ownerName?: string
  /** Số cư dân còn ở (Đang ở + Tạm vắng). */
  memberCount: number
  coverImageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ApartmentDetail extends ApartmentSummary {
  description?: string
  images: { fileId: number; url: string; cover: boolean }[]
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface ApartmentRequest {
  buildingId: number | null
  code: string
  name: string
  floorNo: string
  bedrooms: number | null
  rooms: number | null
  area: number
  type: ApartmentType
  ownershipType: OwnershipType
  usageStatus: UsageStatus
  description: string | null
  status: ActiveStatus
  images: { fileId: number; cover: boolean }[]
  version?: number
}

/** Gợi ý chọn căn hộ ở form của module khác (GET /apartments/options). */
export interface ApartmentOption {
  id: number
  code: string
  name: string
  buildingId: number
  buildingName: string
}
