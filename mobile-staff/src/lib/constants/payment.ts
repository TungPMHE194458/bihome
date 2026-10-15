import type { Chip } from '@/lib/constants/common'
import type { PaymentRecordStatus } from '@/lib/types'

export const PAYMENT_RECORD_STATUS: Record<PaymentRecordStatus, Chip> = {
  VALID: { label: 'Hợp lệ', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}
