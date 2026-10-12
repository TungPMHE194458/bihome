import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInvalidateFinance } from '@/features/feenotice/hooks'
import type { BankTransaction, VietQrRequest, VietQrSettings, WebhookResult } from '@/features/vietqr/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export const vietQrApi = {
  get: () => http.get<VietQrSettings>('/vietqr-settings').then((r) => r.data),
  save: (body: VietQrRequest) => http.put<VietQrSettings>('/vietqr-settings', body).then((r) => r.data),
  simulate: (body: { feeNoticeId: number; amount?: number | null; content?: string | null }) =>
    http.post<WebhookResult>('/vietqr-settings/simulate', body).then((r) => r.data),
  transactions: (params: Record<string, string | number>) =>
    http.get<PageResponse<BankTransaction>>('/bank-transactions', { params }).then((r) => r.data),
}

export function useVietQrSettings(enabled: boolean) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({ queryKey: ['vietqr-settings', buildingId], enabled: enabled && buildingId != null, queryFn: vietQrApi.get })
}

export function useSaveVietQr() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: vietQrApi.save,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vietqr-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['fee-notices'] }),
      ]),
  })
}

export function useSimulatePayment() {
  const invalidate = useInvalidateFinance()
  return useMutation({ mutationFn: vietQrApi.simulate, onSuccess: invalidate })
}

export function useBankTransactions(params: Record<string, string | number>) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: ['bank-transactions', buildingId, params],
    queryFn: () => vietQrApi.transactions(params),
    placeholderData: keepPreviousData,
  })
}
