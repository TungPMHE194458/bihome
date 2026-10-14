/** Báo cáo tiện ích (đọc). Khớp frontend/src/features/amenityreport/types.ts. */

export interface AmenityReport {
  from: string
  to: string
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  people: number
  /** 0–1 */
  fillRate: number
  /** 0–1 */
  cancelRate: number
  revenue: number
  collected: number
  byDay: { date: string; bookings: number; people: number }[]
  byAmenity: {
    amenityId: number
    code: string
    name: string
    bookings: number
    cancelled: number
    people: number
    capacity: number
    fillRate: number
    revenue: number
  }[]
  bySlot: { startTime: string; bookings: number; people: number }[]
  byStatus: { status: string; count: number }[]
}
