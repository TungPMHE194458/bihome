import type { ActiveStatus } from '@/lib/api-types'

export type DayType = 'WEEKDAY' | 'WEEKEND'
export type PriceUnit = 'PER_BOOKING' | 'PER_PERSON'

export interface Amenity {
  id: number
  buildingId: number
  buildingName: string
  code: string
  name: string
  location?: string
  capacity: number
  /** HH:mm */
  openTime: string
  closeTime: string
  rules?: string
  requiresApproval: boolean
  status: ActiveStatus
  images: { fileId: number; url: string; cover: boolean }[]
  coverImageUrl?: string
  /** Số khung giờ đã cấu hình; 0 = chưa mở đặt chỗ. */
  slotCount: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  version: number
}

export interface AmenityOption {
  id: number
  code: string
  name: string
  buildingId: number
  status: ActiveStatus
}

export interface AmenityRequest {
  code: string
  name: string
  location: string | null
  capacity: number
  openTime: string
  closeTime: string
  rules: string | null
  requiresApproval: boolean
  status: ActiveStatus
  images: { fileId: number; cover: boolean }[]
  version?: number
}

/** dayOfWeek: 1 = Thứ 2 … 7 = Chủ nhật. */
export interface Slot {
  dayOfWeek: number
  startTime: string
  endTime: string
  capacity?: number | null
}

export interface PriceRule {
  dayType: DayType
  startTime: string
  endTime: string
  price: number
  priceUnit: PriceUnit
}

export interface Maintenance {
  startDate: string
  endDate: string
  reason?: string | null
}

export interface AmenityConfig {
  amenityId: number
  amenityCode: string
  amenityName: string
  capacity: number
  openTime: string
  closeTime: string
  slotMinutes: number
  maxBookingsPerWeek?: number | null
  maxAdvanceDays: number
  freeCancelHours: number
  slots: Slot[]
  prices: PriceRule[]
  maintenances: Maintenance[]
  updatedAt: string
  updatedBy?: string
  version: number
}

export type AmenityConfigRequest = Omit<
  AmenityConfig,
  'amenityId' | 'amenityCode' | 'amenityName' | 'capacity' | 'openTime' | 'closeTime' | 'updatedAt' | 'updatedBy'
>
