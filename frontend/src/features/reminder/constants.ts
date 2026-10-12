import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { Reminder, ReminderChannel, ReminderStatus, ScheduleType } from '@/features/reminder/types'
import { AUDIENCE_LABEL, type Audience } from '@/features/resident/components/AudienceFields'
import { formatDate, formatDateTime } from '@/lib/format'

export const REMINDER_STATUS: Record<ReminderStatus, ChipStyle> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đã lên lịch', tone: 'warning' },
  SENT: { label: 'Đã gửi', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'danger' },
}

export const CHANNEL_LABEL: Record<ReminderChannel, string> = { IN_APP: 'Trong app', EMAIL: 'Email', SMS: 'SMS' }
export const SCHEDULE_LABEL: Record<ScheduleType, string> = { NOW: 'Gửi ngay', ONCE: 'Hẹn giờ', MONTHLY: 'Lặp hằng tháng' }

const options = <K extends string>(map: Record<K, string | ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })

export const REMINDER_STATUS_OPTIONS = options(REMINDER_STATUS)
export const SCHEDULE_OPTIONS = options(SCHEDULE_LABEL)
export const AUDIENCE_OPTIONS = options<Audience>(AUDIENCE_LABEL)

/** "Ngày 5 hằng tháng, 09:00 (đến 31/12/2026)" / "Hẹn 12/10/2026 08:00" / "Gửi ngay". */
export function scheduleText(r: Pick<Reminder, 'scheduleType' | 'scheduledAt' | 'monthlyDay' | 'monthlyTime' | 'endDate'>): string {
  if (r.scheduleType === 'ONCE') return `Hẹn ${formatDateTime(r.scheduledAt)}`
  if (r.scheduleType === 'MONTHLY') {
    return `Ngày ${r.monthlyDay} hằng tháng, ${r.monthlyTime}${r.endDate ? ` (đến ${formatDate(r.endDate)})` : ''}`
  }
  return 'Gửi ngay'
}
