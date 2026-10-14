import { clean, data, http, type Params } from '@/lib/api/shared'
import type {
  Amenity,
  AmenityConfig,
  AmenityConfigRequest,
  AmenityOption,
  AmenityRequest,
  Availability,
  Booking,
  BookingCalendar,
  BookingQuote,
  BookingRequest,
  PageResponse,
  PaymentMethod,
} from '@/lib/types'

export const amenityApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Amenity>>('/amenities', { params: clean({ size: 20, sort: 'code,asc', ...p }) })),
  options: (buildingId?: number) => data(http.get<AmenityOption[]>('/amenities/options', { params: clean({ buildingId }) })),
  get: (id: number) => data(http.get<Amenity>(`/amenities/${id}`)),
  save: (id: number | undefined, body: AmenityRequest) =>
    data(id == null ? http.post<Amenity>('/amenities', body) : http.put<Amenity>(`/amenities/${id}`, body)),
  status: (id: number, status: 'ACTIVE' | 'INACTIVE') => data(http.patch<Amenity>(`/amenities/${id}/status`, { status })),
  remove: (id: number) => http.delete(`/amenities/${id}`),

  config: (id: number) => data(http.get<AmenityConfig>(`/amenities/${id}/config`)),
  saveConfig: (id: number, body: AmenityConfigRequest) => data(http.put<AmenityConfig>(`/amenities/${id}/config`, body)),
}

export const bookingApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Booking>>('/amenity-bookings', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Booking>(`/amenity-bookings/${id}`)),
  availability: (amenityId: number, from: string, days = 1) =>
    data(http.get<Availability>('/amenity-bookings/availability', { params: { amenityId, from, days } })),
  calendar: (amenityId: number, from: string, days = 7) =>
    data(http.get<BookingCalendar>('/amenity-bookings/calendar', { params: { amenityId, from, days } })),
  quote: (body: BookingRequest) => data(http.post<BookingQuote>('/amenity-bookings/quote', body)),
  create: (body: BookingRequest) => data(http.post<Booking>('/amenity-bookings', body)),
  approve: (id: number, version: number) => data(http.post<Booking>(`/amenity-bookings/${id}/approve`, { version })),
  reject: (id: number, reason: string, version: number) =>
    data(http.post<Booking>(`/amenity-bookings/${id}/reject`, { reason, version })),
  cancel: (id: number, reason: string, version: number) =>
    data(http.post<Booking>(`/amenity-bookings/${id}/cancel`, { reason, version })),
  complete: (id: number, version: number) => data(http.post<Booking>(`/amenity-bookings/${id}/complete`, { version })),
  pay: (id: number, method: PaymentMethod) => data(http.post<Booking>(`/amenity-bookings/${id}/pay`, { method })),
}
