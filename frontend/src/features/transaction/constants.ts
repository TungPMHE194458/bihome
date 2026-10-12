import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { PaymentMethod, TransactionSource, TransactionStatus } from '@/features/transaction/types'

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

export const TRANSACTION_STATUS: Record<TransactionStatus, ChipStyle> = {
  PENDING: { label: 'Chưa thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
}

const options = <K extends string>(map: Record<K, string | ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })

export const SOURCE_OPTIONS = options(TRANSACTION_SOURCE)
export const METHOD_OPTIONS = options(PAYMENT_METHOD)
export const TRANSACTION_STATUS_OPTIONS = options(TRANSACTION_STATUS)
