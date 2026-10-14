import type { Chip } from '@/lib/constants/common'
import type { CardStatus, CardType, HistoryAction } from '@/lib/types'

export const CARD_TYPE: Record<CardType, Chip> = {
  ELEVATOR: { label: 'Thang máy', tone: 'info' },
  DOOR: { label: 'Cửa', tone: 'neutral' },
  PARKING: { label: 'Gửi xe', tone: 'warning' },
  MULTI: { label: 'Đa năng', tone: 'primary' },
}

export const CARD_STATUS: Record<CardStatus, Chip> = {
  IN_STOCK: { label: 'Trong kho', tone: 'info' },
  IN_USE: { label: 'Đang dùng', tone: 'success' },
  LOCKED: { label: 'Khoá', tone: 'warning' },
  LOST: { label: 'Báo mất', tone: 'danger' },
  REVOKED: { label: 'Thu hồi', tone: 'neutral' },
}

/** Nhãn nút theo trạng thái đích. */
export const CARD_STATUS_ACTION: Record<CardStatus, string> = {
  IN_STOCK: 'Nhập lại kho',
  IN_USE: 'Mở khoá',
  LOCKED: 'Khoá thẻ',
  LOST: 'Báo mất',
  REVOKED: 'Thu hồi',
}

export const HISTORY_ACTION: Record<HistoryAction, string> = {
  CREATED: 'Nhập kho',
  ISSUED: 'Cấp thẻ',
  STATUS_CHANGE: 'Đổi trạng thái',
  REASSIGNED: 'Đổi người dùng thẻ',
}
