import { z } from 'zod'
import type { AccessCard, AccessCardRequest, IssueRequest } from '@/features/accesscard/types'
import { allowsVehicle } from '@/features/accesscard/constants'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)

const apartmentOption = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  buildingId: z.number(),
  buildingName: z.string(),
})
const residentOption = z.object({ id: z.number(), fullName: z.string(), phone: z.string() })

/** Chuẩn hoá giống backend: bỏ khoảng trắng, in hoa. */
export const normalizeCardNo = (v: string) => v.replace(/\s+/g, '').toUpperCase()

const fee = z
  .string()
  .trim()
  .regex(/^\d{0,12}$/, 'Phí làm thẻ là số nguyên (VND)')

const assignment = {
  apartment: apartmentOption.nullable(),
  resident: residentOption.nullable(),
  assetItemId: z.string(),
  issuedDate: z.string(),
  expiryDate: z.string(),
}

const checkDates = (v: { issuedDate: string; expiryDate: string }, ctx: z.RefinementCtx) => {
  if (v.issuedDate && v.expiryDate && v.expiryDate < v.issuedDate) {
    ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Ngày hết hạn phải sau ngày cấp.' })
  }
}

export const cardSchema = z
  .object({
    cardNo: z
      .string()
      .trim()
      .min(1, 'Mã thẻ không được để trống')
      .regex(/^[A-Za-z0-9 -]{3,30}$/, 'Mã thẻ 3–30 ký tự, chỉ gồm chữ không dấu, chữ số và -'),
    cardType: z.enum(['ELEVATOR', 'DOOR', 'PARKING', 'MULTI']),
    ...assignment,
    issueFee: fee,
    note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự'),
    /** Thẻ đang dùng / khoá phải gắn căn hộ. */
    requireApartment: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.requireApartment && !v.apartment) {
      ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Thẻ đang dùng phải gắn căn hộ' })
    }
    if (v.assetItemId && !allowsVehicle(v.cardType)) {
      ctx.addIssue({ code: 'custom', path: ['assetItemId'], message: 'Chỉ thẻ Gửi xe hoặc Đa năng mới liên kết được với xe.' })
    }
    checkDates(v, ctx)
  })
export type CardFormValues = z.infer<typeof cardSchema>

export const emptyCard = (): CardFormValues => ({
  cardNo: '',
  cardType: 'MULTI',
  apartment: null,
  resident: null,
  assetItemId: '',
  issuedDate: '',
  expiryDate: '',
  issueFee: '0',
  note: '',
  requireApartment: false,
})

export const cardToForm = (c: AccessCard): CardFormValues => ({
  cardNo: c.cardNo,
  cardType: c.cardType,
  apartment:
    c.apartmentId != null
      ? { id: c.apartmentId, code: c.apartmentCode ?? '', name: c.apartmentName ?? '', buildingId: c.buildingId, buildingName: c.buildingName }
      : null,
  resident: c.residentId != null ? { id: c.residentId, fullName: c.residentName ?? '', phone: '' } : null,
  assetItemId: c.assetItemId?.toString() ?? '',
  issuedDate: c.issuedDate ?? '',
  expiryDate: c.expiryDate ?? '',
  issueFee: String(c.issueFee),
  note: c.note ?? '',
  requireApartment: c.status === 'IN_USE' || c.status === 'LOCKED',
})

export const cardToRequest = (v: CardFormValues, version?: number): AccessCardRequest => ({
  cardNo: normalizeCardNo(v.cardNo),
  cardType: v.cardType,
  apartmentId: v.apartment?.id ?? null,
  residentId: v.apartment ? (v.resident?.id ?? null) : null,
  assetItemId: v.apartment && v.assetItemId && allowsVehicle(v.cardType) ? Number(v.assetItemId) : null,
  issuedDate: v.issuedDate || null,
  expiryDate: v.expiryDate || null,
  issueFee: Number(v.issueFee || 0),
  note: textOrNull(v.note),
  version,
})

export const issueSchema = z
  .object({ ...assignment, issueFee: fee, note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự') })
  .superRefine((v, ctx) => {
    if (!v.apartment) ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Vui lòng chọn căn hộ' })
    checkDates(v, ctx)
  })
export type IssueFormValues = z.infer<typeof issueSchema>

export const issueToRequest = (v: IssueFormValues, version: number, allowVehicle: boolean): IssueRequest => ({
  apartmentId: v.apartment!.id,
  residentId: v.resident?.id ?? null,
  assetItemId: allowVehicle && v.assetItemId ? Number(v.assetItemId) : null,
  issuedDate: v.issuedDate || null,
  expiryDate: v.expiryDate || null,
  issueFee: v.issueFee ? Number(v.issueFee) : null,
  note: textOrNull(v.note),
  version,
})
