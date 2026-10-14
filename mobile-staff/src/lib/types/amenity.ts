/** Tiện ích: danh mục, cấu hình, đăng ký. Khớp frontend/src/features/amenity/ + booking/types.ts. */
import type { ActiveStatus } from './common'
import type { TransactionSummary } from './transaction'

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
  openTime: string
  closeTime: string
  rules?: string
  requiresApproval: boolean
  status: ActiveStatus
  images: { fileId: number; url: string; cover: boolean }[]
  coverImageUrl?: string
  /** 0 = chưa cấu hình khung giờ. */
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

// -------------------------------------------------------- Cấu hình tiện ích

export interface AmenitySlot {
  /** 1 = Thứ 2 … 7 = Chủ nhật. */
  dayOfWeek: number
  startTime: string
  endTime: string
  /** null = dùng sức chứa mặc định của tiện ích. */
  capacity: number | null
}

export interface AmenityPriceRule {
  dayType: DayType
  startTime: string
  endTime: string
  price: number
  priceUnit: PriceUnit
}

export interface AmenityMaintenance {
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
  slots: AmenitySlot[]
  prices: AmenityPriceRule[]
  maintenances: AmenityMaintenance[]
  updatedAt: string
  updatedBy?: string
  version: number
}

export interface AmenityConfigRequest {
  slotMinutes: number
  maxBookingsPerWeek: number | null
  maxAdvanceDays: number
  freeCancelHours: number
  slots: AmenitySlot[]
  prices: AmenityPriceRule[]
  maintenances: AmenityMaintenance[]
  version?: number
}

// -------------------------------------------------------- Đăng ký tiện ích (booking)

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export interface Booking {
  id: number
  buildingId: number
  buildingName: string
  code: string
  amenityId: number
  amenityCode: string
  amenityName: string
  apartmentId: number
  apartmentCode: string
  residentId?: number
  residentName?: string
  bookingDate: string
  startTime: string
  endTime: string
  peopleCount: number
  unitPrice: number
  priceUnit?: PriceUnit
  fee: number
  voucherId?: number
  voucherCode?: string
  discount: number
  total: number
  status: BookingStatus
  note?: string
  rejectReason?: string
  cancelReason?: string
  decidedAt?: string
  decidedBy?: string
  cancelledAt?: string
  completedAt?: string
  /** Chỉ có ở chi tiết: huỷ trước thời điểm này thì miễn phí. */
  freeCancelUntil?: string
  transaction?: TransactionSummary
  createdAt: string
  createdBy?: string
  version: number
}

export interface BookingRequest {
  amenityId: number
  apartmentId: number
  residentId: number | null
  bookingDate: string
  startTime: string
  endTime: string
  peopleCount: number
  voucherCode: string | null
  note: string | null
}

export interface BookingQuote {
  unitPrice: number
  priceUnit?: PriceUnit
  fee: number
  voucherCode?: string
  discount: number
  total: number
  requiresApproval: boolean
  remaining: number
}

export interface SlotAvailability {
  startTime: string
  endTime: string
  capacity: number
  booked: number
  remaining: number
  price: number
  priceUnit?: PriceUnit
  past: boolean
}

export interface DayAvailability {
  date: string
  /** Có = không nhận đặt ngày này. */
  closedReason?: string
  slots: SlotAvailability[]
}

export interface Availability {
  amenityId: number
  amenityName: string
  capacity: number
  requiresApproval: boolean
  maxAdvanceDays: number
  maxBookingsPerWeek?: number
  freeCancelHours: number
  days: DayAvailability[]
}

export interface CalendarBooking {
  id: number
  code: string
  bookingDate: string
  startTime: string
  endTime: string
  apartmentCode: string
  peopleCount: number
  status: BookingStatus
}

export interface BookingCalendar {
  availability: Availability
  bookings: CalendarBooking[]
}
