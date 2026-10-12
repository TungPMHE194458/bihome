import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { voucherApi, type ListParams } from '@/features/voucher/api'
import type { VoucherRequest } from '@/features/voucher/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const voucherKeys = {
  all: ['vouchers'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...voucherKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...voucherKeys.all, 'detail', id] as const,
}

export function useVouchers(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: voucherKeys.list(params, buildingId),
    queryFn: () => voucherApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useVoucher(id: number | undefined) {
  return useQuery({ queryKey: voucherKeys.detail(id ?? 0), enabled: id != null, queryFn: () => voucherApi.get(id!) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: voucherKeys.all })
}

export function useSaveVoucher() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: VoucherRequest }) => voucherApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeVoucherStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => voucherApi.changeStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteVoucher() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => voucherApi.remove(id), onSuccess: invalidate })
}
