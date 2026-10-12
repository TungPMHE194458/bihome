import { z } from 'zod'
import type { ApartmentOption } from '@/features/apartment/types'
import type { BookingRequest } from '@/features/booking/types'
import type { ResidentOption } from '@/features/resident/components/ResidentPicker'

export const bookingSchema = z
  .object({
    amenityId: z.number().nullable(),
    bookingDate: z.string(),
    /** "HH:mm-HH:mm" của khung đã chọn. */
    slot: z.string(),
    apartment: z.custom<ApartmentOption>().nullable(),
    resident: z.custom<ResidentOption>().nullable(),
    peopleCount: z.string().trim().regex(/^[1-9]\d{0,3}$/, 'Số người là số nguyên dương'),
    voucherCode: z.string().trim().max(30, 'Mã voucher tối đa 30 ký tự'),
    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.amenityId == null) ctx.addIssue({ code: 'custom', path: ['amenityId'], message: 'Vui lòng chọn tiện ích' })
    if (!v.bookingDate) ctx.addIssue({ code: 'custom', path: ['bookingDate'], message: 'Vui lòng chọn ngày sử dụng' })
    if (!v.slot) ctx.addIssue({ code: 'custom', path: ['slot'], message: 'Vui lòng chọn khung giờ' })
    if (v.apartment == null) ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Vui lòng chọn căn hộ' })
  })
export type BookingFormValues = z.infer<typeof bookingSchema>

export const emptyBooking = (preset: Partial<BookingFormValues> = {}): BookingFormValues => ({
  amenityId: null,
  bookingDate: '',
  slot: '',
  apartment: null,
  resident: null,
  peopleCount: '1',
  voucherCode: '',
  note: '',
  ...preset,
})

/** Chỉ gọi khi form hợp lệ (đủ tiện ích, ngày, khung giờ, căn hộ). */
export const bookingToRequest = (v: BookingFormValues): BookingRequest => {
  const [startTime, endTime] = v.slot.split('-')
  return {
    amenityId: v.amenityId!,
    apartmentId: v.apartment!.id,
    residentId: v.resident?.id ?? null,
    bookingDate: v.bookingDate,
    startTime,
    endTime,
    peopleCount: Number(v.peopleCount),
    voucherCode: v.voucherCode.trim() ? v.voucherCode.trim().toUpperCase() : null,
    note: v.note.trim() || null,
  }
}

/** Đủ thông tin để tính thử phí. */
export const canQuote = (v: BookingFormValues) =>
  v.amenityId != null && !!v.bookingDate && !!v.slot && v.apartment != null && /^[1-9]\d{0,3}$/.test(v.peopleCount.trim())
