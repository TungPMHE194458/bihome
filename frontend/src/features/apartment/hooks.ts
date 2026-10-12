import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apartmentApi, type ListParams } from '@/features/apartment/api'
import type { ApartmentRequest } from '@/features/apartment/types'
import { buildingKeys } from '@/features/building/hooks'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const apartmentKeys = {
  all: ['apartments'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...apartmentKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...apartmentKeys.all, 'detail', id] as const,
}

export function useApartmentList(params: ListParams, options: { enabled?: boolean } = {}) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: apartmentKeys.list(params, buildingId),
    queryFn: () => apartmentApi.list(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useApartment(id: number | undefined) {
  return useQuery({
    queryKey: apartmentKeys.detail(id ?? 0),
    enabled: id != null,
    queryFn: () => apartmentApi.get(id!),
  })
}

/** Thêm/xoá căn hộ làm đổi "Số lượng căn hộ" của tòa nhà nên làm mới cả dữ liệu tòa nhà. */
function useInvalidateApartments() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: apartmentKeys.all }),
      queryClient.invalidateQueries({ queryKey: buildingKeys.all }),
    ])
}

export function useSaveApartment() {
  const invalidate = useInvalidateApartments()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ApartmentRequest }) =>
      id == null ? apartmentApi.create(body) : apartmentApi.update(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeApartmentStatus() {
  const invalidate = useInvalidateApartments()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => apartmentApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteApartment() {
  const invalidate = useInvalidateApartments()
  return useMutation({ mutationFn: (id: number) => apartmentApi.remove(id), onSuccess: invalidate })
}

export function useImportApartments() {
  const invalidate = useInvalidateApartments()
  return useMutation({
    mutationFn: ({ file, stopOnError }: { file: File; stopOnError: boolean }) =>
      apartmentApi.importExcel(file, stopOnError),
    onSuccess: (result) => (result.imported ? invalidate() : undefined),
  })
}
