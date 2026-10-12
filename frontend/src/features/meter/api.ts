import type { MeterReading, MeterReadingRequest, MeterSheet, MeterType, PreviousInfo, SheetEntry } from '@/features/meter/types'
import type { ImportResult, PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const meterApi = {
  list: (params: ListParams) => http.get<PageResponse<MeterReading>>('/meter-readings', { params }).then((r) => r.data),
  get: (id: number) => http.get<MeterReading>(`/meter-readings/${id}`).then((r) => r.data),
  previous: (apartmentId: number, meterType: MeterType, period: string) =>
    http.get<PreviousInfo>('/meter-readings/previous', { params: { apartmentId, meterType, period } }).then((r) => r.data),
  save: (id: number | undefined, body: MeterReadingRequest) =>
    (id == null ? http.post<MeterReading>('/meter-readings', body) : http.put<MeterReading>(`/meter-readings/${id}`, body)).then(
      (r) => r.data,
    ),
  remove: (id: number) => http.delete<void>(`/meter-readings/${id}`),
  sheet: (period: string, meterType: MeterType, floor?: string) =>
    http.get<MeterSheet>('/meter-readings/sheet', { params: { period, meterType, floor: floor || undefined } }).then((r) => r.data),
  saveSheet: (period: string, meterType: MeterType, rows: SheetEntry[]) =>
    http
      .put<{ created: number; updated: number; unchanged: number }>('/meter-readings/sheet', { period, meterType, rows })
      .then((r) => r.data),
  downloadTemplate: () => downloadFromApi('/meter-readings/import-template', undefined, 'mau-nhap-so-lieu.xlsx'),
  importExcel: (file: File, period: string, stopOnError: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<ImportResult>('/meter-readings/import', form, { params: { period, stopOnError } })
      .then((r) => r.data)
  },
}
