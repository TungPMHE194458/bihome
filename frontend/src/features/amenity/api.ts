import type {
  Amenity,
  AmenityConfig,
  AmenityConfigRequest,
  AmenityOption,
  AmenityRequest,
} from '@/features/amenity/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Tiện ích thuộc phạm vi tòa nhà: X-Building-Id (tòa đang chọn) được http tự gửi kèm. */
export const amenityApi = {
  list: (params: ListParams) => http.get<PageResponse<Amenity>>('/amenities', { params }).then((r) => r.data),
  options: (buildingId?: number) =>
    http.get<AmenityOption[]>('/amenities/options', { params: { buildingId } }).then((r) => r.data),
  get: (id: number) => http.get<Amenity>(`/amenities/${id}`).then((r) => r.data),
  save: (id: number | undefined, body: AmenityRequest) =>
    (id == null ? http.post<Amenity>('/amenities', body) : http.put<Amenity>(`/amenities/${id}`, body)).then((r) => r.data),
  changeStatus: (id: number, status: ActiveStatus) =>
    http.patch<Amenity>(`/amenities/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/amenities/${id}`),
  config: (id: number) => http.get<AmenityConfig>(`/amenities/${id}/config`).then((r) => r.data),
  saveConfig: (id: number, body: AmenityConfigRequest) =>
    http.put<AmenityConfig>(`/amenities/${id}/config`, body).then((r) => r.data),
}
