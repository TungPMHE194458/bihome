import { z } from 'zod'
import type { TicketCategory, TicketCategoryRequest, TicketDetail, TicketRequest } from '@/features/ticket/types'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const hours = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} không được để trống`)
    .regex(/^\d{1,4}$/, `${label} là số giờ nguyên dương`)
    .refine((v) => Number(v) >= 1, `${label} tối thiểu 1 giờ`)

export const categorySchema = z
  .object({
    name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên danh mục tối đa 100 ký tự'),
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
    responseSlaHours: hours('SLA phản hồi'),
    resolutionSlaHours: hours('SLA xử lý'),
    defaultAssigneeId: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine((v, ctx) => {
    if (Number(v.resolutionSlaHours) < Number(v.responseSlaHours)) {
      ctx.addIssue({ code: 'custom', path: ['resolutionSlaHours'], message: 'SLA xử lý phải lớn hơn hoặc bằng SLA phản hồi.' })
    }
  })
export type CategoryFormValues = z.infer<typeof categorySchema>

export const emptyCategory = (): CategoryFormValues => ({
  name: '',
  description: '',
  responseSlaHours: '4',
  resolutionSlaHours: '24',
  defaultAssigneeId: '',
  status: 'ACTIVE',
})

export const categoryToForm = (c: TicketCategory): CategoryFormValues => ({
  name: c.name,
  description: c.description ?? '',
  responseSlaHours: String(c.responseSlaHours),
  resolutionSlaHours: String(c.resolutionSlaHours),
  defaultAssigneeId: c.defaultAssigneeId?.toString() ?? '',
  status: c.status,
})

export const categoryToRequest = (v: CategoryFormValues, version?: number): TicketCategoryRequest => ({
  name: v.name.trim(),
  description: textOrNull(v.description),
  responseSlaHours: Number(v.responseSlaHours),
  resolutionSlaHours: Number(v.resolutionSlaHours),
  defaultAssigneeId: v.defaultAssigneeId ? Number(v.defaultAssigneeId) : null,
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
const residentOption = z.object({ id: z.number(), fullName: z.string(), phone: z.string() })
const uploadedFile = z.object({ fileId: z.number(), name: z.string(), size: z.number(), contentType: z.string() })

export const ticketSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().trim().max(4000, 'Mô tả tối đa 4000 ký tự'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  apartment: apartmentOption.nullable(),
  resident: residentOption.nullable(),
  channel: z.enum(['APP', 'HOTLINE', 'DIRECT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  /** Chỉ dùng khi tạo; '' = theo người phụ trách mặc định của danh mục. */
  assigneeId: z.string(),
  files: z.array(uploadedFile).max(10, 'Tối đa 10 tệp đính kèm'),
})
export type TicketFormValues = z.infer<typeof ticketSchema>

export const emptyTicket = (): TicketFormValues => ({
  title: '',
  description: '',
  categoryId: '',
  apartment: null,
  resident: null,
  channel: 'HOTLINE',
  priority: 'MEDIUM',
  assigneeId: '',
  files: [],
})

export const ticketToForm = (d: TicketDetail): TicketFormValues => {
  const t = d.ticket
  return {
    title: t.title,
    description: d.description ?? '',
    categoryId: t.categoryId.toString(),
    apartment:
      t.apartmentId != null
        ? { id: t.apartmentId, code: t.apartmentCode ?? '', name: t.apartmentName ?? '', buildingId: t.buildingId, buildingName: t.buildingName }
        : null,
    resident: t.residentId != null ? { id: t.residentId, fullName: t.residentName ?? '', phone: t.residentPhone ?? '' } : null,
    channel: t.channel,
    priority: t.priority,
    assigneeId: '',
    files: d.attachments.map((a) => ({ fileId: a.fileId, name: a.name, size: a.size, contentType: a.contentType })),
  }
}

export const ticketToRequest = (v: TicketFormValues, version?: number): TicketRequest => ({
  title: v.title.trim(),
  description: textOrNull(v.description),
  categoryId: Number(v.categoryId),
  apartmentId: v.apartment?.id ?? null,
  residentId: v.resident?.id ?? null,
  channel: v.channel,
  priority: v.priority,
  assigneeId: v.assigneeId ? Number(v.assigneeId) : null,
  fileIds: v.files.map((f) => f.fileId),
  version,
})
