import { describe, expect, it } from 'vitest'
import { cardSchema, cardToRequest, emptyCard, issueSchema, normalizeCardNo } from '@/features/accesscard/schema'

const apartment = { id: 10, code: 'A0101', name: 'A-01.01', buildingId: 1, buildingName: 'Sky' }
const issues = (values: unknown) => {
  const r = cardSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('cardSchema', () => {
  it('accepts a stock card and requires an apartment for cards in use', () => {
    expect(issues({ ...emptyCard(), cardNo: 'SKY-0010' })).toEqual([])
    expect(issues({ ...emptyCard(), cardNo: 'SKY-0010', requireApartment: true })).toEqual(['apartment'])
  })

  it('links vehicles only to parking or multi cards and checks dates', () => {
    const base = { ...emptyCard(), cardNo: 'SKY-0010', apartment, assetItemId: '7' }
    expect(issues({ ...base, cardType: 'ELEVATOR' })).toEqual(['assetItemId'])
    expect(issues({ ...base, cardType: 'PARKING', issuedDate: '2026-10-11', expiryDate: '2026-10-01' })).toEqual(['expiryDate'])
    expect(issues({ ...base, cardType: 'PARKING', issueFee: '50000.5' })).toEqual(['issueFee'])
  })
})

describe('cardToRequest', () => {
  it('normalizes the card number and drops assignment without an apartment', () => {
    expect(
      cardToRequest({ ...emptyCard(), cardNo: ' sky 0010 ', resident: { id: 3, fullName: 'An', phone: '' }, assetItemId: '7', issueFee: '' }),
    ).toMatchObject({ cardNo: 'SKY0010', apartmentId: null, residentId: null, assetItemId: null, issueFee: 0 })
    expect(cardToRequest({ ...emptyCard(), cardNo: 'C1', cardType: 'DOOR', apartment, assetItemId: '7' })).toMatchObject({
      apartmentId: 10,
      assetItemId: null,
    })
  })

  it('normalizes like the backend', () => {
    expect(normalizeCardNo(' ab 12-34 ')).toBe('AB12-34')
  })
})

describe('issueSchema', () => {
  it('requires an apartment', () => {
    const r = issueSchema.safeParse({ apartment: null, resident: null, assetItemId: '', issuedDate: '', expiryDate: '', issueFee: '', note: '' })
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['apartment'])
  })
})
