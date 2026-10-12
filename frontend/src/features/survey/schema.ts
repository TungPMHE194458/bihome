import { z } from 'zod'
import type { PickItem } from '@/components/form/AsyncMultiPicker'
import { hasOptions } from '@/features/survey/constants'
import type { Survey, SurveyRequest } from '@/features/survey/types'
import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

let seq = 0
/** Khoá tạm cho câu hỏi / lựa chọn mới (kéo thả cần khoá ổn định). */
export const newKey = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`

const option = z.object({ key: z.string(), id: z.number().optional(), label: z.string().trim().max(200, 'Tối đa 200 ký tự') })
const question = z.object({
  key: z.string(),
  id: z.number().optional(),
  type: z.enum(['SINGLE', 'MULTIPLE', 'TEXT', 'RATING']),
  content: z.string().trim().min(1, 'Nhập nội dung câu hỏi').max(500, 'Câu hỏi tối đa 500 ký tự'),
  required: z.boolean(),
  options: z.array(option),
})
export type QuestionDraft = z.infer<typeof question>

export const surveySchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(200, 'Tiêu đề tối đa 200 ký tự'),
    description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
    audience: z.enum(['ALL', 'FLOOR', 'APARTMENT', 'RESIDENT']),
    targets: z.array(z.custom<PickItem>()),
    /** 'YYYY-MM-DDTHH:mm' giờ Việt Nam */
    startAt: z.string().min(1, 'Chọn thời gian bắt đầu'),
    endAt: z.string().min(1, 'Chọn thời gian kết thúc'),
    anonymous: z.boolean(),
    questions: z.array(question).max(50, 'Tối đa 50 câu hỏi'),
  })
  .superRefine((v, ctx) => {
    if (v.startAt && v.endAt && v.endAt <= v.startAt) {
      ctx.addIssue({ code: 'custom', path: ['endAt'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu' })
    }
    if (v.audience !== 'ALL' && v.targets.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['targets'], message: 'Chọn ít nhất một đối tượng' })
    }
    v.questions.forEach((q, i) => {
      if (!hasOptions(q.type)) return
      const labels = q.options.map((o) => o.label.trim()).filter(Boolean)
      if (labels.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'options'], message: 'Cần ít nhất 2 lựa chọn' })
      } else if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'options'], message: 'Các lựa chọn bị trùng' })
      }
    })
  })
export type SurveyFormValues = z.infer<typeof surveySchema>

const toLocal = (iso: string) => dayjs(iso).tz(APP_TIMEZONE).format('YYYY-MM-DDTHH:mm')

export const newQuestion = (type: QuestionDraft['type'] = 'SINGLE'): QuestionDraft => ({
  key: newKey(),
  type,
  content: '',
  required: true,
  options: hasOptions(type) ? [{ key: newKey(), label: '' }, { key: newKey(), label: '' }] : [],
})

export const emptySurvey = (): SurveyFormValues => ({
  title: '',
  description: '',
  audience: 'ALL',
  targets: [],
  startAt: dayjs().startOf('hour').add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  endAt: dayjs().startOf('hour').add(14, 'day').format('YYYY-MM-DDTHH:mm'),
  anonymous: false,
  questions: [newQuestion('SINGLE')],
})

export const surveyToForm = (s: Survey): SurveyFormValues => ({
  title: s.title,
  description: s.description ?? '',
  audience: s.audience,
  targets: s.targetItems,
  startAt: toLocal(s.startAt),
  endAt: toLocal(s.endAt),
  anonymous: s.anonymous,
  questions: s.questions.map((q) => ({
    key: `q${q.id}`,
    id: q.id,
    type: q.type,
    content: q.content,
    required: q.required,
    options: q.options.map((o) => ({ key: `o${o.id}`, id: o.id, label: o.label })),
  })),
})

export const surveyToRequest = (v: SurveyFormValues, version?: number): SurveyRequest => ({
  title: v.title.trim(),
  description: v.description.trim() || null,
  audience: v.audience,
  targets: v.audience === 'ALL' ? [] : v.targets.map((t) => t.value),
  startAt: dayjs.tz(v.startAt, APP_TIMEZONE).format(),
  endAt: dayjs.tz(v.endAt, APP_TIMEZONE).format(),
  anonymous: v.anonymous,
  questions: v.questions.map((q) => ({
    id: q.id,
    type: q.type,
    content: q.content.trim(),
    required: q.required,
    options: hasOptions(q.type)
      ? q.options.filter((o) => o.label.trim()).map((o) => ({ id: o.id, label: o.label.trim() }))
      : [],
  })),
  version,
})

/** Di chuyển phần tử từ vị trí {@code from} tới {@code to} (kéo thả). */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
