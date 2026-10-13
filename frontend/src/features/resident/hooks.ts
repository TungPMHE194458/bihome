import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apartmentKeys } from '@/features/apartment/hooks'
import { buildingKeys } from '@/features/building/hooks'
import { residentApi, type ListParams } from '@/features/resident/api'
import type { LinkRequest, ResidentRequest } from '@/features/resident/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const residentKeys = {
  all: ['residents'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...residentKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...residentKeys.all, 'detail', id] as const,
  byApartment: (apartmentId: number) => [...residentKeys.all, 'apartment', apartmentId] as const,
  appAccount: (id: number) => [...residentKeys.all, 'app-account', id] as const,
}

export function useResidentList(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: residentKeys.list(params, buildingId),
    queryFn: () => residentApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useResident(id: number | undefined) {
  return useQuery({ queryKey: residentKeys.detail(id ?? 0), enabled: id != null, queryFn: () => residentApi.get(id!) })
}

export function useApartmentMembers(apartmentId: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: residentKeys.byApartment(apartmentId),
    queryFn: () => residentApi.byApartment(apartmentId),
    enabled: options.enabled ?? true,
  })
}

/**
 * Cư dân làm đổi chủ sở hữu/thành viên của căn hộ và thống kê của tòa nhà nên làm mới cả hai.
 * @param deletedId bỏ qua chi tiết của cư dân vừa xoá (gọi lại sẽ 404 trước khi trang kịp rời đi).
 */
function useInvalidateResidents() {
  const queryClient = useQueryClient()
  return (deletedId?: number) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: residentKeys.all,
        predicate: (q) => deletedId == null || q.queryKey.join('/') !== residentKeys.detail(deletedId).join('/'),
      }),
      queryClient.invalidateQueries({ queryKey: apartmentKeys.all }),
      queryClient.invalidateQueries({ queryKey: buildingKeys.all }),
    ])
}

export function useSaveResident() {
  const invalidate = useInvalidateResidents()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ResidentRequest }) =>
      id == null ? residentApi.create(body) : residentApi.update(id, body),
    onSuccess: () => invalidate(),
  })
}

/** Gán căn hộ mới (linkId bỏ trống) hoặc sửa thông tin cư trú tại một căn. */
export function useSaveResidence() {
  const invalidate = useInvalidateResidents()
  return useMutation({
    mutationFn: ({ residentId, linkId, body }: { residentId: number; linkId?: number; body: LinkRequest }) =>
      linkId == null
        ? residentApi.assignApartment(residentId, body)
        : residentApi.updateApartment(residentId, linkId, body),
    onSuccess: () => invalidate(),
  })
}

export function useMoveOut() {
  const invalidate = useInvalidateResidents()
  return useMutation({
    mutationFn: ({ id, moveOutDate, linkIds }: { id: number; moveOutDate: string; linkIds?: number[] }) =>
      residentApi.moveOut(id, { moveOutDate, linkIds }),
    onSuccess: () => invalidate(),
  })
}

export function useDeleteResident() {
  const invalidate = useInvalidateResidents()
  return useMutation({ mutationFn: (id: number) => residentApi.remove(id), onSuccess: (_, id) => invalidate(id) })
}

export function useImportResidents() {
  const invalidate = useInvalidateResidents()
  return useMutation({
    mutationFn: ({ file, stopOnError }: { file: File; stopOnError: boolean }) =>
      residentApi.importExcel(file, stopOnError),
    onSuccess: (result) => (result.imported ? invalidate() : undefined),
  })
}

/** Tài khoản app của cư dân; chỉ gọi khi cư dân đã có tài khoản (chưa có thì API trả 404). */
export function useAppAccount(residentId: number, enabled: boolean) {
  return useQuery({
    queryKey: residentKeys.appAccount(residentId),
    queryFn: () => residentApi.appAccount(residentId),
    enabled,
  })
}

/** Tạo / khoá / mở khoá / đặt lại / xoá tài khoản app; làm mới chi tiết cư dân (chip trạng thái) và danh sách. */
export function useAppAccountAction<T>(residentId: number, action: (id: number) => Promise<T>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => action(residentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: residentKeys.all })
    },
  })
}
