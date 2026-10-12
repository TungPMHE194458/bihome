import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apartmentKeys } from '@/features/apartment/hooks'
import { assetApi, type ListParams } from '@/features/asset/api'
import type { AssetCategoryRequest, AssetItemRequest } from '@/features/asset/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const assetKeys = {
  all: ['assets'] as const,
  categories: (params: ListParams, buildingId: number | null) => [...assetKeys.all, 'categories', buildingId, params] as const,
  categoryOptions: (buildingId: number) => [...assetKeys.all, 'category-options', buildingId] as const,
  category: (id: number) => [...assetKeys.all, 'category', id] as const,
  items: (params: ListParams, buildingId: number | null) => [...assetKeys.all, 'items', buildingId, params] as const,
  item: (id: number) => [...assetKeys.all, 'item', id] as const,
}

export function useAssetCategories(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: assetKeys.categories(params, buildingId),
    queryFn: () => assetApi.categories(params),
    placeholderData: keepPreviousData,
  })
}

export function useCategoryOptions(buildingId: number | null | undefined) {
  return useQuery({
    queryKey: assetKeys.categoryOptions(buildingId ?? 0),
    enabled: buildingId != null,
    queryFn: () => assetApi.categoryOptions(buildingId!),
  })
}

/** Tên danh mục của mọi tòa được truy cập (lọc theo tên ở chế độ "Tất cả" tòa). */
export function useAllCategoryNames(enabled: boolean) {
  return useQuery({
    queryKey: [...assetKeys.categoryOptions(0), 'all-names'],
    enabled,
    queryFn: async () => [...new Set((await assetApi.categoryOptions(undefined)).map((c) => c.name))],
  })
}

export function useAssetCategory(id: number | undefined) {
  return useQuery({ queryKey: assetKeys.category(id ?? 0), enabled: id != null, queryFn: () => assetApi.category(id!) })
}

export function useAssetItems(params: ListParams, options: { enabled?: boolean } = {}) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: assetKeys.items(params, buildingId),
    queryFn: () => assetApi.items(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useAssetItem(id: number | undefined) {
  return useQuery({ queryKey: assetKeys.item(id ?? 0), enabled: id != null, queryFn: () => assetApi.item(id!) })
}

function useInvalidateAssets() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: assetKeys.all }),
      queryClient.invalidateQueries({ queryKey: apartmentKeys.all }),
    ])
}

export function useSaveCategory() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AssetCategoryRequest }) => assetApi.saveCategory(id, body),
    onSuccess: invalidate,
  })
}

export function useCategoryStatus() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => assetApi.categoryStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateAssets()
  return useMutation({ mutationFn: (id: number) => assetApi.removeCategory(id), onSuccess: invalidate })
}

export function useSaveItem() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AssetItemRequest }) => assetApi.saveItem(id, body),
    onSuccess: invalidate,
  })
}

export function useItemStatus() {
  const invalidate = useInvalidateAssets()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => assetApi.itemStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidateAssets()
  return useMutation({ mutationFn: (id: number) => assetApi.removeItem(id), onSuccess: invalidate })
}
