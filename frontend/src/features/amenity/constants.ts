import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { DayType, PriceUnit, Slot } from '@/features/amenity/types'

export const DAYS = [
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 7, label: 'Chủ nhật', short: 'CN' },
] as const

export const DAY_TYPE: Record<DayType, string> = { WEEKDAY: 'Ngày thường (T2–T6)', WEEKEND: 'Cuối tuần (T7, CN)' }
export const PRICE_UNIT: Record<PriceUnit, string> = { PER_BOOKING: 'Mỗi lượt', PER_PERSON: 'Mỗi người' }
export const DAY_TYPE_OPTIONS: SelectOption[] = (Object.keys(DAY_TYPE) as DayType[]).map((v) => ({ value: v, label: DAY_TYPE[v] }))
export const PRICE_UNIT_OPTIONS: SelectOption[] = (Object.keys(PRICE_UNIT) as PriceUnit[]).map((v) => ({ value: v, label: PRICE_UNIT[v] }))

export const AMENITY_STATUS: Record<'ACTIVE' | 'INACTIVE', ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}
export const AMENITY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]
export const APPROVAL_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Cần duyệt' },
  { value: 'false', label: 'Tự duyệt' },
]

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Sinh các lượt liên tiếp dài {@code minutes} phút trong [open, close) cho các thứ đã chọn (lượt lẻ cuối bị bỏ). */
export function generateSlots(days: number[], open: string, close: string, minutes: number): Slot[] {
  const result: Slot[] = []
  for (const day of days) {
    for (let start = toMinutes(open); start + minutes <= toMinutes(close); start += minutes) {
      result.push({ dayOfWeek: day, startTime: toTime(start), endTime: toTime(start + minutes), capacity: null })
    }
  }
  return result
}

export const sortSlots = (slots: Slot[]) =>
  [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))

/** Mô tả lỗi chồng khung giờ đầu tiên (giống kiểm tra ở backend), không có thì null. */
export function findOverlap(slots: Slot[]): string | null {
  const sorted = sortSlots(slots)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.dayOfWeek === cur.dayOfWeek && cur.startTime < prev.endTime) {
      const day = DAYS[cur.dayOfWeek - 1].label
      return `${day}: khung ${prev.startTime}–${prev.endTime} và ${cur.startTime}–${cur.endTime} bị chồng nhau.`
    }
  }
  return null
}
