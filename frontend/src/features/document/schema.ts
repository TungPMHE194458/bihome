import { z } from 'zod'
import type { UploadedFile } from '@/components/form/FormFileUpload'
import type {
  DocumentCategory,
  DocumentCategoryRequest,
  DocumentItem,
  DocumentRequest,
} from '@/features/document/types'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên danh mục tối đa 100 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải có dạng #RRGGBB'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
export type CategoryFormValues = z.infer<typeof categorySchema>

export const emptyCategory = (): CategoryFormValues => ({ name: '', description: '', color: '#16A34A', status: 'ACTIVE' })

export const categoryToForm = (c: DocumentCategory): CategoryFormValues => ({
  name: c.name,
  description: c.description ?? '',
  color: c.color,
  status: c.status,
})

export const categoryToRequest = (v: CategoryFormValues, version?: number): DocumentCategoryRequest => ({
  name: v.name.trim(),
  description: textOrNull(v.description),
  color: v.color.toUpperCase(),
  status: v.status,
  version,
})

const uploadedFile = z.object({ fileId: z.number(), name: z.string(), size: z.number(), contentType: z.string() })

/** Chuẩn hoá thẻ giống backend: bỏ khoảng trắng thừa, bỏ trùng không phân biệt hoa thường. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of tags) {
    const t = tag.trim().replace(/\s+/g, ' ')
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase())
      result.push(t)
    }
  }
  return result
}

// superRefine (không thu hẹp kiểu) — xem asset/schema.ts.
export const documentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^$|^[A-Za-z0-9._-]{1,30}$/, 'Mã tài liệu tối đa 30 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -'),
    name: z.string().trim().min(1, 'Tên tài liệu không được để trống').max(255, 'Tên tài liệu tối đa 255 ký tự'),
    description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    audience: z.enum(['ALL_RESIDENTS', 'OWNERS', 'TENANTS', 'MANAGEMENT']),
    tags: z.array(z.string()),
    /** Chỉ khi thêm mới; khi sửa luôn null (thay tệp ở dialog riêng). */
    file: uploadedFile.nullable(),
    requireFile: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const tags = normalizeTags(v.tags)
    if (tags.length > 10) ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Tối đa 10 thẻ' })
    if (tags.some((t) => t.length > 50)) ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Mỗi thẻ tối đa 50 ký tự' })
    if (v.requireFile && !v.file) ctx.addIssue({ code: 'custom', path: ['file'], message: 'Vui lòng chọn tệp tài liệu' })
  })
export type DocumentFormValues = z.infer<typeof documentSchema>

export const emptyDocument = (): DocumentFormValues => ({
  code: '',
  name: '',
  description: '',
  categoryId: '',
  audience: 'ALL_RESIDENTS',
  tags: [],
  file: null,
  requireFile: true,
})

export const documentToForm = (d: DocumentItem): DocumentFormValues => ({
  code: d.code,
  name: d.name,
  description: d.description ?? '',
  categoryId: d.categoryId.toString(),
  audience: d.audience,
  tags: d.tags,
  file: null,
  requireFile: false,
})

/** Tên tài liệu gợi ý từ tên tệp (bỏ phần mở rộng). */
export const nameFromFile = (file: UploadedFile) => file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

export const documentToRequest = (v: DocumentFormValues, version?: number): DocumentRequest => ({
  code: textOrNull(v.code)?.toUpperCase() ?? null,
  name: v.name.trim(),
  description: textOrNull(v.description),
  categoryId: Number(v.categoryId),
  audience: v.audience,
  tags: normalizeTags(v.tags),
  fileId: v.file?.fileId,
  version,
})
