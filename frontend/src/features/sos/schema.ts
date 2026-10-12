import { z } from 'zod'
import type { SosRequest } from '@/features/sos/types'

export const sosSchema = z
  .object({
    alertType: z.enum(['FIRE', 'MEDICAL', 'SECURITY', 'ELEVATOR', 'OTHER']),
    apartmentId: z.number().nullable(),
    reporterName: z.string().max(150, 'Tối đa 150 ký tự'),
    reporterPhone: z.string().regex(/^$|^[0-9+ .()-]{8,20}$/, 'Số điện thoại không hợp lệ'),
    location: z.string().max(200, 'Tối đa 200 ký tự'),
    description: z.string().max(1000, 'Tối đa 1000 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.apartmentId == null && !v.location.trim()) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'Nhập vị trí hoặc chọn căn hộ' })
    }
  })

export type SosFormValues = z.infer<typeof sosSchema>

export const emptySos = (): SosFormValues => ({
  alertType: 'MEDICAL',
  apartmentId: null,
  reporterName: '',
  reporterPhone: '',
  location: '',
  description: '',
})

export function sosToRequest(v: SosFormValues): SosRequest {
  const t = (s: string) => s.trim() || null
  return {
    alertType: v.alertType,
    apartmentId: v.apartmentId,
    reporterName: t(v.reporterName),
    reporterPhone: t(v.reporterPhone),
    location: t(v.location),
    description: t(v.description),
  }
}
