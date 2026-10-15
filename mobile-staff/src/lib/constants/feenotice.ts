import type { Chip } from '@/lib/constants/common'
import type { FeeItemType, FeeNoticeStatus, ReconcileStatus } from '@/lib/types'

export const FEE_NOTICE_STATUS: Record<FeeNoticeStatus, Chip> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  ISSUED: { label: 'Đã phát hành', tone: 'info' },
  PARTIAL: { label: 'Thanh toán một phần', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  CANCELLED: { label: 'Huỷ', tone: 'neutral' },
}

export const FEE_ITEM_LABEL: Record<FeeItemType, string> = {
  MANAGEMENT: 'Phí quản lý',
  ELECTRIC: 'Điện',
  WATER: 'Nước',
  PARKING: 'Gửi xe',
  OTHER: 'Phí khác',
  VAT: 'VAT',
  SERVICE: 'Tiện ích / dịch vụ',
  PREVIOUS_DEBT: 'Nợ kỳ trước',
  DISCOUNT: 'Giảm trừ',
}

export const RECONCILE_STATUS: Record<ReconcileStatus, Chip> = {
  MATCHED: { label: 'Đã khớp', tone: 'success' },
  PENDING: { label: 'Chờ khớp', tone: 'warning' },
  MISMATCHED: { label: 'Lệch', tone: 'danger' },
}
