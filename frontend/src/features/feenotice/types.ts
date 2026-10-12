export type FeeNoticeStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type FeeItemType = 'MANAGEMENT' | 'ELECTRIC' | 'WATER' | 'PARKING' | 'OTHER' | 'VAT' | 'SERVICE' | 'PREVIOUS_DEBT' | 'DISCOUNT'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VIETQR'
export type ReconcileStatus = 'MATCHED' | 'PENDING' | 'MISMATCHED'
export type PaymentStatus = 'VALID' | 'CANCELLED'

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
  holderName?: string | null
  totalAmount: number
  paidAmount: number
  outstanding: number
  dueDate: string
  status: FeeNoticeStatus
  carriedToId?: number | null
  carriedToCode?: string | null
  issuedAt?: string | null
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
  status: PaymentStatus
}

export interface FeeNoticeDetail {
  summary: FeeNoticeSummary
  floorNo: string
  buildingAddress: string
  vatPercent: number
  items: FeeItem[]
  note?: string | null
  issuedBy?: string | null
  cancelReason?: string | null
  payments: FeeNoticePayment[]
  carriedFrom: { id: number; code: string; period: string }[]
  vietQrAvailable: boolean
  transferContent?: string | null
  createdBy?: string | null
  updatedAt?: string | null
  updatedBy?: string | null
}

export interface GenerateRequest {
  period: string
  dueDate?: string | null
  floor?: string | null
  apartmentIds?: number[]
}

export interface PreviewRow {
  apartmentId: number
  apartmentCode: string
  floorNo: string
  holderName?: string | null
  items: FeeItem[]
  total: number
  warnings: string[]
  skipReason?: string | null
}

export interface FeePreview {
  period: string
  dueDate: string
  apartmentCount: number
  toCreate: number
  skipped: number
  withWarnings: number
  total: number
  rows: PreviewRow[]
}

export interface ItemRequest {
  type: FeeItemType
  description: string
  quantity?: number | null
  unitPrice?: number | null
  amount?: number | null
  sourceRef?: string | null
}

export interface FeeNoticeUpdate {
  dueDate: string
  note?: string | null
  items: ItemRequest[]
  version: number
}

export interface VietQr {
  payload: string
  bankBin: string
  accountNo: string
  accountName: string
  amount: number
  content: string
}
