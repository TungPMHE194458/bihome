import type { PaymentMethod, PaymentStatus, ReconcileStatus } from '@/features/feenotice/types'

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
  payerName?: string | null
  bankReference?: string | null
  reconcileStatus: ReconcileStatus
  note?: string | null
  status: PaymentStatus
  cancelReason?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  createdAt: string
  createdBy?: string | null
  version: number
}

export interface PaymentRequest {
  feeNoticeId: number
  amount: number
  method: PaymentMethod
  paidAt?: string | null
  payerName?: string | null
  bankReference?: string | null
  note?: string | null
}
