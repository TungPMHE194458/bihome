import { describe, expect, it } from 'vitest'
import { assignmentChanges, emptyUser, userSchema, userToCreateRequest, userToForm } from '@/features/user/schema'
import type { UserDetail } from '@/features/user/types'

const detail: UserDetail = {
  id: 3,
  username: 'nv.an',
  email: 'an@bihome.local',
  status: 'ACTIVE',
  mustChangePassword: false,
  profile: { fullName: 'Nguyễn Văn An' },
  roles: [{ id: 3, code: 'STAFF', name: 'Nhân viên vận hành' }],
  buildingIds: [2, 1],
  createdAt: '2026-10-01T08:00:00+07:00',
  updatedAt: '2026-10-01T08:00:00+07:00',
  version: 4,
}

const issues = (values: unknown) => {
  const r = userSchema.safeParse(values)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('userSchema', () => {
  it('checks the username only when creating', () => {
    const base = { ...emptyUser(), fullName: 'A', email: 'a@b.vn' }
    expect(issues({ ...base, username: 'a b' })).toEqual(['username'])
    expect(issues({ ...base, username: 'nv.an' })).toEqual([])
    expect(issues({ ...userToForm(detail), username: 'không đổi được' })).toEqual([])
    expect(issues({ ...base, username: 'nv.an', roleCodes: [], phone: '123' })).toEqual(['phone', 'roleCodes'])
  })
})

describe('assignments', () => {
  it('only reassigns roles / buildings that changed', () => {
    const form = userToForm(detail)
    expect(assignmentChanges(form, detail)).toEqual({ roleCodes: undefined, buildingIds: undefined })
    expect(assignmentChanges({ ...form, buildingIds: [1] }, detail)).toEqual({ roleCodes: undefined, buildingIds: [1] })
    expect(assignmentChanges({ ...form, roleCodes: ['SUPER_ADMIN'] }, detail)).toEqual({ roleCodes: ['SUPER_ADMIN'], buildingIds: [] })
  })

  it('does not send buildings for a system admin', () => {
    const v = { ...emptyUser(), username: 'boss', fullName: 'Sếp', email: 'boss@b.vn', roleCodes: ['SUPER_ADMIN'], buildingIds: [1] }
    expect(userToCreateRequest(v)).toMatchObject({ roleCodes: ['SUPER_ADMIN'], buildingIds: [], phone: null, gender: null })
  })
})
