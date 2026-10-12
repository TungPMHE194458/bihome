import type { Availability, Booking, BookingCalendar, BookingQuote, BookingRequest } from '@/features/booking/types'
import type { PaymentMethod } from '@/features/transaction/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Phạm vi theo tòa đang chọn (X-Building-Id do http tự gửi). */
export const bookingApi = {
  list: (params: ListParams) => http.get<PageResponse<Booking>>('/amenity-bookings', { params }).then((r) => r.data),
  get: (id: number) => http.get<Booking>(`/amenity-bookings/${id}`).then((r) => r.data),
  availability: (amenityId: number, from: string, days = 1) =>
    http.get<Availability>('/amenity-bookings/availability', { params: { amenityId, from, days } }).then((r) => r.data),
  calendar: (amenityId: number, from: string, days = 7) =>
    http.get<BookingCalendar>('/amenity-bookings/calendar', { params: { amenityId, from, days } }).then((r) => r.data),
  quote: (body: BookingRequest) => http.post<BookingQuote>('/amenity-bookings/quote', body).then((r) => r.data),
  create: (body: BookingRequest) => http.post<Booking>('/amenity-bookings', body).then((r) => r.data),
  approve: (id: number, version: number) => http.post<Booking>(`/amenity-bookings/${id}/approve`, { version }).then((r) => r.data),
  reject: (id: number, reason: string, version: number) =>
    http.post<Booking>(`/amenity-bookings/${id}/reject`, { reason, version }).then((r) => r.data),
  cancel: (id: number, reason: string, version: number) =>
    http.post<Booking>(`/amenity-bookings/${id}/cancel`, { reason, version }).then((r) => r.data),
  complete: (id: number, version: number) => http.post<Booking>(`/amenity-bookings/${id}/complete`, { version }).then((r) => r.data),
  pay: (id: number, method: PaymentMethod) => http.post<Booking>(`/amenity-bookings/${id}/pay`, { method }).then((r) => r.data),
}
