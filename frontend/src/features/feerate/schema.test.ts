import { formToRequest, ratesToForm, tieredCost, validateRates } from '@/features/feerate/schema'
import type { FeeRates } from '@/features/feerate/types'

const rates: FeeRates = {
  buildingId: 1,
  buildingName: 'Tower',
  vatPercent: 8,
  dueDay: 15,
  managementRates: [{ apartmentType: 'APARTMENT', unitPrice: 12000 }],
  electricTiers: [
    { upTo: 50, unitPrice: 1806 },
    { upTo: 100, unitPrice: 1866 },
    { upTo: null, unitPrice: 2167 },
  ],
  waterTiers: [{ upTo: null, unitPrice: 15000 }],
  parkingRates: [{ assetCategoryId: 7, unitPrice: 120000 }],
  otherCharges: [{ name: 'Phí vệ sinh', amount: 30000 }],
  categories: [{ id: 7, name: 'Xe máy', unit: 'chiếc' }],
  version: 3,
}

describe('fee rate form', () => {
  it('round-trips rates and drops empty values', () => {
    const form = ratesToForm(rates)
    form.management.PENTHOUSE = ''
    expect(validateRates(form)).toEqual({})
    expect(formToRequest(form, rates.version)).toEqual({
      vatPercent: 8,
      dueDay: 15,
      managementRates: [{ apartmentType: 'APARTMENT', unitPrice: 12000 }],
      electricTiers: rates.electricTiers,
      waterTiers: rates.waterTiers,
      parkingRates: [{ assetCategoryId: 7, unitPrice: 120000 }],
      otherCharges: [{ name: 'Phí vệ sinh', amount: 30000 }],
      version: 3,
    })
  })

  it('rejects tiers that do not increase', () => {
    const form = ratesToForm(rates)
    form.electric[1].upTo = '40'
    expect(validateRates(form)).toEqual({ 'electric.1.upTo': 'Mốc phải lớn hơn bậc trước' })
  })

  it('previews tiered cost', () => {
    const form = ratesToForm(rates)
    expect(tieredCost(250, form.electric)).toBe(50 * 1806 + 50 * 1866 + 150 * 2167)
    expect(tieredCost(30, form.electric)).toBe(30 * 1806)
  })
})
