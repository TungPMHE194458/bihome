import type {
  AccessCard,
  AccessCardRequest,
  CardHistoryEntry,
  CardStatus,
  IssueRequest,
} from '@/features/accesscard/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Thẻ từ thuộc phạm vi tòa nhà: X-Building-Id (tòa đang chọn) được http tự gửi kèm. */
export const accessCardApi = {
  list: (params: ListParams) => http.get<PageResponse<AccessCard>>('/access-cards', { params }).then((r) => r.data),
  get: (id: number) => http.get<AccessCard>(`/access-cards/${id}`).then((r) => r.data),
  history: (id: number) => http.get<CardHistoryEntry[]>(`/access-cards/${id}/history`).then((r) => r.data),
  save: (id: number | undefined, body: AccessCardRequest) =>
    (id == null ? http.post<AccessCard>('/access-cards', body) : http.put<AccessCard>(`/access-cards/${id}`, body)).then(
      (r) => r.data,
    ),
  issue: (id: number, body: IssueRequest) => http.post<AccessCard>(`/access-cards/${id}/issue`, body).then((r) => r.data),
  changeStatus: (id: number, status: CardStatus, note: string | null, version: number) =>
    http.post<AccessCard>(`/access-cards/${id}/status`, { status, note, version }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/access-cards/${id}`),
}
