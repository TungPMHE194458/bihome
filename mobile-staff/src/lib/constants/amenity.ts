import type { Chip } from '@/lib/constants/common'
import type { BookingStatus, DayType, PriceUnit } from '@/lib/types'

export const AMENITY_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const APPROVAL_LABEL: Record<'true' | 'false', string> = {
  true: 'Cần duyệt',
  false: 'Tự duyệt',
}

export const DAY_TYPE: Record<DayType, string> = {
  WEEKDAY: 'Ngày thường (T2–T6)',
  WEEKEND: 'Cuối tuần (T7, CN)',
}

export const PRICE_UNIT: Record<PriceUnit, string> = {
  PER_BOOKING: 'Mỗi lượt',
  PER_PERSON: 'Mỗi người',
}

export const DAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 7, label: 'Chủ nhật', short: 'CN' },
]

export const BOOKING_STATUS: Record<BookingStatus, Chip> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
}

/** "20.000 ₫ / người" · "Miễn phí". */
export function formatPrice(price: number, unit?: string | null, money?: (n: number) => string): string {
  if (!price) return 'Miễn phí'
  const m = money ?? ((n: number) => `${n} đ`)
  return `${m(price)} / ${unit === 'PER_PERSON' ? 'người' : 'lượt'}`
}
