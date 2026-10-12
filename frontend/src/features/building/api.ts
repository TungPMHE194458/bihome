import type {
  BuildingDetail,
  BuildingOption,
  BuildingRequest,
  BuildingSummary,
} from '@/features/building/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Màn hình Tòa nhà không lọc theo tòa đang chọn nên không gửi X-Building-Id. */
const noBuildingContext = { skipBuildingContext: true }

export const buildingApi = {
  list: (params: ListParams) =>
    http.get<PageResponse<BuildingSummary>>('/buildings', { params, ...noBuildingContext }).then((r) => r.data),
  options: () => http.get<BuildingOption[]>('/buildings/options', noBuildingContext).then((r) => r.data),
  get: (id: number) => http.get<BuildingDetail>(`/buildings/${id}`, noBuildingContext).then((r) => r.data),
  create: (body: BuildingRequest) =>
    http.post<BuildingDetail>('/buildings', body, noBuildingContext).then((r) => r.data),
  update: (id: number, body: BuildingRequest) =>
    http.put<BuildingDetail>(`/buildings/${id}`, body, noBuildingContext).then((r) => r.data),
  changeStatus: (id: number, status: ActiveStatus) =>
    http.patch<BuildingDetail>(`/buildings/${id}/status`, { status }, noBuildingContext).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/buildings/${id}`, noBuildingContext),
}
