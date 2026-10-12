import { z } from 'zod'
import type { Amenity, AmenityRequest } from '@/features/amenity/types'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const time = (label: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} không hợp lệ`)

export const amenitySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Mã tiện ích không được để trống')
      .regex(/^[A-Za-z0-9_-]{2,30}$/, 'Mã tiện ích 2–30 ký tự, chỉ gồm chữ không dấu, chữ số, _ và -'),
    name: z.string().trim().min(1, 'Tên tiện ích không được để trống').max(150, 'Tên tiện ích tối đa 150 ký tự'),
    location: z.string().trim().max(200, 'Vị trí tối đa 200 ký tự'),
    capacity: z
      .string()
      .trim()
      .regex(/^[1-9]\d{0,4}$/, 'Sức chứa là số nguyên dương'),
    openTime: time('Giờ mở cửa'),
    closeTime: time('Giờ đóng cửa'),
    rules: z.string().trim().max(4000, 'Nội quy tối đa 4000 ký tự'),
    requiresApproval: z.boolean(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    images: z.array(z.object({ fileId: z.number(), url: z.string(), isCover: z.boolean() })).max(20, 'Tối đa 20 ảnh'),
  })
  .superRefine((v, ctx) => {
    if (v.openTime && v.closeTime && v.closeTime <= v.openTime) {
      ctx.addIssue({ code: 'custom', path: ['closeTime'], message: 'Giờ đóng cửa phải sau giờ mở cửa.' })
    }
  })
export type AmenityFormValues = z.infer<typeof amenitySchema>

export const emptyAmenity = (): AmenityFormValues => ({
  code: '',
  name: '',
  location: '',
  capacity: '20',
  openTime: '06:00',
  closeTime: '22:00',
  rules: '',
  requiresApproval: false,
  status: 'ACTIVE',
  images: [],
})

export const amenityToForm = (a: Amenity): AmenityFormValues => ({
  code: a.code,
  name: a.name,
  location: a.location ?? '',
  capacity: String(a.capacity),
  openTime: a.openTime,
  closeTime: a.closeTime,
  rules: a.rules ?? '',
  requiresApproval: a.requiresApproval,
  status: a.status,
  images: a.images.map((img) => ({ fileId: img.fileId, url: img.url, isCover: img.cover })),
})

export const amenityToRequest = (v: AmenityFormValues, version?: number): AmenityRequest => ({
  code: v.code.trim().toUpperCase(),
  name: v.name.trim(),
  location: textOrNull(v.location),
  capacity: Number(v.capacity),
  openTime: v.openTime,
  closeTime: v.closeTime,
  rules: textOrNull(v.rules),
  requiresApproval: v.requiresApproval,
  status: v.status,
  images: v.images.map((img) => ({ fileId: img.fileId, cover: img.isCover })),
  version,
})
