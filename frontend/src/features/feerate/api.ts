import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FeeRates, FeeRatesRequest } from '@/features/feerate/types'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export const feeRateApi = {
  get: () => http.get<FeeRates>('/fee-rates').then((r) => r.data),
  save: (body: FeeRatesRequest) => http.put<FeeRates>('/fee-rates', body).then((r) => r.data),
}

export function useFeeRates() {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({ queryKey: ['fee-rates', buildingId], enabled: buildingId != null, queryFn: feeRateApi.get })
}

export function useSaveFeeRates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feeRateApi.save,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-rates'] }),
  })
}
