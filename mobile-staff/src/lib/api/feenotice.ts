import { clean, data, http, type Params } from '@/lib/api/shared'
import { openFile } from '@/lib/file'
import type { FeeNoticeCancelRequest, FeeNoticeDetail, FeeNoticeSummary, PageResponse } from '@/lib/types'

export interface VietQrPayload {
  payload: string
  bankBin: string
  accountNo: string
  accountName: string
  amount: number
  content: string
}

export const feeNoticeApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<FeeNoticeSummary>>('/fee-notices', { params: clean({ size: 20, sort: 'period,desc', ...p }) })),
  get: (id: number) => data(http.get<FeeNoticeDetail>(`/fee-notices/${id}`)),
  vietQr: (id: number) => data(http.get<VietQrPayload>(`/fee-notices/${id}/vietqr`)),
  cancel: (id: number, body: FeeNoticeCancelRequest) => data(http.post<FeeNoticeDetail>(`/fee-notices/${id}/cancel`, body)),
  pdf: (id: number, code: string) => openFile(`/fee-notices/${id}/pdf`, `${code}.pdf`, 'application/pdf'),
}
