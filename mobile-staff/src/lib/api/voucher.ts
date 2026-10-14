import { clean, data, http, type Params } from '@/lib/api/shared'
import type { PageResponse, Voucher, VoucherRequest } from '@/lib/types'

export const voucherApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Voucher>>('/vouchers', { params: clean({ size: 20, sort: 'code,asc', ...p }) })),
  get: (id: number) => data(http.get<Voucher>(`/vouchers/${id}`)),
  save: (id: number | undefined, body: VoucherRequest) =>
    data(id == null ? http.post<Voucher>('/vouchers', body) : http.put<Voucher>(`/vouchers/${id}`, body)),
  status: (id: number, status: 'ACTIVE' | 'INACTIVE') => data(http.patch<Voucher>(`/vouchers/${id}/status`, { status })),
  remove: (id: number) => http.delete(`/vouchers/${id}`),
}
