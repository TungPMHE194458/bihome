import { clean, data, http, type Params } from '@/lib/api/shared'
import type { ApartmentDetail, ApartmentMember, ApartmentOption, ApartmentRequest, ApartmentSummary, PageResponse } from '@/lib/types'

export const apartmentApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<ApartmentSummary>>('/apartments', { params: clean({ size: 20, sort: 'code,asc', ...p }) })),
  options: (keyword: string, buildingId?: number) =>
    data(http.get<ApartmentOption[]>('/apartments/options', { params: clean({ keyword, buildingId }) })),
  get: (id: number) => data(http.get<ApartmentDetail>(`/apartments/${id}`)),
  save: (id: number | undefined, body: ApartmentRequest) =>
    data(id == null ? http.post<ApartmentDetail>('/apartments', body) : http.put<ApartmentDetail>(`/apartments/${id}`, body)),
  status: (id: number, status: 'ACTIVE' | 'INACTIVE') => data(http.patch<ApartmentDetail>(`/apartments/${id}/status`, { status })),
  remove: (id: number) => http.delete(`/apartments/${id}`),
  members: (id: number) => data(http.get<ApartmentMember[]>(`/residents/apartment/${id}`)),
}
