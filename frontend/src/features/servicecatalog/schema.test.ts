import { describe, expect, it } from 'vitest'
import { emptyService, serviceSchema, serviceToRequest, serviceTypeToRequest, emptyServiceType } from '@/features/servicecatalog/schema'

const issues = (values: unknown) => {
  const r = serviceSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}
const valid = { ...emptyService(), name: 'Vệ sinh căn hộ', serviceTypeId: '1', unitPrice: '150000' }

describe('serviceSchema', () => {
  it('accepts a blank code (auto-generated) and requires type, price and unit', () => {
    expect(issues(valid)).toEqual([])
    expect(issues({ ...valid, serviceTypeId: '', unitPrice: '-1', unit: ' ' })).toEqual(['serviceTypeId', 'unitPrice', 'unit'])
    expect(issues({ ...valid, code: 'D' })).toEqual(['code'])
  })
})

describe('serviceToRequest', () => {
  it('sends null for a blank code and uppercases a typed one', () => {
    expect(serviceToRequest(valid)).toMatchObject({ code: null, serviceTypeId: 1, unitPrice: 150000, unit: 'lần', description: null })
    expect(serviceToRequest({ ...valid, code: ' dv-vs ' }).code).toBe('DV-VS')
  })

  it('trims the service type name', () => {
    expect(serviceTypeToRequest({ ...emptyServiceType(), name: ' Giặt là ' }, 2)).toEqual({
      name: 'Giặt là',
      description: null,
      status: 'ACTIVE',
      version: 2,
    })
  })
})
