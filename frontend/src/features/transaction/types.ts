export type TransactionSource = 'AMENITY_BOOKING' | 'SERVICE_ORDER' | 'ACCESS_CARD' | 'FEE_NOTICE'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VIETQR' | 'CARD'
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'

export interface Transaction {
  id: number
  buildingId: number
  buildingName: string
  code: string
  sourceType: TransactionSource
  sourceId: number
  sourceCode: string
  apartmentId?: number
  apartmentCode?: string
  residentId?: number
  residentName?: string
  amount: number
  method?: PaymentMethod
  status: TransactionStatus
  description?: string
  paidAt?: string
  createdAt: string
  createdBy?: string
}

/** Tóm tắt giao dịch đi kèm đăng ký tiện ích / đơn dịch vụ. */
export interface TransactionSummary {
  id: number
  code: string
  status: TransactionStatus
  method?: PaymentMethod
  paidAt?: string
}
