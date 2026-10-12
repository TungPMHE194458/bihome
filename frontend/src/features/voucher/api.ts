import type { Voucher, VoucherRequest } from '@/features/voucher/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Voucher thuộc phạm vi tòa nhà: X-Building-Id (tòa đang chọn) được http tự gửi kèm. */
export const voucherApi = {
  list: (params: ListParams) => http.get<PageResponse<Voucher>>('/vouchers', { params }).then((r) => r.data),
  get: (id: number) => http.get<Voucher>(`/vouchers/${id}`).then((r) => r.data),
  save: (id: number | undefined, body: VoucherRequest) =>
    (id == null ? http.post<Voucher>('/vouchers', body) : http.put<Voucher>(`/vouchers/${id}`, body)).then((r) => r.data),
  changeStatus: (id: number, status: ActiveStatus) =>
    http.patch<Voucher>(`/vouchers/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/vouchers/${id}`),
}
