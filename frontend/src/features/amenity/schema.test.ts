import { describe, expect, it } from 'vitest'
import { findOverlap, generateSlots, sortSlots } from '@/features/amenity/constants'
import { amenitySchema, amenityToRequest, emptyAmenity } from '@/features/amenity/schema'

describe('generateSlots', () => {
  it('fills the opening hours with whole slots and drops a partial last slot', () => {
    expect(generateSlots([1], '06:00', '08:30', 60)).toEqual([
      { dayOfWeek: 1, startTime: '06:00', endTime: '07:00', capacity: null },
      { dayOfWeek: 1, startTime: '07:00', endTime: '08:00', capacity: null },
    ])
    expect(generateSlots([6, 7], '16:00', '22:00', 180).map((s) => `${s.dayOfWeek} ${s.startTime}`)).toEqual([
      '6 16:00',
      '6 19:00',
      '7 16:00',
      '7 19:00',
    ])
  })
})

describe('findOverlap', () => {
  it('reports overlapping slots on the same day only', () => {
    expect(
      findOverlap([
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '09:30' },
      ]),
    ).toBe('Thứ 3: khung 08:00–09:30 và 09:00–10:00 bị chồng nhau.')
    expect(
      findOverlap([
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:30' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
        { dayOfWeek: 1, startTime: '09:30', endTime: '10:00' },
      ]),
    ).toBeNull()
  })

  it('sorts by day then start time', () => {
    expect(sortSlots([{ dayOfWeek: 3, startTime: '08:00', endTime: '09:00' }, { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }])[0].dayOfWeek).toBe(1)
  })
})

describe('amenitySchema', () => {
  it('requires closing after opening and a positive capacity', () => {
    const r = amenitySchema.safeParse({ ...emptyAmenity(), code: 'POOL', name: 'Hồ bơi', capacity: '0', closeTime: '05:00' })
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['capacity', 'closeTime'])
  })

  it('uppercases the code', () => {
    expect(amenityToRequest({ ...emptyAmenity(), code: ' pool ', name: 'Hồ bơi' })).toMatchObject({ code: 'POOL', capacity: 20, location: null })
  })
})
