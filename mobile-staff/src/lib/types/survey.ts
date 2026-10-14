/** Khảo sát ý kiến. Khớp frontend/src/features/survey/types.ts. */
import type { Audience, PickItem } from './reminder'

export type SurveyStatus = 'DRAFT' | 'OPEN' | 'CLOSED'
export type SurveyPhase = SurveyStatus | 'UPCOMING' | 'ACTIVE' | 'ENDED'
export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TEXT' | 'RATING'

export interface SurveyQuestionOption {
  id?: number
  label: string
}

export interface SurveyQuestion {
  id?: number
  type: QuestionType
  content: string
  required: boolean
  options: SurveyQuestionOption[]
}

export interface Survey {
  id: number
  buildingId: number
  buildingName: string
  title: string
  description?: string
  audience: Audience
  targets: string[]
  targetLabel: string
  targetItems: PickItem[]
  startAt: string
  endAt: string
  anonymous: boolean
  status: SurveyStatus
  phase: SurveyPhase
  responseCount: number
  questionCount: number
  questionsLocked: boolean
  /** Chỉ có ở chi tiết. */
  questions?: SurveyQuestion[]
  publishedAt?: string
  closedAt?: string
  createdAt: string
  createdBy?: string
  version: number
}

export interface SurveyRequest {
  title: string
  description: string | null
  audience: Audience
  targets: string[]
  startAt: string
  endAt: string
  anonymous: boolean
  questions: SurveyQuestion[]
  version?: number
}

export interface AnswerRequest {
  questionId: number
  optionIds?: number[]
  text?: string
  rating?: number
}

export interface ResponseRequest {
  apartmentId: number | null
  residentId: number | null
  answers: AnswerRequest[]
}

export interface ResponseSummary {
  id: number
  submittedAt: string
  apartmentCode?: string
  residentName?: string
  createdBy?: string
  answers: string[]
}

export interface QuestionResult {
  questionId: number
  type: QuestionType
  content: string
  answered: number
  options: { optionId: number; label: string; count: number; percent: number }[]
  averageRating?: number
  /** index0 = 1 sao .. index4 = 5 sao. */
  ratings?: number[]
  /** Tối đa 50 câu trả lời gần nhất. */
  texts: string[]
}

export interface SurveyResults {
  surveyId: number
  title: string
  responseCount: number
  questions: QuestionResult[]
}
