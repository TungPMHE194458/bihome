import { z } from 'zod'
import type { PickItem } from '@/components/form/AsyncMultiPicker'
import type { Reminder, ReminderRequest } from '@/features/reminder/types'
import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

/** Văn bản thuần của HTML soạn thảo (kiểm tra trống / độ dài). */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const reminderSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
    content: z.string(),
    audience: z.enum(['ALL', 'FLOOR', 'APARTMENT', 'RESIDENT']),
    targets: z.array(z.custom<PickItem>()),
    channels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS'])).min(1, 'Chọn ít nhất một kênh gửi'),
    scheduleType: z.enum(['NOW', 'ONCE', 'MONTHLY']),
    /** 'YYYY-MM-DDTHH:mm' giờ Việt Nam */
    scheduledAt: z.string(),
    monthlyDay: z.string(),
    monthlyTime: z.string(),
    endDate: z.string(),
  })
  .superRefine((v, ctx) => {
    const text = htmlText(v.content)
    if (!text) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Nội dung không được để trống' })
    else if (text.length > 5000) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Nội dung tối đa 5000 ký tự' })
    if (v.audience !== 'ALL' && v.targets.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['targets'], message: 'Chọn ít nhất một đối tượng' })
    }
    if (v.scheduleType === 'ONCE' && !v.scheduledAt) {
      ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Chọn thời điểm gửi' })
    }
    if (v.scheduleType === 'MONTHLY') {
      const day = Number(v.monthlyDay)
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        ctx.addIssue({ code: 'custom', path: ['monthlyDay'], message: 'Ngày từ 1 đến 31' })
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.monthlyTime)) {
        ctx.addIssue({ code: 'custom', path: ['monthlyTime'], message: 'Chọn giờ gửi' })
      }
    }
  })
export type ReminderFormValues = z.infer<typeof reminderSchema>

export const emptyReminder = (): ReminderFormValues => ({
  title: '',
  content: '',
  audience: 'ALL',
  targets: [],
  channels: ['IN_APP'],
  scheduleType: 'NOW',
  scheduledAt: '',
  monthlyDay: '5',
  monthlyTime: '09:00',
  endDate: '',
})

export const reminderToForm = (r: Reminder): ReminderFormValues => ({
  title: r.title,
  content: r.content,
  audience: r.audience,
  targets: r.targetItems,
  channels: r.channels,
  scheduleType: r.scheduleType,
  scheduledAt: r.scheduledAt ? dayjs(r.scheduledAt).tz(APP_TIMEZONE).format('YYYY-MM-DDTHH:mm') : '',
  monthlyDay: r.monthlyDay != null ? String(r.monthlyDay) : '5',
  monthlyTime: r.monthlyTime ?? '09:00',
  endDate: r.endDate ?? '',
})

export const reminderToRequest = (v: ReminderFormValues, draft: boolean, version?: number): ReminderRequest => ({
  title: v.title.trim(),
  content: v.content,
  audience: v.audience,
  targets: v.audience === 'ALL' ? [] : v.targets.map((t) => t.value),
  channels: v.channels,
  scheduleType: v.scheduleType,
  scheduledAt: v.scheduleType === 'ONCE' && v.scheduledAt ? dayjs.tz(v.scheduledAt, APP_TIMEZONE).format() : null,
  monthlyDay: v.scheduleType === 'MONTHLY' ? Number(v.monthlyDay) : null,
  monthlyTime: v.scheduleType === 'MONTHLY' ? v.monthlyTime : null,
  endDate: v.scheduleType === 'MONTHLY' && v.endDate ? v.endDate : null,
  draft,
  version,
})
