import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sosApi, type ListParams } from '@/features/sos/api'
import type { SosRequest } from '@/features/sos/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const sosKeys = {
  all: ['sos-alerts'] as const,
  list: (params: ListParams, buildingId: number | null) => [...sosKeys.all, 'list', buildingId, params] as const,
  active: (buildingId: number | null) => [...sosKeys.all, 'active', buildingId] as const,
  detail: (id: number) => [...sosKeys.all, 'detail', id] as const,
}

/** Hỏi định kỳ mỗi 15 giây (cảnh báo khẩn cấp cần thấy nhanh hơn chuông thông báo). */
export const SOS_POLL_MS = 15_000

export function useSosAlerts(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({ queryKey: sosKeys.list(params, buildingId), queryFn: () => sosApi.list(params), placeholderData: keepPreviousData })
}

export function useActiveSos(enabled: boolean) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: sosKeys.active(buildingId),
    queryFn: sosApi.active,
    enabled,
    refetchInterval: SOS_POLL_MS,
    refetchIntervalInBackground: true,
  })
}

export function useSosAlert(id: number | undefined) {
  return useQuery({ queryKey: sosKeys.detail(id ?? 0), enabled: id != null, queryFn: () => sosApi.get(id!) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sosKeys.all })
}

export function useCreateSos() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (body: SosRequest) => sosApi.create(body), onSuccess: invalidate })
}

export type SosAction =
  | { type: 'acknowledge'; id: number; version: number }
  | { type: 'resolve'; id: number; version: number; status: 'RESOLVED' | 'FALSE_ALARM'; note: string }

export function useSosAction() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (a: SosAction): Promise<void> => {
      if (a.type === 'acknowledge') await sosApi.acknowledge(a.id, a.version)
      else await sosApi.resolve(a.id, a.status, a.note, a.version)
    },
    onSuccess: invalidate,
  })
}
