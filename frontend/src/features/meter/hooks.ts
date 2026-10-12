import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useInvalidateFinance } from '@/features/feenotice/hooks'
import { meterApi, type ListParams } from '@/features/meter/api'
import type { MeterReadingRequest, MeterType, SheetEntry } from '@/features/meter/types'
import { useBuildingStore } from '@/stores/buildingStore'

export const meterKeys = {
  all: ['meter-readings'] as const,
  list: (params: ListParams, buildingId: number | null) => [...meterKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...meterKeys.all, 'detail', id] as const,
  sheet: (buildingId: number | null, period: string, type: MeterType, floor: string) =>
    [...meterKeys.all, 'sheet', buildingId, period, type, floor] as const,
}

export function useMeterReadings(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: meterKeys.list(params, buildingId),
    queryFn: () => meterApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useMeterReading(id: number | undefined) {
  return useQuery({ queryKey: meterKeys.detail(id ?? 0), enabled: id != null, queryFn: () => meterApi.get(id!) })
}

export function usePreviousReading(apartmentId: number | undefined, meterType: MeterType, period: string, enabled: boolean) {
  return useQuery({
    queryKey: [...meterKeys.all, 'previous', apartmentId, meterType, period],
    enabled: enabled && apartmentId != null && !!period,
    queryFn: () => meterApi.previous(apartmentId!, meterType, period),
  })
}

export function useMeterSheet(period: string, meterType: MeterType, floor: string, enabled: boolean) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: meterKeys.sheet(buildingId, period, meterType, floor),
    enabled,
    queryFn: () => meterApi.sheet(period, meterType, floor),
  })
}

export function useSaveMeterReading() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: MeterReadingRequest }) => meterApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteMeterReading() {
  const invalidate = useInvalidateFinance()
  return useMutation({ mutationFn: (id: number) => meterApi.remove(id), onSuccess: invalidate })
}

export function useSaveMeterSheet() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: ({ period, meterType, rows }: { period: string; meterType: MeterType; rows: SheetEntry[] }) =>
      meterApi.saveSheet(period, meterType, rows),
    onSuccess: invalidate,
  })
}

export function useImportMeterReadings() {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: ({ file, period, stopOnError }: { file: File; period: string; stopOnError: boolean }) =>
      meterApi.importExcel(file, period, stopOnError),
    onSuccess: invalidate,
  })
}
