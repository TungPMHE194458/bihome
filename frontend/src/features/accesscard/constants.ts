import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { CardStatus, CardType, HistoryAction } from '@/features/accesscard/types'

export const CARD_TYPE: Record<CardType, ChipStyle> = {
  ELEVATOR: { label: 'Thang máy', tone: 'info' },
  DOOR: { label: 'Cửa', tone: 'neutral' },
  PARKING: { label: 'Gửi xe', tone: 'warning' },
  MULTI: { label: 'Đa năng', tone: 'primary' },
}

export const CARD_STATUS: Record<CardStatus, ChipStyle> = {
  IN_USE: { label: 'Đang dùng', tone: 'success' },
  LOCKED: { label: 'Khoá', tone: 'warning' },
  LOST: { label: 'Báo mất', tone: 'danger' },
  REVOKED: { label: 'Thu hồi', tone: 'neutral' },
  IN_STOCK: { label: 'Trong kho', tone: 'info' },
}

/** Nhãn hành động đổi trạng thái (động từ). */
export const STATUS_ACTION: Record<CardStatus, string> = {
  IN_USE: 'Mở khoá',
  LOCKED: 'Khoá thẻ',
  LOST: 'Báo mất',
  REVOKED: 'Thu hồi',
  IN_STOCK: 'Nhập lại kho',
}

export const HISTORY_ACTION: Record<HistoryAction, string> = {
  CREATED: 'Nhập kho',
  ISSUED: 'Cấp thẻ',
  STATUS_CHANGE: 'Đổi trạng thái',
  REASSIGNED: 'Đổi người dùng thẻ',
}

export const allowsVehicle = (t: CardType) => t === 'PARKING' || t === 'MULTI'

const options = <K extends string>(map: Record<K, ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }))

export const CARD_TYPE_OPTIONS = options(CARD_TYPE)
export const CARD_STATUS_OPTIONS = options(CARD_STATUS)
