import { z } from 'zod'
import type { UploadedImage } from '@/components/form/FormImageUpload'
import type { MeterReading, MeterReadingRequest, MeterType } from '@/features/meter/types'

const INDEX = /^\d{1,10}([.,]\d{1,2})?$/

export function parseIndex(text: string): number | null {
  const t = text.trim()
  if (!t || !INDEX.test(t)) return null
  return Number(t.replace(',', '.'))
}

export const meterSchema = z
  .object({
    apartmentId: z.number().nullable(),
    period: z.string().min(1, 'Chọn kỳ'),
    meterType: z.enum(['ELECTRIC', 'WATER']),
    oldIndex: z.string(),
    newIndex: z.string(),
    images: z.array(z.custom<UploadedImage>()),
    note: z.string().max(500, 'Tối đa 500 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.apartmentId == null) ctx.addIssue({ code: 'custom', path: ['apartmentId'], message: 'Chọn căn hộ' })
    const next = parseIndex(v.newIndex)
    if (next == null) {
      ctx.addIssue({ code: 'custom', path: ['newIndex'], message: 'Chỉ số là số không âm, tối đa 2 chữ số thập phân' })
    }
    const old = v.oldIndex.trim() ? parseIndex(v.oldIndex) : 0
    if (old == null) {
      ctx.addIssue({ code: 'custom', path: ['oldIndex'], message: 'Chỉ số là số không âm, tối đa 2 chữ số thập phân' })
    } else if (next != null && next < old) {
      ctx.addIssue({ code: 'custom', path: ['newIndex'], message: 'Chỉ số mới nhỏ hơn chỉ số cũ' })
    }
  })

export type MeterFormValues = z.infer<typeof meterSchema>

export function emptyMeter(period: string, meterType: MeterType = 'ELECTRIC'): MeterFormValues {
  return { apartmentId: null, period, meterType, oldIndex: '', newIndex: '', images: [], note: '' }
}

export function meterToForm(r: MeterReading): MeterFormValues {
  return {
    apartmentId: r.apartmentId,
    period: r.period,
    meterType: r.meterType,
    oldIndex: String(r.oldIndex),
    newIndex: String(r.newIndex),
    images: r.imageFileId && r.imageUrl ? [{ fileId: r.imageFileId, url: r.imageUrl, isCover: true }] : [],
    note: r.note ?? '',
  }
}

/** {@code oldIndexEditable}: chỉ gửi chỉ số cũ khi là kỳ đầu của đồng hồ. */
export function meterToRequest(v: MeterFormValues, oldIndexEditable: boolean, version?: number): MeterReadingRequest {
  return {
    apartmentId: v.apartmentId ?? undefined,
    period: v.period,
    meterType: v.meterType,
    oldIndex: oldIndexEditable && v.oldIndex.trim() ? parseIndex(v.oldIndex) : null,
    newIndex: parseIndex(v.newIndex)!,
    imageFileId: v.images[0]?.fileId ?? null,
    note: v.note.trim() || null,
    version,
  }
}
