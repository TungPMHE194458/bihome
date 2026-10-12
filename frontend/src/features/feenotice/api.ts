import type {
  FeeNoticeDetail,
  FeeNoticeSummary,
  FeeNoticeUpdate,
  FeePreview,
  GenerateRequest,
  VietQr,
} from '@/features/feenotice/types'
import type { PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const feeNoticeApi = {
  list: (params: ListParams) => http.get<PageResponse<FeeNoticeSummary>>('/fee-notices', { params }).then((r) => r.data),
  get: (id: number) => http.get<FeeNoticeDetail>(`/fee-notices/${id}`).then((r) => r.data),
  preview: (body: GenerateRequest) => http.post<FeePreview>('/fee-notices/preview', body).then((r) => r.data),
  generate: (body: GenerateRequest) =>
    http.post<{ period: string; created: number; skipped: number }>('/fee-notices/generate', body).then((r) => r.data),
  update: (id: number, body: FeeNoticeUpdate) => http.put<FeeNoticeDetail>(`/fee-notices/${id}`, body).then((r) => r.data),
  recalculate: (id: number, version: number) =>
    http.post<FeeNoticeDetail>(`/fee-notices/${id}/recalculate`, { version }).then((r) => r.data),
  issue: (id: number, version: number) => http.post<FeeNoticeDetail>(`/fee-notices/${id}/issue`, { version }).then((r) => r.data),
  issueAll: (period: string) =>
    http.post<{ issued: number; failed: number; errors: string[] }>('/fee-notices/issue-all', { period }).then((r) => r.data),
  cancel: (id: number, reason: string, version: number) =>
    http.post<FeeNoticeDetail>(`/fee-notices/${id}/cancel`, { reason, version }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/fee-notices/${id}`),
  vietQr: (id: number) => http.get<VietQr>(`/fee-notices/${id}/vietqr`).then((r) => r.data),
  exportExcel: (params: ListParams) => downloadFromApi('/fee-notices/export', params, 'thong-bao-phi.xlsx'),
  pdfPath: (id: number) => `/fee-notices/${id}/pdf`,
  qrImagePath: (id: number) => `/fee-notices/${id}/vietqr.png`,
}
