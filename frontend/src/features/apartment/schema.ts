import { z } from 'zod'
import type { ApartmentDetail, ApartmentRequest } from '@/features/apartment/types'

const wholeNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= max), `${label} phải là số nguyên từ 0 đến ${max}`)

export const apartmentSchema = z.object({
  buildingId: z.string().min(1, 'Vui lòng chọn tòa nhà'),
  code: z
    .string()
    .trim()
    .min(1, 'Mã căn hộ không được để trống')
    .max(30, 'Mã căn hộ tối đa 30 ký tự')
    .regex(/^[A-Za-z0-9._-]+$/, 'Mã chỉ gồm chữ không dấu, chữ số và . _ -'),
  name: z.string().trim().min(1, 'Tên căn hộ không được để trống').max(100, 'Tên căn hộ tối đa 100 ký tự'),
  floorNo: z
    .string()
    .trim()
    .min(1, 'Tầng không được để trống')
    .regex(/^[A-Za-z0-9-]{1,10}$/, 'Tầng tối đa 10 ký tự, vd 12, 12A, B1'),
  bedrooms: wholeNumber('Số phòng ngủ', 50),
  rooms: wholeNumber('Số phòng', 100),
  area: z
    .string()
    .trim()
    .min(1, 'Diện tích không được để trống')
    .refine((v) => /^\d{1,8}([.,]\d{1,2})?$/.test(v) && Number(v.replace(',', '.')) > 0,
      'Diện tích phải là số dương, tối đa 2 chữ số thập phân'),
  type: z.enum(['APARTMENT', 'PENTHOUSE', 'VILLA', 'DUPLEX', 'SHOPHOUSE', 'PREMISES', 'OFFICE']),
  ownershipType: z.enum(['RENT', 'OWN']),
  usageStatus: z.enum(['VACANT', 'OCCUPIED', 'RENOVATING']),
  description: z.string().trim().max(4000, 'Mô tả tối đa 4000 ký tự'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  images: z.array(z.object({ fileId: z.number(), url: z.string(), isCover: z.boolean() })).max(20, 'Tối đa 20 ảnh'),
})

export type ApartmentFormValues = z.infer<typeof apartmentSchema>

export function emptyApartment(buildingId: number | null): ApartmentFormValues {
  return {
    buildingId: buildingId?.toString() ?? '',
    code: '',
    name: '',
    floorNo: '',
    bedrooms: '',
    rooms: '',
    area: '',
    type: 'APARTMENT',
    ownershipType: 'OWN',
    usageStatus: 'VACANT',
    description: '',
    status: 'ACTIVE',
    images: [],
  }
}

export function toFormValues(a: ApartmentDetail): ApartmentFormValues {
  return {
    buildingId: a.buildingId.toString(),
    code: a.code,
    name: a.name,
    floorNo: a.floorNo,
    bedrooms: a.bedrooms?.toString() ?? '',
    rooms: a.rooms?.toString() ?? '',
    area: a.area.toString(),
    type: a.type,
    ownershipType: a.ownershipType,
    usageStatus: a.usageStatus,
    description: a.description ?? '',
    status: a.status,
    images: a.images.map((img) => ({ fileId: img.fileId, url: img.url, isCover: img.cover })),
  }
}

const numberOrNull = (v: string) => (v.trim() ? Number(v) : null)

export function toRequest(v: ApartmentFormValues, version?: number): ApartmentRequest {
  return {
    buildingId: Number(v.buildingId),
    code: v.code.trim().toUpperCase(),
    name: v.name.trim(),
    floorNo: v.floorNo.trim().toUpperCase(),
    bedrooms: numberOrNull(v.bedrooms),
    rooms: numberOrNull(v.rooms),
    area: Number(v.area.trim().replace(',', '.')),
    type: v.type,
    ownershipType: v.ownershipType,
    usageStatus: v.usageStatus,
    description: v.description.trim() || null,
    status: v.status,
    images: v.images.map((img) => ({ fileId: img.fileId, cover: img.isCover })),
    version,
  }
}
