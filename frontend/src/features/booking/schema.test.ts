import { describe, expect, it } from 'vitest'
import { formatPrice } from '@/features/booking/constants'
import { bookingSchema, bookingToRequest, canQuote, emptyBooking } from '@/features/booking/schema'

describe('bookingSchema', () => {
  it('requires amenity, date, slot and apartment', () => {
    const r = bookingSchema.safeParse(emptyBooking())
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['amenityId', 'bookingDate', 'slot', 'apartment'])
    expect(canQuote(emptyBooking())).toBe(false)
  })

  it('splits the slot and uppercases the voucher', () => {
    const v = { ...emptyBooking(), amenityId: 2, bookingDate: '2026-10-12', slot: '18:00-19:00',
      apartment: { id: 6, code: 'A0304', name: 'A-03.04', buildingId: 4, buildingName: 'Sky' }, peopleCount: '3', voucherCode: ' hoboi10 ' }
    expect(canQuote(v)).toBe(true)
    expect(bookingToRequest(v)).toEqual({
      amenityId: 2,
      apartmentId: 6,
      residentId: null,
      bookingDate: '2026-10-12',
      startTime: '18:00',
      endTime: '19:00',
      peopleCount: 3,
      voucherCode: 'HOBOI10',
      note: null,
    })
  })
})

describe('formatPrice', () => {
  it('shows free slots and the price unit', () => {
    expect(formatPrice(0)).toBe('Miễn phí')
    expect(formatPrice(20000, 'PER_PERSON')).toMatch(/^20\.000.+\/ người$/)
    expect(formatPrice(300000, 'PER_BOOKING')).toMatch(/\/ lượt$/)
  })
})
