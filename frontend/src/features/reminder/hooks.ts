import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reminderApi, type ListParams } from '@/features/reminder/api'
import type { ReminderRequest } from '@/features/reminder/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const reminderKeys = {
  all: ['reminders'] as const,
  list: (params: ListParams, buildingId: number | null) => [...reminderKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...reminderKeys.all, 'detail', id] as const,
  deliveries: (id: number, params: ListParams) => [...reminderKeys.all, 'deliveries', id, params] as const,
}

export function useReminders(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: reminderKeys.list(params, buildingId),
    queryFn: () => reminderApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useReminder(id: number | undefined) {
  return useQuery({ queryKey: reminderKeys.detail(id ?? 0), enabled: id != null, queryFn: () => reminderApi.get(id!) })
}

export function useReminderDeliveries(id: number | undefined, params: ListParams) {
  return useQuery({
    queryKey: reminderKeys.deliveries(id ?? 0, params),
    enabled: id != null,
    queryFn: () => reminderApi.deliveries(id!, params),
    placeholderData: keepPreviousData,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: reminderKeys.all })
}

export function useSaveReminder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: ReminderRequest }) => reminderApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useReminderAction() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ type, id, version }: { type: 'send' | 'cancel' | 'delete'; id: number; version: number }): Promise<void> => {
      if (type === 'send') await reminderApi.send(id, version)
      else if (type === 'cancel') await reminderApi.cancel(id, version)
      else await reminderApi.remove(id)
    },
    onSuccess: invalidate,
  })
}
