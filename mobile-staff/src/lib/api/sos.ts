import { clean, data, http, type Params } from '@/lib/api/shared'
import type { PageResponse, SosActive, SosAlert } from '@/lib/types'

export const sosApi = {
  active: () => data(http.get<SosActive>('/sos-alerts/active')),
  list: (p: Params) =>
    data(http.get<PageResponse<SosAlert>>('/sos-alerts', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<SosAlert>(`/sos-alerts/${id}`)),
  acknowledge: (id: number, version: number) => data(http.post<SosAlert>(`/sos-alerts/${id}/acknowledge`, { version })),
  resolve: (id: number, status: 'RESOLVED' | 'FALSE_ALARM', note: string, version: number) =>
    data(http.post<SosAlert>(`/sos-alerts/${id}/resolve`, { status, note, version })),
}
