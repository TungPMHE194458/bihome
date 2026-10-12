import { z } from 'zod'
import type { ApartmentOption } from '@/features/apartment/types'
import type {
  AssetCategory,
  AssetCategoryRequest,
  AssetItem,
  AssetItemRequest,
} from '@/features/asset/types'
import dayjs from '@/lib/dayjs'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)

export const categorySchema = z.object({
  buildingId: z.string().min(1, 'Vui lòng chọn tòa nhà'),
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên danh mục tối đa 100 ký tự'),
  unit: z.string().trim().min(1, 'Đơn vị không được để trống').max(30, 'Đơn vị tối đa 30 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
export type CategoryFormValues = z.infer<typeof categorySchema>

export const emptyCategory = (buildingId: number | null): CategoryFormValues => ({
  buildingId: buildingId?.toString() ?? '',
  name: '',
  unit: 'chiếc',
  description: '',
  status: 'ACTIVE',
})

export const categoryToForm = (c: AssetCategory): CategoryFormValues => ({
  buildingId: c.buildingId.toString(),
  name: c.name,
  unit: c.unit,
  description: c.description ?? '',
  status: c.status,
})

export const categoryToRequest = (v: CategoryFormValues, version?: number): AssetCategoryRequest => ({
  buildingId: Number(v.buildingId),
  name: v.name.trim(),
  unit: v.unit.trim(),
  description: textOrNull(v.description),
  status: v.status,
  version,
})

const apartmentOption = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  buildingId: z.number(),
  buildingName: z.string(),
})

// Dùng superRefine (không thu hẹp kiểu) để input/output của form giống nhau: refine(v => v != null) ở zod 4
// biến output thành non-null và làm lệch kiểu giữa useForm với các wrapper Form*.
export const itemSchema = z
  .object({
    apartment: apartmentOption.nullable(),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    name: z.string().trim().min(1, 'Tên hạng mục không được để trống').max(150, 'Tên hạng mục tối đa 150 ký tự'),
    plateNumber: z.string().trim().max(30, 'Số hiệu tối đa 30 ký tự'),
    unit: z.string().trim().max(30, 'Đơn vị tối đa 30 ký tự'),
    entryDate: z.string().min(1, 'Ngày vào không được để trống'),
    exitDate: z.string(),
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine((v, ctx) => {
    if (!v.apartment) {
      ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Vui lòng chọn căn hộ' })
    }
    if (v.exitDate && v.entryDate && v.exitDate < v.entryDate) {
      ctx.addIssue({ code: 'custom', path: ['exitDate'], message: 'Ngày ra phải sau hoặc bằng ngày vào.' })
    }
  })
export type ItemFormValues = z.infer<typeof itemSchema>

export const emptyItem = (): ItemFormValues => ({
  apartment: null,
  categoryId: '',
  name: '',
  plateNumber: '',
  unit: '',
  entryDate: dayjs().format('YYYY-MM-DD'),
  exitDate: '',
  description: '',
  status: 'ACTIVE',
})

export const itemToForm = (i: AssetItem): ItemFormValues => ({
  apartment: {
    id: i.apartmentId,
    code: i.apartmentCode,
    name: i.apartmentName,
    buildingId: i.buildingId,
    buildingName: i.buildingName,
  } satisfies ApartmentOption,
  categoryId: i.categoryId.toString(),
  name: i.name,
  plateNumber: i.plateNumber ?? '',
  unit: i.unit,
  entryDate: i.entryDate,
  exitDate: i.exitDate ?? '',
  description: i.description ?? '',
  status: i.status,
})

/** Chuẩn hoá giống backend để người dùng thấy ngay giá trị sẽ lưu. */
export const normalizePlate = (v: string) => v.replace(/\s+/g, ' ').toUpperCase()

export const itemToRequest = (v: ItemFormValues, version?: number): AssetItemRequest => ({
  apartmentId: v.apartment!.id,
  categoryId: Number(v.categoryId),
  name: v.name.trim(),
  plateNumber: textOrNull(normalizePlate(v.plateNumber)),
  unit: textOrNull(v.unit),
  entryDate: v.entryDate,
  exitDate: v.exitDate || null,
  description: textOrNull(v.description),
  status: v.status,
  version,
})

/** Có ngày ra ≤ hôm nay thì backend sẽ tự chuyển Ngừng hoạt động. */
export const willBeInactive = (exitDate: string) => !!exitDate && !dayjs(exitDate).isAfter(dayjs(), 'day')
