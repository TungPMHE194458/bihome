import { z } from 'zod'
import type { Voucher, VoucherRequest } from '@/features/voucher/types'
import dayjs from '@/lib/dayjs'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const wholeOrEmpty = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^(|[1-9]\d{0,9})$/, `${label} là số nguyên dương`)

export const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Mã voucher không được để trống')
      .regex(/^[A-Za-z0-9_-]{3,30}$/, 'Mã voucher 3–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -'),
    name: z.string().trim().min(1, 'Tên voucher không được để trống').max(150, 'Tên voucher tối đa 150 ký tự'),
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
    discountType: z.enum(['PERCENT', 'AMOUNT']),
    discountValue: z.string().trim().min(1, 'Giá trị giảm không được để trống'),
    maxDiscount: wholeOrEmpty('Giảm tối đa'),
    applyScope: z.enum(['AMENITY', 'SERVICE', 'ALL']),
    amenityIds: z.array(z.number()).max(100, 'Tối đa 100 tiện ích'),
    serviceIds: z.array(z.number()).max(100, 'Tối đa 100 dịch vụ'),
    totalQuantity: wholeOrEmpty('Tổng số lượng'),
    perApartmentLimit: wholeOrEmpty('Giới hạn mỗi căn hộ'),
    validFrom: z.string().min(1, 'Ngày bắt đầu không được để trống'),
    validTo: z.string().min(1, 'Ngày kết thúc không được để trống'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine((v, ctx) => {
    const value = Number(v.discountValue.replace(',', '.'))
    if (v.discountValue && (!Number.isFinite(value) || value <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Giá trị giảm phải lớn hơn 0' })
    } else if (v.discountType === 'PERCENT' && value > 100) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Giảm theo % tối đa 100%.' })
    } else if (v.discountType === 'AMOUNT' && !Number.isInteger(value)) {
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Số tiền giảm là số nguyên (VND).' })
    }
    if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
      ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.' })
    }
    if (v.totalQuantity && v.perApartmentLimit && Number(v.perApartmentLimit) > Number(v.totalQuantity)) {
      ctx.addIssue({ code: 'custom', path: ['perApartmentLimit'], message: 'Không được lớn hơn tổng số lượng.' })
    }
  })
export type VoucherFormValues = z.infer<typeof voucherSchema>

export const emptyVoucher = (): VoucherFormValues => ({
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscount: '',
  applyScope: 'ALL',
  amenityIds: [],
  serviceIds: [],
  totalQuantity: '',
  perApartmentLimit: '',
  validFrom: dayjs().format('YYYY-MM-DD'),
  validTo: dayjs().add(1, 'month').format('YYYY-MM-DD'),
  status: 'ACTIVE',
})

export const voucherToForm = (v: Voucher): VoucherFormValues => ({
  code: v.code,
  name: v.name,
  description: v.description ?? '',
  discountType: v.discountType,
  discountValue: String(v.discountValue),
  maxDiscount: v.maxDiscount != null ? String(v.maxDiscount) : '',
  applyScope: v.applyScope,
  amenityIds: v.amenities.map((t) => t.id),
  serviceIds: v.services.map((t) => t.id),
  totalQuantity: v.totalQuantity != null ? String(v.totalQuantity) : '',
  perApartmentLimit: v.perApartmentLimit != null ? String(v.perApartmentLimit) : '',
  validFrom: v.validFrom,
  validTo: v.validTo,
  status: v.status,
})

const numberOrNull = (v: string) => (v.trim() ? Number(v) : null)

export const voucherToRequest = (v: VoucherFormValues, version?: number): VoucherRequest => ({
  code: v.code.trim().toUpperCase(),
  name: v.name.trim(),
  description: textOrNull(v.description),
  discountType: v.discountType,
  discountValue: Number(v.discountValue.replace(',', '.')),
  maxDiscount: v.discountType === 'PERCENT' ? numberOrNull(v.maxDiscount) : null,
  applyScope: v.applyScope,
  // Chỉ gửi đối tượng khớp phạm vi (đổi phạm vi thì bỏ lựa chọn cũ).
  amenityIds: v.applyScope === 'SERVICE' ? [] : v.amenityIds,
  serviceIds: v.applyScope === 'AMENITY' ? [] : v.serviceIds,
  totalQuantity: numberOrNull(v.totalQuantity),
  perApartmentLimit: numberOrNull(v.perApartmentLimit),
  validFrom: v.validFrom,
  validTo: v.validTo,
  status: v.status,
  version,
})
