import { clean, data, http, type Params } from '@/lib/api/shared'
import type {
  AppAccount,
  AppAccountPassword,
  LinkRequest,
  PageResponse,
  ResidentDetail,
  ResidentRequest,
  ResidentSummary,
} from '@/lib/types'

export const residentApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<ResidentSummary>>('/residents', { params: clean({ size: 20, sort: 'fullName,asc', ...p }) })),
  get: (id: number) => data(http.get<ResidentDetail>(`/residents/${id}`)),
  save: (id: number | undefined, body: ResidentRequest) =>
    data(id == null ? http.post<ResidentDetail>('/residents', body) : http.put<ResidentDetail>(`/residents/${id}`, body)),
  assignApartment: (id: number, body: LinkRequest) => data(http.post<ResidentDetail>(`/residents/${id}/apartments`, body)),
  updateLink: (id: number, linkId: number, body: LinkRequest) =>
    data(http.put<ResidentDetail>(`/residents/${id}/apartments/${linkId}`, body)),
  moveOut: (id: number, moveOutDate: string, linkIds?: number[]) =>
    data(http.post<ResidentDetail>(`/residents/${id}/move-out`, { moveOutDate, linkIds })),
  remove: (id: number) => http.delete(`/residents/${id}`),

  appAccount: (id: number) => data(http.get<AppAccount>(`/residents/${id}/app-account`)),
  createAppAccount: (id: number) => data(http.post<AppAccountPassword>(`/residents/${id}/app-account`)),
  lockAppAccount: (id: number) => data(http.post<AppAccount>(`/residents/${id}/app-account/lock`)),
  unlockAppAccount: (id: number) => data(http.post<AppAccount>(`/residents/${id}/app-account/unlock`)),
  resetAppPassword: (id: number) => data(http.post<AppAccountPassword>(`/residents/${id}/app-account/reset-password`)),
  deleteAppAccount: (id: number) => http.delete(`/residents/${id}/app-account`),
}
