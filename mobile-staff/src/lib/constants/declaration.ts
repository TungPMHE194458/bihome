import type { Chip } from '@/lib/constants/common'
import type { DeclarationStatus, DeclarationType } from '@/lib/types'

export const DECLARATION_TYPE: Record<DeclarationType, Chip> = {
  MEMBER: { label: 'Thành viên', tone: 'info' },
  VEHICLE: { label: 'Xe', tone: 'primary' },
}

export const DECLARATION_STATUS: Record<DeclarationStatus, Chip> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Cư dân huỷ', tone: 'neutral' },
}
