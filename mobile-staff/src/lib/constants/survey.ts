import type { Chip } from '@/lib/constants/common'
import type { QuestionType, SurveyPhase, SurveyStatus } from '@/lib/types'

export const SURVEY_STATUS: Record<SurveyStatus, Chip> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  OPEN: { label: 'Đang mở', tone: 'success' },
  CLOSED: { label: 'Đã đóng', tone: 'danger' },
}

export const SURVEY_PHASE: Record<SurveyPhase, Chip> = {
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

export function hasOptions(type: QuestionType): boolean {
  return type === 'SINGLE' || type === 'MULTIPLE'
}
