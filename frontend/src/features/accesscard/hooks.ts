import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessCardApi, type ListParams } from '@/features/accesscard/api'
import type { AccessCardRequest, CardStatus, IssueRequest } from '@/features/accesscard/types'
import { apartmentKeys } from '@/features/apartment/hooks'
import { assetKeys } from '@/features/asset/hooks'
import { useBuildingStore } from '@/stores/buildingStore'

export const accessCardKeys = {
  all: ['access-cards'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...accessCardKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...accessCardKeys.all, 'detail', id] as const,
  history: (id: number) => [...accessCardKeys.all, 'history', id] as const,
}

export function useAccessCards(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: accessCardKeys.list(params, buildingId),
    queryFn: () => accessCardApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useAccessCard(id: number | undefined) {
  return useQuery({ queryKey: accessCardKeys.detail(id ?? 0), enabled: id != null, queryFn: () => accessCardApi.get(id!) })
}

export function useCardHistory(id: number | undefined) {
  return useQuery({ queryKey: accessCardKeys.history(id ?? 0), enabled: id != null, queryFn: () => accessCardApi.history(id!) })
}

/** Thẻ hiện ở danh sách xe ("Mã thẻ từ") và chặn xoá căn hộ nên làm mới cả hai. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accessCardKeys.all }),
      queryClient.invalidateQueries({ queryKey: assetKeys.all }),
      queryClient.invalidateQueries({ queryKey: apartmentKeys.all }),
    ])
}

export function useSaveAccessCard() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AccessCardRequest }) => accessCardApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useIssueAccessCard() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IssueRequest }) => accessCardApi.issue(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeCardStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status, note, version }: { id: number; status: CardStatus; note: string | null; version: number }) =>
      accessCardApi.changeStatus(id, status, note, version),
    onSuccess: invalidate,
  })
}

export function useDeleteAccessCard() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => accessCardApi.remove(id), onSuccess: invalidate })
}
