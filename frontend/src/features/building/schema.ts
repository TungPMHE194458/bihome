import { z } from 'zod'
import type { BuildingDetail, BuildingRequest } from '@/features/building/types'

const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} không được để trống`).max(max, `${label} tối đa ${max} ký tự`)
const optional = (label: string, max: number) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`)
const wholeNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max), `${label} phải là số nguyên từ 0 đến ${max}`)

export const buildingSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã tòa nhà không được để trống')
    .max(30, 'Mã tòa nhà tối đa 30 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ gồm chữ in hoa không dấu, chữ số, - và _'),
  name: required('Tên tòa nhà', 200),
  province: z.string().trim().min(1, 'Vui lòng chọn Tỉnh/Thành phố').max(100, 'Tỉnh/Thành phố tối đa 100 ký tự'),
  ward: z.string().trim().min(1, 'Vui lòng nhập Phường/Xã').max(100, 'Phường/Xã tối đa 100 ký tự'),
  addressDetail: required('Địa chỉ chi tiết', 255),
  type: z.enum(['BUILDING', 'COMPOUND', 'RENTAL']),
  floorsAbove: wholeNumber('Số tầng nổi', 300),
  floorsBelow: wholeNumber('Số tầng hầm', 30),
  investor: optional('Chủ đầu tư', 200),
  hotline: z.string().trim().regex(/^$|^[0-9+()\s.-]{6,20}$/, 'Hotline không đúng định dạng'),
  managementEmail: optional('Email BQL', 150).refine(
    (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Email BQL không đúng định dạng',
  ),
  description: optional('Mô tả', 4000),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  images: z
    .array(z.object({ fileId: z.number(), url: z.string(), isCover: z.boolean() }))
    .max(20, 'Tối đa 20 ảnh'),
})

export type BuildingFormValues = z.infer<typeof buildingSchema>

export const EMPTY_BUILDING: BuildingFormValues = {
  code: '',
  name: '',
  province: '',
  ward: '',
  addressDetail: '',
  type: 'BUILDING',
  floorsAbove: '',
  floorsBelow: '',
  investor: '',
  hotline: '',
  managementEmail: '',
  description: '',
  status: 'ACTIVE',
  images: [],
}

export function toFormValues(b: BuildingDetail): BuildingFormValues {
  return {
    code: b.code,
    name: b.name,
    province: b.province,
    ward: b.ward,
    addressDetail: b.addressDetail,
    type: b.type,
    floorsAbove: b.floorsAbove?.toString() ?? '',
    floorsBelow: b.floorsBelow?.toString() ?? '',
    investor: b.investor ?? '',
    hotline: b.hotline ?? '',
    managementEmail: b.managementEmail ?? '',
    description: b.description ?? '',
    status: b.status,
    images: b.images.map((img) => ({ fileId: img.fileId, url: img.url, isCover: img.cover })),
  }
}

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const numberOrNull = (v: string) => (v.trim() ? Number(v) : null)

export function toRequest(v: BuildingFormValues, version?: number): BuildingRequest {
  return {
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    province: v.province.trim(),
    ward: v.ward.trim(),
    addressDetail: v.addressDetail.trim(),
    type: v.type,
    floorsAbove: numberOrNull(v.floorsAbove),
    floorsBelow: numberOrNull(v.floorsBelow),
    investor: textOrNull(v.investor),
    hotline: textOrNull(v.hotline),
    managementEmail: textOrNull(v.managementEmail),
    description: textOrNull(v.description),
    status: v.status,
    images: v.images.map((img) => ({ fileId: img.fileId, cover: img.isCover })),
    version,
  }
}
