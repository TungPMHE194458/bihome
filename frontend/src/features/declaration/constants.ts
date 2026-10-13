import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { DeclarationStatus, DeclarationType } from '@/features/declaration/types'

export const DECLARATION_TYPE: Record<DeclarationType, ChipStyle> = {
  MEMBER: { label: 'Thành viên', tone: 'info' },
  VEHICLE: { label: 'Xe', tone: 'primary' },
}

export const DECLARATION_STATUS: Record<DeclarationStatus, ChipStyle> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Cư dân huỷ', tone: 'neutral' },
}

const toOptions = <K extends string>(map: Record<K, ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }))

export const DECLARATION_TYPE_OPTIONS = toOptions(DECLARATION_TYPE)
export const DECLARATION_STATUS_OPTIONS = toOptions(DECLARATION_STATUS)
