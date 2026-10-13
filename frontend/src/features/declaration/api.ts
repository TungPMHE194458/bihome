import type { ApproveRequest, Declaration } from '@/features/declaration/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const declarationApi = {
  list: (params: ListParams) => http.get<PageResponse<Declaration>>('/declarations', { params }).then((r) => r.data),
  get: (id: number) => http.get<Declaration>(`/declarations/${id}`).then((r) => r.data),
  approve: (id: number, body: ApproveRequest) => http.post<Declaration>(`/declarations/${id}/approve`, body).then((r) => r.data),
  reject: (id: number, reason: string, version: number) =>
    http.post<Declaration>(`/declarations/${id}/reject`, { reason, version }).then((r) => r.data),
}
