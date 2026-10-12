import { z } from 'zod'
import type { UploadedFile } from '@/components/form/FormFileUpload'
import type { Announcement, AnnouncementRequest } from '@/features/notification/api'
import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

/** DRAFT lưu nháp · SCHEDULED hẹn giờ · NOW gửi ngay sau khi lưu. */
export type SendMode = 'DRAFT' | 'SCHEDULED' | 'NOW'

export const announcementSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
    content: z.string().trim().min(1, 'Nội dung không được để trống').max(4000, 'Nội dung tối đa 4000 ký tự'),
    category: z.enum(['GENERAL', 'MAINTENANCE', 'EVENT', 'FEE', 'EMERGENCY']),
    audience: z.enum(['STAFF', 'RESIDENT', 'ALL']),
    mode: z.enum(['DRAFT', 'SCHEDULED', 'NOW']),
    /** 'YYYY-MM-DDTHH:mm' (giờ Việt Nam) khi hẹn giờ. */
    scheduledAt: z.string(),
    files: z.array(z.custom<UploadedFile>()).max(10, 'Tối đa 10 tệp đính kèm'),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== 'SCHEDULED') return
    if (!v.scheduledAt) {
      ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Chọn thời điểm gửi' })
    } else if (!dayjs.tz(v.scheduledAt, APP_TIMEZONE).isAfter(dayjs())) {
      ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Thời điểm gửi phải sau thời điểm hiện tại.' })
    }
  })
export type AnnouncementFormValues = z.infer<typeof announcementSchema>

export const emptyAnnouncement = (): AnnouncementFormValues => ({
  title: '',
  content: '',
  category: 'GENERAL',
  audience: 'ALL',
  mode: 'DRAFT',
  scheduledAt: '',
  files: [],
})

export const announcementToForm = (a: Announcement): AnnouncementFormValues => ({
  title: a.title,
  content: a.content,
  category: a.category,
  audience: a.audience,
  mode: a.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT',
  scheduledAt: a.scheduledAt ? dayjs(a.scheduledAt).tz(APP_TIMEZONE).format('YYYY-MM-DDTHH:mm') : '',
  files: a.attachments.map(({ fileId, name, size, contentType }) => ({ fileId, name, size, contentType })),
})

export const announcementToRequest = (v: AnnouncementFormValues, version?: number): AnnouncementRequest => ({
  title: v.title.trim(),
  content: v.content.trim(),
  category: v.category,
  audience: v.audience,
  scheduledAt: v.mode === 'SCHEDULED' ? dayjs.tz(v.scheduledAt, APP_TIMEZONE).format() : null,
  fileIds: v.files.map((f) => f.fileId),
  version,
})
