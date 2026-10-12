import type { ApartmentDetail, ApartmentOption, ApartmentRequest, ApartmentSummary } from '@/features/apartment/types'
import type { ActiveStatus, ImportResult, PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Căn hộ thuộc phạm vi tòa nhà: X-Building-Id (tòa đang chọn) được http tự gửi kèm. */
export const apartmentApi = {
  list: (params: ListParams) =>
    http.get<PageResponse<ApartmentSummary>>('/apartments', { params }).then((r) => r.data),
  /** Tối đa 20 căn đang hoạt động khớp mã/tên; phạm vi tòa như danh sách. */
  options: (keyword: string, buildingId?: number) =>
    http
      .get<ApartmentOption[]>('/apartments/options', { params: { keyword: keyword || undefined, buildingId } })
      .then((r) => r.data),
  get: (id: number) => http.get<ApartmentDetail>(`/apartments/${id}`).then((r) => r.data),
  create: (body: ApartmentRequest) => http.post<ApartmentDetail>('/apartments', body).then((r) => r.data),
  update: (id: number, body: ApartmentRequest) =>
    http.put<ApartmentDetail>(`/apartments/${id}`, body).then((r) => r.data),
  changeStatus: (id: number, status: ActiveStatus) =>
    http.patch<ApartmentDetail>(`/apartments/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/apartments/${id}`),
  exportExcel: (params: ListParams) => {
    const filters = Object.fromEntries(Object.entries(params).filter(([k]) => !['page', 'size', 'sort'].includes(k)))
    return downloadFromApi('/apartments/export', filters, 'can-ho.xlsx')
  },
  downloadTemplate: () => downloadFromApi('/apartments/import-template', undefined, 'mau-nhap-can-ho.xlsx'),
  importExcel: (file: File, stopOnError: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return http
      .post<ImportResult>('/apartments/import', form, { params: { stopOnError } })
      .then((r) => r.data)
  },
}
