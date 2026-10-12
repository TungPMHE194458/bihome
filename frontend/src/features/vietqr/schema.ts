import { z } from 'zod'
import type { VietQrRequest, VietQrSettings } from '@/features/vietqr/types'

export const PLACEHOLDER = '{MA_THONG_BAO}'

export const vietQrSchema = z.object({
  bankBin: z.string().regex(/^\d{6}$/, 'Mã BIN gồm 6 chữ số'),
  accountNo: z.string().trim().regex(/^[0-9A-Za-z]{4,19}$/, 'Số tài khoản 4–19 ký tự, chỉ gồm chữ và số'),
  accountName: z.string().trim().min(1, 'Nhập tên chủ tài khoản').max(50, 'Tối đa 50 ký tự'),
  contentTemplate: z
    .string()
    .trim()
    .min(1, 'Nhập mẫu nội dung')
    .max(50, 'Tối đa 50 ký tự')
    .refine((v) => v.includes(PLACEHOLDER), `Mẫu phải có ${PLACEHOLDER} để đối soát tự động`),
  enabled: z.boolean(),
})

export type VietQrFormValues = z.infer<typeof vietQrSchema>

export function vietQrToForm(s?: VietQrSettings): VietQrFormValues {
  return {
    bankBin: s?.bankBin ?? '',
    accountNo: s?.accountNo ?? '',
    accountName: s?.accountName ?? '',
    contentTemplate: s?.contentTemplate ?? `BIHOME ${PLACEHOLDER}`,
    enabled: s?.version == null ? true : s.enabled,
  }
}

export function vietQrToRequest(v: VietQrFormValues, version?: number | null): VietQrRequest {
  return { ...v, accountNo: v.accountNo.trim().toUpperCase(), accountName: v.accountName.trim(), version: version ?? null }
}

/** Xem trước nội dung chuyển khoản như backend: bỏ dấu, viết hoa, chỉ giữ chữ / số / khoảng trắng / gạch nối. */
export function previewContent(template: string, code = 'TB-261001-001'): string {
  return template
    .replace(PLACEHOLDER, code)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
}
