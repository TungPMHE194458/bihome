import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feeNoticeApi, type ListParams } from '@/features/feenotice/api'
import type { FeeNoticeUpdate, GenerateRequest } from '@/features/feenotice/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const feeNoticeKeys = {
  all: ['fee-notices'] as const,
  list: (params: ListParams, buildingId: number | null) => [...feeNoticeKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...feeNoticeKeys.all, 'detail', id] as const,
}

export function useFeeNotices(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: feeNoticeKeys.list(params, buildingId),
    queryFn: () => feeNoticeApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useFeeNotice(id: number | undefined) {
  return useQuery({ queryKey: feeNoticeKeys.detail(id ?? 0), enabled: id != null, queryFn: () => feeNoticeApi.get(id!) })
}

/** Ghi phiếu thu / đổi số liệu ảnh hưởng thông báo phí, giao dịch và bảng điều khiển. */
export function useInvalidateFinance() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: feeNoticeKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] }),
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
}

export function usePreviewFeeNotices() {
  return useMutation({ mutationFn: (body: GenerateRequest) => feeNoticeApi.preview(body) })
}

export function useGenerateFeeNotices() {
  const invalidate = useInvalidateFinance()
  return useMutation({ mutationFn: (body: GenerateRequest) => feeNoticeApi.generate(body), onSuccess: invalidate })
}

export function useUpdateFeeNotice() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: FeeNoticeUpdate }) => feeNoticeApi.update(id, body),
    onSuccess: invalidate,
  })
}

export type FeeNoticeAction =
  | { type: 'issue' | 'recalculate'; id: number; version: number }
  | { type: 'cancel'; id: number; version: number; reason: string }
  | { type: 'delete'; id: number }

export function useFeeNoticeAction() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: async (a: FeeNoticeAction): Promise<void> => {
      if (a.type === 'issue') await feeNoticeApi.issue(a.id, a.version)
      else if (a.type === 'recalculate') await feeNoticeApi.recalculate(a.id, a.version)
      else if (a.type === 'cancel') await feeNoticeApi.cancel(a.id, a.reason, a.version)
      else await feeNoticeApi.remove(a.id)
    },
    onSuccess: invalidate,
  })
}

export function useIssueAll() {
  const invalidate = useInvalidateFinance()
  return useMutation({ mutationFn: (period: string) => feeNoticeApi.issueAll(period), onSuccess: invalidate })
}

export function useVietQr(id: number | undefined, enabled: boolean, version?: number) {
  return useQuery({
    queryKey: [...feeNoticeKeys.detail(id ?? 0), 'vietqr', version],
    enabled: id != null && enabled,
    queryFn: () => feeNoticeApi.vietQr(id!),
    retry: false,
  })
}
