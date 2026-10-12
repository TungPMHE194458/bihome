import type { SosActive, SosAlert, SosRequest } from '@/features/sos/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const sosApi = {
  list: (params: ListParams) => http.get<PageResponse<SosAlert>>('/sos-alerts', { params }).then((r) => r.data),
  active: () => http.get<SosActive>('/sos-alerts/active').then((r) => r.data),
  get: (id: number) => http.get<SosAlert>(`/sos-alerts/${id}`).then((r) => r.data),
  create: (body: SosRequest) => http.post<SosAlert>('/sos-alerts', body).then((r) => r.data),
  acknowledge: (id: number, version: number) => http.post<SosAlert>(`/sos-alerts/${id}/acknowledge`, { version }).then((r) => r.data),
  resolve: (id: number, status: 'RESOLVED' | 'FALSE_ALARM', note: string, version: number) =>
    http.post<SosAlert>(`/sos-alerts/${id}/resolve`, { status, note, version }).then((r) => r.data),
}
