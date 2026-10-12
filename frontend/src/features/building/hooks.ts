import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildingApi, type ListParams } from '@/features/building/api'
import type { BuildingRequest } from '@/features/building/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useAuthStore } from '@/stores/authStore'

export const buildingKeys = {
  all: ['buildings'] as const,
  list: (params: ListParams) => [...buildingKeys.all, 'list', params] as const,
  detail: (id: number) => [...buildingKeys.all, 'detail', id] as const,
  options: () => [...buildingKeys.all, 'options'] as const,
}

export function useBuildingOptions() {
  const authenticated = useAuthStore((s) => s.status === 'authenticated')
  return useQuery({
    queryKey: buildingKeys.options(),
    enabled: authenticated,
    staleTime: 5 * 60_000,
    queryFn: buildingApi.options,
  })
}

export function useBuildingList(params: ListParams) {
  return useQuery({
    queryKey: buildingKeys.list(params),
    queryFn: () => buildingApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useBuilding(id: number | undefined) {
  return useQuery({
    queryKey: buildingKeys.detail(id ?? 0),
    enabled: id != null,
    queryFn: () => buildingApi.get(id!),
  })
}

/** Mọi thay đổi đều làm mới danh sách, chi tiết và bộ chọn tòa nhà ở header. */
function useInvalidateBuildings() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: buildingKeys.all })
}

export function useSaveBuilding() {
  const invalidate = useInvalidateBuildings()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: BuildingRequest }) =>
      id == null ? buildingApi.create(body) : buildingApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeBuildingStatus() {
  const invalidate = useInvalidateBuildings()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => buildingApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteBuilding() {
  const invalidate = useInvalidateBuildings()
  return useMutation({
    mutationFn: (id: number) => buildingApi.remove(id),
    onSuccess: invalidate,
  })
}
