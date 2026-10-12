import { settingsSchema, settingsToForm, settingsToRequest } from '@/features/setting/schema'

const base = settingsToForm({ maxFailedLogins: 5, lockMinutes: 15, feeNoticeEmail: true, version: 2 })

describe('general settings form', () => {
  it('accepts empty optional fields and converts numbers', () => {
    expect(settingsSchema.safeParse(base).success).toBe(true)
    expect(settingsToRequest({ ...base, companyName: ' BiHome ', lockMinutes: '30' }, 2)).toMatchObject({
      companyName: 'BiHome',
      taxCode: null,
      lockMinutes: 30,
      maxFailedLogins: 5,
      version: 2,
    })
  })

  it('validates tax code, email and login policy ranges', () => {
    const r = settingsSchema.safeParse({ ...base, taxCode: '123', email: 'x@', maxFailedLogins: '2', lockMinutes: 'abc' })
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['taxCode', 'email', 'maxFailedLogins', 'lockMinutes'])
  })
})
