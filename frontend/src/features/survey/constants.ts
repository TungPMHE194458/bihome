import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { QuestionType, SurveyPhase, SurveyStatus } from '@/features/survey/types'

export const SURVEY_STATUS: Record<SurveyStatus, ChipStyle> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  CLOSED: { label: 'Đã đóng', tone: 'danger' },
}

export const SURVEY_PHASE: Record<SurveyPhase, ChipStyle> = {
  ...SURVEY_STATUS,
  UPCOMING: { label: 'Sắp diễn ra', tone: 'info' },
  ACTIVE: { label: 'Đang nhận phản hồi', tone: 'success' },
  ENDED: { label: 'Hết thời gian', tone: 'warning' },
}

export const QUESTION_TYPE: Record<QuestionType, string> = {
  SINGLE: 'Một lựa chọn',
  MULTIPLE: 'Nhiều lựa chọn',
  TEXT: 'Văn bản ngắn',
  RATING: 'Đánh giá 1–5 sao',
}

export const SURVEY_STATUS_OPTIONS: SelectOption[] = (Object.keys(SURVEY_STATUS) as SurveyStatus[]).map((v) => ({
  value: v,
  label: SURVEY_STATUS[v].label,
}))

export const hasOptions = (t: QuestionType) => t === 'SINGLE' || t === 'MULTIPLE'
