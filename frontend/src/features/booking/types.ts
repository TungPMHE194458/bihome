import type { PriceUnit } from '@/features/amenity/types'
import type { TransactionSummary } from '@/features/transaction/types'

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
  /** HH:mm */
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
