import type { ResponseRequest, ResponseSummary, Survey, SurveyRequest, SurveyResults } from '@/features/survey/types'
import type { PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const surveyApi = {
  list: (params: ListParams) => http.get<PageResponse<Survey>>('/surveys', { params }).then((r) => r.data),
  get: (id: number) => http.get<Survey>(`/surveys/${id}`).then((r) => r.data),
  save: (id: number | undefined, body: SurveyRequest) =>
    (id == null ? http.post<Survey>('/surveys', body) : http.put<Survey>(`/surveys/${id}`, body)).then((r) => r.data),
  publish: (id: number, version: number) => http.post<Survey>(`/surveys/${id}/publish`, { version }).then((r) => r.data),
  close: (id: number, version: number) => http.post<Survey>(`/surveys/${id}/close`, { version }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/surveys/${id}`),
  responses: (id: number, params: ListParams) =>
    http.get<PageResponse<ResponseSummary>>(`/surveys/${id}/responses`, { params }).then((r) => r.data),
  submit: (id: number, body: ResponseRequest) =>
    http.post<ResponseSummary>(`/surveys/${id}/responses`, body).then((r) => r.data),
  results: (id: number) => http.get<SurveyResults>(`/surveys/${id}/results`).then((r) => r.data),
  exportExcel: (id: number) => downloadFromApi(`/surveys/${id}/export`, undefined, `khao-sat-${id}.xlsx`),
}
