import { clean, data, http } from '@/lib/api/shared'
import type { MeterSheet, MeterType, SheetEntry } from '@/lib/types'

export const meterApi = {
  sheet: (period: string, meterType: MeterType, floor?: string) =>
    data(http.get<MeterSheet>('/meter-readings/sheet', { params: clean({ period, meterType, floor }) })),
  saveSheet: (period: string, meterType: MeterType, rows: SheetEntry[]) =>
    data(http.put<{ created: number; updated: number; unchanged: number }>('/meter-readings/sheet', { period, meterType, rows })),
}
