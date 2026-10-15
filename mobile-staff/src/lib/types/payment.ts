/** Lịch sử thanh toán (phiếu thu). Khớp frontend/src/features/payment/types.ts. */
import type { ReconcileStatus, PaymentRecordStatus } from './feenotice'
import type { PaymentMethod } from './transaction'

export interface Payment {
  id: number
  buildingId: number
  buildingName: string
  code: string
  feeNoticeId: number
  feeNoticeCode: string
  period: string
  apartmentId: number
  apartmentCode: string
  amount: number
  method: PaymentMethod
  paidAt: string
  collectorName: string
  payerName?: string
  bankReference?: string
  reconcileStatus: ReconcileStatus
  note?: string
  status: PaymentRecordStatus
  cancelReason?: string
  cancelledAt?: string
  cancelledBy?: string
  createdAt: string
  createdBy?: string
  version: number
}

export interface PaymentCreateRequest {
  feeNoticeId: number
  amount: number
  method: PaymentMethod
  paidAt?: string | null
  payerName?: string | null
  bankReference?: string | null
  note?: string | null
}

export interface PaymentCancelRequest {
  reason: string
  version: number
}

export interface PaymentReconcileRequest {
  status: ReconcileStatus
  bankReference?: string | null
  version: number
}
