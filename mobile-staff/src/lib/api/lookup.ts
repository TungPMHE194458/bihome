import { clean, data, http, type Params } from '@/lib/api/shared'
import type { AssetItem, PageResponse, ResidentSummary } from '@/lib/types'
import { apartmentApi } from '@/lib/api/apartment'

export const lookupApi = {
  residents: (keyword: string) =>
    data(http.get<PageResponse<ResidentSummary>>('/residents', { params: clean({ keyword, size: 20, sort: 'fullName,asc' }) })),
  apartments: apartmentApi.list,
  apartment: apartmentApi.get,
  apartmentMembers: apartmentApi.members,
  vehicles: (p: Params) =>
    data(http.get<PageResponse<AssetItem>>('/asset-items', { params: clean({ size: 20, sort: 'plateNumber,asc', ...p }) })),
}
