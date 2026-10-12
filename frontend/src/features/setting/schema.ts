import { z } from 'zod'
import type { SettingsRequest, SystemSettings } from '@/features/setting/api'

const range = (min: number, max: number, unit: string) =>
  z.string().refine((v) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max, `Từ ${min} đến ${max} ${unit}`)

export const settingsSchema = z.object({
  companyName: z.string().max(200, 'Tối đa 200 ký tự'),
  taxCode: z.string().regex(/^$|^\d{10}(-\d{3})?$/, 'Mã số thuế gồm 10 số (hoặc 10 số-3 số chi nhánh)'),
  address: z.string().max(300, 'Tối đa 300 ký tự'),
  hotline: z.string().regex(/^$|^[0-9+ .()-]{4,20}$/, 'Hotline không hợp lệ'),
  email: z.union([z.literal(''), z.email('Email không hợp lệ')]),
  website: z.string().max(150, 'Tối đa 150 ký tự'),
  documentFooter: z.string().max(300, 'Tối đa 300 ký tự'),
  maxFailedLogins: range(3, 20, 'lần'),
  lockMinutes: range(1, 1440, 'phút'),
  feeNoticeEmail: z.boolean(),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>

export function settingsToForm(s: SystemSettings): SettingsFormValues {
  return {
    companyName: s.companyName ?? '',
    taxCode: s.taxCode ?? '',
    address: s.address ?? '',
    hotline: s.hotline ?? '',
    email: s.email ?? '',
    website: s.website ?? '',
    documentFooter: s.documentFooter ?? '',
    maxFailedLogins: String(s.maxFailedLogins),
    lockMinutes: String(s.lockMinutes),
    feeNoticeEmail: s.feeNoticeEmail,
  }
}

export function settingsToRequest(v: SettingsFormValues, version: number): SettingsRequest {
  const t = (s: string) => s.trim() || null
  return {
    companyName: t(v.companyName),
    taxCode: t(v.taxCode),
    address: t(v.address),
    hotline: t(v.hotline),
    email: t(v.email),
    website: t(v.website),
    documentFooter: t(v.documentFooter),
    maxFailedLogins: Number(v.maxFailedLogins),
    lockMinutes: Number(v.lockMinutes),
    feeNoticeEmail: v.feeNoticeEmail,
    version,
  }
}
