import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import { PRICE_UNIT } from '@/features/amenity/constants'
import type { Booking, BookingStatus, SlotAvailability } from '@/features/booking/types'
import { formatCurrency } from '@/lib/format'

export const BOOKING_STATUS: Record<BookingStatus, ChipStyle> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
}

export const BOOKING_STATUS_OPTIONS: SelectOption[] = (Object.keys(BOOKING_STATUS) as BookingStatus[]).map((value) => ({
  value,
  label: BOOKING_STATUS[value].label,
}))

/** "20.000 ₫ / người" · "Miễn phí". */
export function formatPrice(price: number, unit?: string | null): string {
  if (!price) return 'Miễn phí'
  return `${formatCurrency(price)} / ${unit === 'PER_PERSON' ? 'người' : 'lượt'}`
}

export const formatSlotPrice = (s: Pick<SlotAvailability, 'price' | 'priceUnit'>) => formatPrice(s.price, s.priceUnit)

export const priceUnitLabel = (unit?: string | null) => (unit ? PRICE_UNIT[unit as keyof typeof PRICE_UNIT] : '')

/** "18:00–19:00 · 12/10/2026" */
export const slotText = (b: Pick<Booking, 'startTime' | 'endTime' | 'bookingDate'>, formatDate: (d: string) => string) =>
  `${b.startTime}–${b.endTime} · ${formatDate(b.bookingDate)}`
