import type { ReconcileStatus } from '@/features/feenotice/types'
import type { Payment, PaymentRequest } from '@/features/payment/types'
import type { PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const paymentApi = {
  list: (params: ListParams) => http.get<PageResponse<Payment>>('/payments', { params }).then((r) => r.data),
  get: (id: number) => http.get<Payment>(`/payments/${id}`).then((r) => r.data),
  create: (body: PaymentRequest) => http.post<Payment>('/payments', body).then((r) => r.data),
  reconcile: (id: number, status: ReconcileStatus, version: number, bankReference?: string) =>
    http.post<Payment>(`/payments/${id}/reconcile`, { status, version, bankReference }).then((r) => r.data),
  cancel: (id: number, reason: string, version: number) =>
    http.post<Payment>(`/payments/${id}/cancel`, { reason, version }).then((r) => r.data),
  exportExcel: (params: ListParams) => downloadFromApi('/payments/export', params, 'phieu-thu.xlsx'),
  receiptPath: (id: number) => `/payments/${id}/receipt`,
}
