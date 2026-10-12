import { previewContent, vietQrSchema, vietQrToForm } from '@/features/vietqr/schema'

describe('VietQR settings', () => {
  it('requires the notice-code placeholder in the transfer template', () => {
    const base = { ...vietQrToForm(), bankBin: '970436', accountNo: '0123456789', accountName: 'BQL' }
    expect(vietQrSchema.safeParse(base).success).toBe(true)
    const r = vietQrSchema.safeParse({ ...base, contentTemplate: 'Thanh toan phi' })
    expect(r.error?.issues[0].path).toEqual(['contentTemplate'])
    expect(vietQrSchema.safeParse({ ...base, bankBin: '9704' }).success).toBe(false)
  })

  it('previews the transfer content like the backend sanitizer', () => {
    expect(previewContent('Bihome đóng phí {MA_THONG_BAO}!')).toBe('BIHOME DONG PHI TB-261001-001')
  })
})
