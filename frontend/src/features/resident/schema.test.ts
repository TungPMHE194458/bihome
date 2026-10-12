import { describe, expect, it } from 'vitest'
import {
  emptyLink,
  emptyResident,
  linkSchema,
  linkToRequest,
  residentSchema,
  residentToRequest,
} from '@/features/resident/schema'

const apartment = { id: 10, code: 'A0101', name: 'A-01.01', buildingId: 1, buildingName: 'Sky' }

const valid = () => ({
  ...emptyResident(apartment),
  fullName: ' Nguyễn Văn An ',
  phone: '0912345678',
  residence: { ...emptyLink(apartment), role: 'OWNER' as const },
})

const issues = (values: unknown) => {
  const result = residentSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('residentSchema', () => {
  it('accepts a minimal resident with a first apartment', () => {
    expect(issues(valid())).toEqual([])
  })

  it('requires the apartment and role of the first residence', () => {
    expect(issues({ ...valid(), residence: emptyLink() })).toEqual(['residence.apartment', 'residence.role'])
  })

  it('validates the id number by document type after removing spaces', () => {
    expect(issues({ ...valid(), idNumber: '001 085 012 345' })).toEqual([])
    expect(issues({ ...valid(), idNumber: '12345' })).toEqual(['idNumber'])
    expect(issues({ ...valid(), idType: 'PASSPORT', idNumber: 'c1234567' })).toEqual([])
    expect(issues({ ...valid(), idType: '', idNumber: 'C1234567' })).toEqual(['idType'])
  })

  it('rejects a household head that is not an owner and a move-out before move-in', () => {
    const r = linkSchema.safeParse({
      ...emptyLink(apartment),
      role: 'TENANT',
      householdHead: true,
      moveInDate: '2025-05-01',
      moveOutDate: '2025-04-30',
    })
    expect(r.success ? [] : r.error.issues.map((i) => i.path.join('.'))).toEqual(['householdHead', 'moveOutDate'])
  })
})

describe('residentToRequest', () => {
  it('normalizes fields and drops id details when there is no id number', () => {
    const body = residentToRequest({ ...valid(), code: ' cd-01 ', idIssuePlace: 'Hà Nội', email: ' ' })
    expect(body).toMatchObject({
      code: 'CD-01',
      fullName: 'Nguyễn Văn An',
      email: null,
      idType: null,
      idNumber: null,
      idIssuePlace: null,
      nationality: 'Việt Nam',
      apartment: { apartmentId: 10, role: 'OWNER', householdHead: false, residenceStatus: 'LIVING' },
    })
  })

  it('omits the apartment when editing', () => {
    expect(residentToRequest({ ...valid(), residence: null }, 3)).toMatchObject({ apartment: undefined, version: 3 })
  })
})

describe('linkToRequest', () => {
  it('only keeps the household head flag for owners and reopens a residence without move-out date', () => {
    expect(linkToRequest({ ...emptyLink(apartment), role: 'FAMILY', householdHead: true })).toMatchObject({
      householdHead: false,
    })
    expect(linkToRequest({ ...emptyLink(apartment), role: 'OWNER', residenceStatus: 'MOVED_OUT' })).toMatchObject({
      residenceStatus: 'LIVING',
    })
  })
})
