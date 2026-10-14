import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type { BuildingDetail, BuildingRequest, BuildingSummary, PageResponse } from '@/lib/types'

export const buildingApi = {
  list: (p: Params) =>
    data(
      http.get<PageResponse<BuildingSummary>>('/buildings', { params: clean({ size: 20, sort: 'code,asc', ...p }), ...noBuilding }),
    ),
  get: (id: number) => data(http.get<BuildingDetail>(`/buildings/${id}`, noBuilding)),
  save: (id: number | undefined, body: BuildingRequest) =>
    data(
      id == null
        ? http.post<BuildingDetail>('/buildings', body, noBuilding)
        : http.put<BuildingDetail>(`/buildings/${id}`, body, noBuilding),
    ),
  status: (id: number, status: 'ACTIVE' | 'INACTIVE') =>
    data(http.patch<BuildingDetail>(`/buildings/${id}/status`, { status }, noBuilding)),
  remove: (id: number) => http.delete(`/buildings/${id}`, noBuilding),
}
