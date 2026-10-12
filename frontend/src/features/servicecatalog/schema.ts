import { z } from 'zod'
import type { Service, ServiceRequest, ServiceType, ServiceTypeRequest } from '@/features/servicecatalog/types'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)

/** Gợi ý đơn vị tính (vẫn cho gõ tự do). */
export const UNIT_SUGGESTIONS = ['lần', 'giờ', 'm²', 'kg', 'bộ', 'chiếc', 'chuyến']

export const serviceTypeSchema = z.object({
  name: z.string().trim().min(1, 'Tên loại dịch vụ không được để trống').max(100, 'Tên loại dịch vụ tối đa 100 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
export type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>

export const emptyServiceType = (): ServiceTypeFormValues => ({ name: '', description: '', status: 'ACTIVE' })

export const serviceTypeToForm = (t: ServiceType): ServiceTypeFormValues => ({
  name: t.name,
  description: t.description ?? '',
  status: t.status,
})

export const serviceTypeToRequest = (v: ServiceTypeFormValues, version?: number): ServiceTypeRequest => ({
  name: v.name.trim(),
  description: textOrNull(v.description),
  status: v.status,
  version,
})

export const serviceSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^(|[A-Za-z0-9_-]{2,30})$/, 'Mã dịch vụ 2–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -'),
  name: z.string().trim().min(1, 'Tên dịch vụ không được để trống').max(150, 'Tên dịch vụ tối đa 150 ký tự'),
  serviceTypeId: z.string().min(1, 'Vui lòng chọn loại dịch vụ'),
  unitPrice: z
    .string()
    .trim()
    .min(1, 'Đơn giá không được để trống')
    .regex(/^\d{1,12}$/, 'Đơn giá là số nguyên không âm (VND)'),
  unit: z.string().trim().min(1, 'Đơn vị tính không được để trống').max(30, 'Đơn vị tính tối đa 30 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  images: z.array(z.object({ fileId: z.number(), url: z.string(), isCover: z.boolean() })).max(20, 'Tối đa 20 ảnh'),
})
export type ServiceFormValues = z.infer<typeof serviceSchema>

export const emptyService = (): ServiceFormValues => ({
  code: '',
  name: '',
  serviceTypeId: '',
  unitPrice: '',
  unit: 'lần',
  description: '',
  status: 'ACTIVE',
  images: [],
})

export const serviceToForm = (s: Service): ServiceFormValues => ({
  code: s.code,
  name: s.name,
  serviceTypeId: String(s.serviceTypeId),
  unitPrice: String(s.unitPrice),
  unit: s.unit,
  description: s.description ?? '',
  status: s.status,
  images: s.images.map((img) => ({ fileId: img.fileId, url: img.url, isCover: img.cover })),
})

export const serviceToRequest = (v: ServiceFormValues, version?: number): ServiceRequest => ({
  code: textOrNull(v.code)?.toUpperCase() ?? null,
  name: v.name.trim(),
  serviceTypeId: Number(v.serviceTypeId),
  unitPrice: Number(v.unitPrice),
  unit: v.unit.trim(),
  description: textOrNull(v.description),
  status: v.status,
  images: v.images.map((img) => ({ fileId: img.fileId, cover: img.isCover })),
  version,
})
