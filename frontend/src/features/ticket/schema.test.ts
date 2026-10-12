import { describe, expect, it } from 'vitest'
import { categorySchema, categoryToRequest, emptyCategory, emptyTicket, ticketSchema, ticketToRequest } from '@/features/ticket/schema'
import { NEXT_STATUSES, formatHours } from '@/features/ticket/constants'

const issues = (schema: typeof categorySchema | typeof ticketSchema, values: unknown) => {
  const r = schema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('categorySchema', () => {
  it('requires positive whole hours and resolution not shorter than response', () => {
    expect(issues(categorySchema, { ...emptyCategory(), name: 'Điện' })).toEqual([])
    expect(issues(categorySchema, { ...emptyCategory(), name: 'Điện', responseSlaHours: '1.5' })).toEqual(['responseSlaHours'])
    expect(issues(categorySchema, { ...emptyCategory(), name: 'Điện', responseSlaHours: '48', resolutionSlaHours: '24' })).toEqual([
      'resolutionSlaHours',
    ])
  })

  it('converts to the request', () => {
    expect(categoryToRequest({ ...emptyCategory(), name: ' Điện ', defaultAssigneeId: '7' }, 2)).toEqual({
      name: 'Điện',
      description: null,
      responseSlaHours: 4,
      resolutionSlaHours: 24,
      defaultAssigneeId: 7,
      status: 'ACTIVE',
      version: 2,
    })
  })
})

describe('ticketSchema', () => {
  it('requires title and category', () => {
    expect(issues(ticketSchema, emptyTicket())).toEqual(['title', 'categoryId'])
  })

  it('sends ids of the apartment, resident, assignee and files', () => {
    expect(
      ticketToRequest({
        ...emptyTicket(),
        title: ' Mất điện ',
        categoryId: '3',
        apartment: { id: 10, code: 'A0101', name: 'A-01.01', buildingId: 1, buildingName: 'Sky' },
        resident: { id: 5, fullName: 'An', phone: '0900000001' },
        assigneeId: '7',
        files: [{ fileId: 99, name: 'a.png', size: 1, contentType: 'image/png' }],
      }),
    ).toEqual({
      title: 'Mất điện',
      description: null,
      categoryId: 3,
      apartmentId: 10,
      residentId: 5,
      channel: 'HOTLINE',
      priority: 'MEDIUM',
      assigneeId: 7,
      fileIds: [99],
      version: undefined,
    })
  })
})

describe('constants', () => {
  it('formats SLA hours', () => {
    expect(formatHours(4)).toBe('4 giờ')
    expect(formatHours(48)).toBe('2 ngày')
    expect(formatHours(28)).toBe('1 ngày 4 giờ')
  })

  it('has no transitions out of final statuses', () => {
    expect(NEXT_STATUSES.CLOSED).toEqual([])
    expect(NEXT_STATUSES.CANCELLED).toEqual([])
    expect(NEXT_STATUSES.NEW).not.toContain('DONE')
  })
})
