import { clean, data, http, type Params } from '@/lib/api/shared'
import { downloadExcel } from '@/lib/file'
import type { PageResponse, ResponseRequest, ResponseSummary, Survey, SurveyRequest, SurveyResults } from '@/lib/types'

export const surveyApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Survey>>('/surveys', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Survey>(`/surveys/${id}`)),
  save: (id: number | undefined, body: SurveyRequest) =>
    data(id == null ? http.post<Survey>('/surveys', body) : http.put<Survey>(`/surveys/${id}`, body)),
  publish: (id: number, version: number) => data(http.post<Survey>(`/surveys/${id}/publish`, { version })),
  close: (id: number, version: number) => data(http.post<Survey>(`/surveys/${id}/close`, { version })),
  remove: (id: number) => http.delete(`/surveys/${id}`),
  responses: (id: number, page = 0) =>
    data(http.get<PageResponse<ResponseSummary>>(`/surveys/${id}/responses`, { params: { page, size: 20 } })),
  submitResponse: (id: number, body: ResponseRequest) => data(http.post<ResponseSummary>(`/surveys/${id}/responses`, body)),
  results: (id: number) => data(http.get<SurveyResults>(`/surveys/${id}/results`)),
  export: (id: number, title: string) => downloadExcel(`/surveys/${id}/export`, `khao-sat-${title}.xlsx`),
}
