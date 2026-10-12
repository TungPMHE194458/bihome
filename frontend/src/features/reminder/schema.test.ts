import { describe, expect, it } from 'vitest'
import { scheduleText } from '@/features/reminder/constants'
import { emptyReminder, htmlText, reminderSchema, reminderToRequest } from '@/features/reminder/schema'

const issues = (values: unknown) => {
  const r = reminderSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}
const valid = { ...emptyReminder(), title: 'Nhắc phí', content: '<p>Hạn <b>ngày 10</b></p>' }

describe('reminderSchema', () => {
  it('treats markup-only content as empty and requires targets / schedule fields', () => {
    expect(htmlText('<p>&nbsp;</p><br>')).toBe('')
    expect(issues(valid)).toEqual([])
    expect(issues({ ...valid, content: '<p> </p>' })).toEqual(['content'])
    expect(issues({ ...valid, audience: 'FLOOR', channels: [] })).toEqual(['channels', 'targets'])
    expect(issues({ ...valid, scheduleType: 'MONTHLY', monthlyDay: '32', monthlyTime: '' })).toEqual(['monthlyDay', 'monthlyTime'])
  })
})

describe('reminderToRequest', () => {
  it('sends only the fields of the chosen schedule', () => {
    const monthly = reminderToRequest(
      { ...valid, audience: 'FLOOR', targets: [{ value: '3', label: 'Tầng 3' }], scheduleType: 'MONTHLY', endDate: '2026-12-31' },
      false,
    )
    expect(monthly).toMatchObject({ targets: ['3'], monthlyDay: 5, monthlyTime: '09:00', endDate: '2026-12-31', scheduledAt: null })
    const once = reminderToRequest({ ...valid, scheduleType: 'ONCE', scheduledAt: '2030-01-02T08:30' }, true, 4)
    expect(once).toMatchObject({ scheduledAt: '2030-01-02T08:30:00+07:00', monthlyDay: null, draft: true, version: 4, targets: [] })
  })

  it('describes the schedule', () => {
    expect(scheduleText({ scheduleType: 'MONTHLY', monthlyDay: 5, monthlyTime: '09:00', endDate: '2026-12-31' })).toBe(
      'Ngày 5 hằng tháng, 09:00 (đến 31/12/2026)',
    )
    expect(scheduleText({ scheduleType: 'NOW' })).toBe('Gửi ngay')
  })
})
