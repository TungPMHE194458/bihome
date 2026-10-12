import { describe, expect, it } from 'vitest'
import { announcementSchema, announcementToRequest, emptyAnnouncement } from '@/features/notification/schema'
import dayjs from '@/lib/dayjs'

const valid = { ...emptyAnnouncement(), title: 'Cắt nước', content: 'Cắt nước 8h–11h' }
const issues = (values: unknown) => {
  const r = announcementSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('announcementSchema', () => {
  it('needs a future time only when scheduling', () => {
    expect(issues(valid)).toEqual([])
    expect(issues({ ...valid, mode: 'SCHEDULED' })).toEqual(['scheduledAt'])
    expect(issues({ ...valid, mode: 'SCHEDULED', scheduledAt: '2020-01-01T08:00' })).toEqual(['scheduledAt'])
    const later = dayjs().add(2, 'day').format('YYYY-MM-DDTHH:mm')
    expect(issues({ ...valid, mode: 'SCHEDULED', scheduledAt: later })).toEqual([])
  })
})

describe('announcementToRequest', () => {
  it('sends the schedule in Vietnam time and null for drafts / send now', () => {
    expect(announcementToRequest({ ...valid, mode: 'NOW', scheduledAt: '2030-05-01T08:30' }).scheduledAt).toBeNull()
    expect(announcementToRequest({ ...valid, mode: 'SCHEDULED', scheduledAt: '2030-05-01T08:30' }).scheduledAt).toBe(
      '2030-05-01T08:30:00+07:00',
    )
    expect(
      announcementToRequest({ ...valid, files: [{ fileId: 4, name: 'a.pdf', size: 10, contentType: 'application/pdf' }] }, 3),
    ).toMatchObject({ fileIds: [4], version: 3, title: 'Cắt nước' })
  })
})
