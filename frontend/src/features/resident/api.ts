import type {
  ApartmentMember,
  LinkRequest,
  ResidentDetail,
  ResidentRequest,
  ResidentSummary,
} from '@/features/resident/types'
import type { ImportResult, PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Cư dân thuộc phạm vi tòa nhà: X-Building-Id (tòa đang chọn) được http tự gửi kèm. */
export const residentApi = {
  list: (params: ListParams) =>
    http.get<PageResponse<ResidentSummary>>('/residents', { params }).then((r) => r.data),
  get: (id: number) => http.get<ResidentDetail>(`/residents/${id}`).then((r) => r.data),
  byApartment: (apartmentId: number) =>
    http.get<ApartmentMember[]>(`/residents/apartment/${apartmentId}`).then((r) => r.data),
  create: (body: ResidentRequest) => http.post<ResidentDetail>('/residents', body).then((r) => r.data),
  update: (id: number, body: ResidentRequest) => http.put<ResidentDetail>(`/residents/${id}`, body).then((r) => r.data),
  assignApartment: (id: number, body: LinkRequest) =>
    http.post<ResidentDetail>(`/residents/${id}/apartments`, body).then((r) => r.data),
  updateApartment: (id: number, linkId: number, body: LinkRequest) =>
    http.put<ResidentDetail>(`/residents/${id}/apartments/${linkId}`, body).then((r) => r.data),
  moveOut: (id: number, body: { moveOutDate: string; linkIds?: number[] }) =>
    http.post<ResidentDetail>(`/residents/${id}/move-out`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/residents/${id}`),
  exportExcel: (params: ListParams) => {
    const filters = Object.fromEntries(Object.entries(params).filter(([k]) => !['page', 'size', 'sort'].includes(k)))
    return downloadFromApi('/residents/export', filters, 'cu-dan.xlsx')
  },
  downloadTemplate: () => downloadFromApi('/residents/import-template', undefined, 'mau-nhap-cu-dan.xlsx'),
  importExcel: (file: File, stopOnError: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return http.post<ImportResult>('/residents/import', form, { params: { stopOnError } }).then((r) => r.data)
  },
}
