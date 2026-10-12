import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useInvalidateFinance } from '@/features/feenotice/hooks'
import type { ReconcileStatus } from '@/features/feenotice/types'
import { paymentApi, type ListParams } from '@/features/payment/api'
import type { PaymentRequest } from '@/features/payment/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: ListParams, buildingId: number | null) => [...paymentKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...paymentKeys.all, 'detail', id] as const,
}

export function usePayments(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: paymentKeys.list(params, buildingId),
    queryFn: () => paymentApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function usePayment(id: number | undefined) {
  return useQuery({ queryKey: paymentKeys.detail(id ?? 0), enabled: id != null, queryFn: () => paymentApi.get(id!) })
}

export function useCreatePayment() {
  const invalidate = useInvalidateFinance()
  return useMutation({ mutationFn: (body: PaymentRequest) => paymentApi.create(body), onSuccess: invalidate })
}

export type PaymentAction =
  | { type: 'cancel'; id: number; version: number; reason: string }
  | { type: 'reconcile'; id: number; version: number; status: ReconcileStatus }

export function usePaymentAction() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: async (a: PaymentAction): Promise<void> => {
      if (a.type === 'cancel') await paymentApi.cancel(a.id, a.reason, a.version)
      else await paymentApi.reconcile(a.id, a.status, a.version)
    },
    onSuccess: invalidate,
  })
}
