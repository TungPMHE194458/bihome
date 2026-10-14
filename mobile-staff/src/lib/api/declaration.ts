import { clean, data, http, type Params } from '@/lib/api/shared'
import type { ApproveRequest, Declaration, PageResponse } from '@/lib/types'

export const declarationApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Declaration>>('/declarations', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Declaration>(`/declarations/${id}`)),
  approve: (id: number, body: ApproveRequest) => data(http.post<Declaration>(`/declarations/${id}/approve`, body)),
  reject: (id: number, reason: string, version: number) =>
    data(http.post<Declaration>(`/declarations/${id}/reject`, { reason, version })),
}
