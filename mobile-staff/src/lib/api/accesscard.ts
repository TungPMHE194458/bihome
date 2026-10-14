import { clean, data, http, type Params } from '@/lib/api/shared'
import type { AccessCard, AccessCardRequest, CardHistoryEntry, CardStatus, IssueRequest, PageResponse } from '@/lib/types'

export const accessCardApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<AccessCard>>('/access-cards', { params: clean({ size: 20, sort: 'cardNo,asc', ...p }) })),
  get: (id: number) => data(http.get<AccessCard>(`/access-cards/${id}`)),
  history: (id: number) => data(http.get<CardHistoryEntry[]>(`/access-cards/${id}/history`)),
  save: (id: number | undefined, body: AccessCardRequest) =>
    data(id == null ? http.post<AccessCard>('/access-cards', body) : http.put<AccessCard>(`/access-cards/${id}`, body)),
  issue: (id: number, body: IssueRequest) => data(http.post<AccessCard>(`/access-cards/${id}/issue`, body)),
  changeStatus: (id: number, status: CardStatus, note: string | null, version: number) =>
    data(http.post<AccessCard>(`/access-cards/${id}/status`, { status, note, version })),
  remove: (id: number) => http.delete(`/access-cards/${id}`),
}
