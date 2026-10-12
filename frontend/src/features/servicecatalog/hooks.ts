import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceApi, type ListParams } from '@/features/servicecatalog/api'
import type { ServiceRequest, ServiceTypeRequest } from '@/features/servicecatalog/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const serviceKeys = {
  all: ['services'] as const,
  types: (params: ListParams) => [...serviceKeys.all, 'types', params] as const,
  typeOptions: () => [...serviceKeys.all, 'type-options'] as const,
  type: (id: number) => [...serviceKeys.all, 'type', id] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...serviceKeys.all, 'list', buildingId, params] as const,
  options: (buildingId: number | null) => [...serviceKeys.all, 'options', buildingId] as const,
  detail: (id: number) => [...serviceKeys.all, 'detail', id] as const,
}

export function useServiceTypes(params: ListParams) {
  return useQuery({ queryKey: serviceKeys.types(params), queryFn: () => serviceApi.types(params), placeholderData: keepPreviousData })
}

/** Loại dịch vụ đang hoạt động. */
export function useServiceTypeOptions(enabled = true) {
  return useQuery({ queryKey: serviceKeys.typeOptions(), queryFn: serviceApi.typeOptions, staleTime: 60_000, enabled })
}

export function useServiceType(id: number | undefined) {
  return useQuery({ queryKey: serviceKeys.type(id ?? 0), enabled: id != null, queryFn: () => serviceApi.type(id!) })
}

export function useServices(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: serviceKeys.list(params, buildingId),
    queryFn: () => serviceApi.list(params),
    placeholderData: keepPreviousData,
  })
}

/** Dịch vụ đang hoạt động của một tòa. */
export function useServiceOptions(buildingId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: serviceKeys.options(buildingId ?? null),
    queryFn: () => serviceApi.options(buildingId ?? undefined),
    enabled: enabled && buildingId != null,
  })
}

export function useService(id: number | undefined) {
  return useQuery({ queryKey: serviceKeys.detail(id ?? 0), enabled: id != null, queryFn: () => serviceApi.get(id!) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: serviceKeys.all })
}

export function useSaveServiceType() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ServiceTypeRequest }) => serviceApi.saveType(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeServiceTypeStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => serviceApi.typeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteServiceType() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => serviceApi.removeType(id), onSuccess: invalidate })
}

export function useSaveService() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ServiceRequest }) => serviceApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeServiceStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => serviceApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteService() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => serviceApi.remove(id), onSuccess: invalidate })
}
