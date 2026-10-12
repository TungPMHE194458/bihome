import { emptyMeter, meterSchema, meterToRequest, parseIndex } from '@/features/meter/schema'
import { isSpike } from '@/features/meter/constants'

describe('meter reading form', () => {
  it('parses indexes with comma or dot and at most two decimals', () => {
    expect(parseIndex('1450')).toBe(1450)
    expect(parseIndex('236,5')).toBe(236.5)
    expect(parseIndex('1.234')).toBeNull()
    expect(parseIndex('-1')).toBeNull()
  })

  it('requires an apartment and a new index not below the old one', () => {
    const r = meterSchema.safeParse({ ...emptyMeter('2026-09'), oldIndex: '120', newIndex: '100' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['apartmentId', 'newIndex'])
    expect(meterSchema.safeParse({ ...emptyMeter('2026-09'), apartmentId: 1, newIndex: '100' }).success).toBe(true)
  })

  it('only sends the old index for the first reading of a meter', () => {
    const v = { ...emptyMeter('2026-09', 'WATER'), apartmentId: 3, oldIndex: '10', newIndex: '25,5' }
    expect(meterToRequest(v, true)).toMatchObject({ oldIndex: 10, newIndex: 25.5, meterType: 'WATER' })
    expect(meterToRequest(v, false, 2)).toMatchObject({ oldIndex: null, version: 2 })
  })

  it('flags consumption above three times the average', () => {
    expect(isSpike(301, 100)).toBe(true)
    expect(isSpike(300, 100)).toBe(false)
    expect(isSpike(50, null)).toBe(false)
  })
})
