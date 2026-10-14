import { clean, data, http, type Params } from '@/lib/api/shared'
import type {
  AssetCategory,
  AssetCategoryOption,
  AssetCategoryRequest,
  AssetItem,
  AssetItemRequest,
  PageResponse,
} from '@/lib/types'

export const assetApi = {
  categories: (p: Params) =>
    data(http.get<PageResponse<AssetCategory>>('/asset-categories', { params: clean({ size: 20, sort: 'name,asc', ...p }) })),
  categoryOptions: (buildingId?: number) =>
    data(http.get<AssetCategoryOption[]>('/asset-categories/options', { params: clean({ buildingId }) })),
  category: (id: number) => data(http.get<AssetCategory>(`/asset-categories/${id}`)),
  saveCategory: (id: number | undefined, body: AssetCategoryRequest) =>
    data(
      id == null
        ? http.post<AssetCategory>('/asset-categories', body)
        : http.put<AssetCategory>(`/asset-categories/${id}`, body),
    ),
  categoryStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') =>
    data(http.patch<AssetCategory>(`/asset-categories/${id}/status`, { status })),
  removeCategory: (id: number) => http.delete(`/asset-categories/${id}`),

  items: (p: Params) =>
    data(http.get<PageResponse<AssetItem>>('/asset-items', { params: clean({ size: 20, sort: 'plateNumber,asc', ...p }) })),
  item: (id: number) => data(http.get<AssetItem>(`/asset-items/${id}`)),
  saveItem: (id: number | undefined, body: AssetItemRequest) =>
    data(id == null ? http.post<AssetItem>('/asset-items', body) : http.put<AssetItem>(`/asset-items/${id}`, body)),
  itemStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') => data(http.patch<AssetItem>(`/asset-items/${id}/status`, { status })),
  removeItem: (id: number) => http.delete(`/asset-items/${id}`),
}
