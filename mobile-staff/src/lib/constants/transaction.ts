import type { Chip } from '@/lib/constants/common'
import type { PaymentMethod, TransactionSource, TransactionStatus } from '@/lib/types'

export const TRANSACTION_SOURCE: Record<TransactionSource, string> = {
  AMENITY_BOOKING: 'Tiện ích',
  SERVICE_ORDER: 'Dịch vụ',
  ACCESS_CARD: 'Thẻ từ',
  FEE_NOTICE: 'Thông báo phí',
}

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  VIETQR: 'VietQR',
  CARD: 'Thẻ',
}

export const TRANSACTION_STATUS: Record<TransactionStatus, Chip> = {
  PENDING: { label: 'Chưa thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
}
