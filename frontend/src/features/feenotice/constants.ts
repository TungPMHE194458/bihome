import type { ChipStyle } from '@/components/StatusChip'
import type { FeeItemType, FeeNoticeStatus, PaymentMethod, ReconcileStatus } from '@/features/feenotice/types'

export const FEE_NOTICE_STATUS: Record<FeeNoticeStatus, ChipStyle> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  ISSUED: { label: 'Đã phát hành', tone: 'info' },
  PARTIAL: { label: 'Thanh toán một phần', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  CANCELLED: { label: 'Huỷ', tone: 'neutral' },
}

export const FEE_NOTICE_STATUS_OPTIONS = (Object.keys(FEE_NOTICE_STATUS) as FeeNoticeStatus[]).map((v) => ({
  value: v,
  label: FEE_NOTICE_STATUS[v].label,
}))

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

/** Loại khoản được thêm tay khi sửa nháp. */
export const MANUAL_ITEM_TYPES: FeeItemType[] = ['OTHER', 'DISCOUNT']

/** Dòng do hệ thống tạo: không sửa tiền (chỉ bỏ được tiện ích / nợ kỳ trước; VAT tự tính). */
export const SYSTEM_ITEM_TYPES: FeeItemType[] = ['SERVICE', 'PREVIOUS_DEBT', 'VAT']

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  VIETQR: 'VietQR',
}

export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((v) => ({
  value: v,
  label: PAYMENT_METHOD_LABEL[v],
}))

export const RECONCILE_STATUS: Record<ReconcileStatus, ChipStyle> = {
  MATCHED: { label: 'Đã khớp', tone: 'success' },
  PENDING: { label: 'Chờ khớp', tone: 'warning' },
  MISMATCHED: { label: 'Lệch', tone: 'danger' },
}

export const RECONCILE_OPTIONS = (Object.keys(RECONCILE_STATUS) as ReconcileStatus[]).map((v) => ({
  value: v,
  label: RECONCILE_STATUS[v].label,
}))

/** Còn thu được: đã phát hành, chưa thu đủ, chưa chuyển nợ sang kỳ sau. */
export function isCollectible(n: { status: FeeNoticeStatus; carriedToId?: number | null }): boolean {
  return (n.status === 'ISSUED' || n.status === 'PARTIAL' || n.status === 'OVERDUE') && n.carriedToId == null
}
