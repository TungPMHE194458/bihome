import type {
  AssetCategory,
  AssetCategoryOption,
  AssetCategoryRequest,
  AssetItem,
  AssetItemRequest,
} from '@/features/asset/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const assetApi = {
  categories: (params: ListParams) =>
    http.get<PageResponse<AssetCategory>>('/asset-categories', { params }).then((r) => r.data),
  categoryOptions: (buildingId: number | undefined) =>
    http.get<AssetCategoryOption[]>('/asset-categories/options', { params: { buildingId } }).then((r) => r.data),
  category: (id: number) => http.get<AssetCategory>(`/asset-categories/${id}`).then((r) => r.data),
  saveCategory: (id: number | undefined, body: AssetCategoryRequest) =>
    (id == null ? http.post<AssetCategory>('/asset-categories', body) : http.put<AssetCategory>(`/asset-categories/${id}`, body))
      .then((r) => r.data),
  categoryStatus: (id: number, status: ActiveStatus) =>
    http.patch<AssetCategory>(`/asset-categories/${id}/status`, { status }).then((r) => r.data),
  removeCategory: (id: number) => http.delete<void>(`/asset-categories/${id}`),

  items: (params: ListParams) => http.get<PageResponse<AssetItem>>('/asset-items', { params }).then((r) => r.data),
  item: (id: number) => http.get<AssetItem>(`/asset-items/${id}`).then((r) => r.data),
  saveItem: (id: number | undefined, body: AssetItemRequest) =>
    (id == null ? http.post<AssetItem>('/asset-items', body) : http.put<AssetItem>(`/asset-items/${id}`, body)).then((r) => r.data),
  itemStatus: (id: number, status: ActiveStatus) =>
    http.patch<AssetItem>(`/asset-items/${id}/status`, { status }).then((r) => r.data),
  removeItem: (id: number) => http.delete<void>(`/asset-items/${id}`),
}
