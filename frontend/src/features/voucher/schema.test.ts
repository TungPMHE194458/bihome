import { describe, expect, it } from 'vitest'
import { formatDiscount } from '@/features/voucher/constants'
import { emptyVoucher, voucherSchema, voucherToRequest } from '@/features/voucher/schema'

const issues = (values: unknown) => {
  const r = voucherSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}
const valid = { ...emptyVoucher(), code: 'HOBOI10', name: 'Giảm 10%', discountValue: '10' }

describe('voucherSchema', () => {
  it('accepts a percent voucher', () => {
    expect(issues(valid)).toEqual([])
  })

  it('checks percent ≤ 100, whole amounts, dates and per-apartment limit', () => {
    expect(issues({ ...valid, discountValue: '120' })).toEqual(['discountValue'])
    expect(issues({ ...valid, discountType: 'AMOUNT', discountValue: '20000.5' })).toEqual(['discountValue'])
    expect(issues({ ...valid, validFrom: '2026-10-11', validTo: '2026-10-01' })).toEqual(['validTo'])
    expect(issues({ ...valid, totalQuantity: '5', perApartmentLimit: '10' })).toEqual(['perApartmentLimit'])
    expect(issues({ ...valid, totalQuantity: '0' })).toEqual(['totalQuantity'])
  })
})

describe('voucherToRequest', () => {
  it('uppercases the code, drops max discount for amounts and blank limits', () => {
    expect(
      voucherToRequest({ ...valid, code: ' hoboi10 ', discountType: 'AMOUNT', discountValue: '50000', maxDiscount: '10000' }),
    ).toMatchObject({ code: 'HOBOI10', discountValue: 50000, maxDiscount: null, totalQuantity: null, perApartmentLimit: null })
  })
})

describe('voucher targets', () => {
  it('only sends targets that match the scope', () => {
    const both = { ...valid, amenityIds: [3], serviceIds: [5] }
    expect(voucherToRequest({ ...both, applyScope: 'AMENITY' })).toMatchObject({ amenityIds: [3], serviceIds: [] })
    expect(voucherToRequest({ ...both, applyScope: 'SERVICE' })).toMatchObject({ amenityIds: [], serviceIds: [5] })
    expect(voucherToRequest({ ...both, applyScope: 'ALL' })).toMatchObject({ amenityIds: [3], serviceIds: [5] })
  })
})

describe('formatDiscount', () => {
  it('describes percent and amount discounts', () => {
    expect(formatDiscount({ discountType: 'PERCENT', discountValue: 10, maxDiscount: 50000 })).toMatch(/^10% \(tối đa 50\.000/)
    expect(formatDiscount({ discountType: 'PERCENT', discountValue: 5 })).toBe('5%')
    expect(formatDiscount({ discountType: 'AMOUNT', discountValue: 20000 })).toMatch(/^20\.000/)
  })
})
