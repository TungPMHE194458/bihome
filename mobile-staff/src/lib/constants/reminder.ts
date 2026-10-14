import type { Chip } from '@/lib/constants/common'
import type { Audience, DeliveryStatus, Reminder, ReminderChannel, ReminderStatus, ScheduleType } from '@/lib/types'
import { formatDateTime } from '@/lib/format'

export const REMINDER_STATUS: Record<ReminderStatus, Chip> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đã lên lịch', tone: 'warning' },
  SENT: { label: 'Đã gửi', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'danger' },
}

export const REMINDER_CHANNEL: Record<ReminderChannel, string> = {
  IN_APP: 'Trong app',
  EMAIL: 'Email',
  SMS: 'SMS',
}

export const SCHEDULE_TYPE: Record<ScheduleType, string> = {
  NOW: 'Gửi ngay',
  ONCE: 'Hẹn giờ',
  MONTHLY: 'Lặp hằng tháng',
}

export const AUDIENCE: Record<Audience, string> = {
  ALL: 'Toàn tòa',
  FLOOR: 'Theo tầng',
  APARTMENT: 'Theo căn hộ',
  RESIDENT: 'Cư dân cụ thể',
}

export const DELIVERY_STATUS: Record<DeliveryStatus, Chip> = {
  SENT: { label: 'Đã gửi', tone: 'success' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
  FAILED: { label: 'Lỗi', tone: 'danger' },
}

export function scheduleText(r: Pick<Reminder, 'scheduleType' | 'scheduledAt' | 'monthlyDay' | 'monthlyTime' | 'endDate'>): string {
  if (r.scheduleType === 'NOW') return 'Gửi ngay'
  if (r.scheduleType === 'ONCE') return `Hẹn ${r.scheduledAt ? formatDateTime(r.scheduledAt) : ''}`
  const end = r.endDate ? ` (đến ${r.endDate.split('-').reverse().join('/')})` : ''
  return `Ngày ${r.monthlyDay} hằng tháng, ${r.monthlyTime}${end}`
}
