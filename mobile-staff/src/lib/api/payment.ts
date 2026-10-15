import { clean, data, http, type Params } from '@/lib/api/shared'
import { downloadExcel, openFile } from '@/lib/file'
import type { Payment, PaymentCancelRequest, PaymentCreateRequest, PaymentReconcileRequest, PageResponse } from '@/lib/types'

export const paymentApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Payment>>('/payments', { params: clean({ size: 20, sort: 'paidAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Payment>(`/payments/${id}`)),
  create: (body: PaymentCreateRequest) => data(http.post<Payment>('/payments', body)),
  reconcile: (id: number, body: PaymentReconcileRequest) => data(http.post<Payment>(`/payments/${id}/reconcile`, body)),
  cancel: (id: number, body: PaymentCancelRequest) => data(http.post<Payment>(`/payments/${id}/cancel`, body)),
  receipt: (id: number, code: string) => openFile(`/payments/${id}/receipt`, `${code}.pdf`, 'application/pdf'),
  export: (p: Params) =>
    (async () => {
      const qs = new URLSearchParams(clean(p) as Record<string, string>).toString()
      await downloadExcel(`/payments/export${qs ? `?${qs}` : ''}`, 'phieu-thu.xlsx')
    })(),
}
