/** Thông báo phí (đọc + ghi nhận thu/huỷ). Khớp frontend/src/features/feenotice/types.ts. */
import type { PaymentMethod } from './transaction'

export type FeeNoticeStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type FeeItemType = 'MANAGEMENT' | 'ELECTRIC' | 'WATER' | 'PARKING' | 'OTHER' | 'VAT' | 'SERVICE' | 'PREVIOUS_DEBT' | 'DISCOUNT'
export type ReconcileStatus = 'MATCHED' | 'PENDING' | 'MISMATCHED'
export type PaymentRecordStatus = 'VALID' | 'CANCELLED'

export interface FeeItem {
  type: FeeItemType
  description: string
  quantity?: number | null
  unitPrice?: number | null
  amount: number
  sourceRef?: string | null
}

export interface FeeNoticeSummary {
  id: number
  buildingId: number
  buildingName: string
  code: string
  period: string
  apartmentId: number
  apartmentCode: string
  holderName?: string
  totalAmount: number
  paidAmount: number
  outstanding: number
  dueDate: string
  status: FeeNoticeStatus
  carriedToId?: number
  carriedToCode?: string
  issuedAt?: string
  createdAt: string
  version: number
}

export interface FeeNoticePayment {
  id: number
  code: string
  amount: number
  method: PaymentMethod
  paidAt: string
  collectorName: string
  reconcileStatus: ReconcileStatus
  status: PaymentRecordStatus
}

export interface FeeNoticeLink {
  id: number
  code: string
  period: string
}

export interface FeeNoticeDetail {
  summary: FeeNoticeSummary
  floorNo: string
  buildingAddress: string
  vatPercent: number
  items: FeeItem[]
  note?: string
  issuedBy?: string
  cancelReason?: string
  payments: FeeNoticePayment[]
  carriedFrom: FeeNoticeLink[]
  /** Có cấu hình VietQR đang bật và còn nợ → hiện mã QR. */
  vietQrAvailable: boolean
  transferContent?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

export interface FeeNoticeCancelRequest {
  reason: string
  version: number
}

/** Còn thu được: đã phát hành, chưa thu đủ, chưa chuyển nợ sang kỳ sau. */
export function isCollectible(n: { status: FeeNoticeStatus; carriedToId?: number }): boolean {
  return (n.status === 'ISSUED' || n.status === 'PARTIAL' || n.status === 'OVERDUE') && n.carriedToId == null
}
