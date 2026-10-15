import type { Chip } from '@/lib/constants/common'
import type { AuditAction } from '@/lib/types'

export const AUDIT_ACTION: Record<AuditAction, Chip> = {
  CREATE: { label: 'Tạo mới', tone: 'success' },
  UPDATE: { label: 'Cập nhật', tone: 'info' },
  STATUS_CHANGE: { label: 'Đổi trạng thái', tone: 'warning' },
  DELETE: { label: 'Xoá', tone: 'danger' },
}
