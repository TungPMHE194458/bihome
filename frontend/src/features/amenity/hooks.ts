import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { amenityApi, type ListParams } from '@/features/amenity/api'
import type { AmenityConfigRequest, AmenityRequest } from '@/features/amenity/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const amenityKeys = {
  all: ['amenities'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...amenityKeys.all, 'list', buildingId, params] as const,
  options: (buildingId: number | null) => [...amenityKeys.all, 'options', buildingId] as const,
  detail: (id: number) => [...amenityKeys.all, 'detail', id] as const,
  config: (id: number) => [...amenityKeys.all, 'config', id] as const,
}

export function useAmenities(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: amenityKeys.list(params, buildingId),
    queryFn: () => amenityApi.list(params),
    placeholderData: keepPreviousData,
  })
}

/** Tiện ích đang hoạt động của một tòa (mặc định tòa đang chọn). */
export function useAmenityOptions(buildingId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: amenityKeys.options(buildingId ?? null),
    queryFn: () => amenityApi.options(buildingId ?? undefined),
    enabled: enabled && buildingId != null,
  })
}

export function useAmenity(id: number | undefined) {
  return useQuery({ queryKey: amenityKeys.detail(id ?? 0), enabled: id != null, queryFn: () => amenityApi.get(id!) })
}

export function useAmenityConfig(id: number | undefined) {
  return useQuery({ queryKey: amenityKeys.config(id ?? 0), enabled: id != null, queryFn: () => amenityApi.config(id!) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: amenityKeys.all })
}

export function useSaveAmenity() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AmenityRequest }) => amenityApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeAmenityStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => amenityApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteAmenity() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => amenityApi.remove(id), onSuccess: invalidate })
}

export function useSaveAmenityConfig() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AmenityConfigRequest }) => amenityApi.saveConfig(id, body),
    onSuccess: invalidate,
  })
}
