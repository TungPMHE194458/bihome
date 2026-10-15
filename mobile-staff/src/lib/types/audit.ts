/** Lịch sử hoạt động + đăng nhập (chỉ đọc). Khớp backend/src/main/java/com/bihome/audit/dto/AuditDtos.java. */

export type AuditAction = 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE'

export interface AuditChange {
  field: string
  oldValue?: string
  newValue?: string
}

export interface AuditLogEntry {
  id: number
  occurredAt: string
  actorId?: number
  actorUsername?: string
  actorName?: string
  action: AuditAction
  module: string
  entityType: string
  entityId: string
  entityLabel?: string
  buildingId?: number
  buildingName?: string
  changes: AuditChange[]
  ipAddress?: string
}

export interface LoginRecord {
  id: number
  createdAt: string
  userId?: number
  loginName: string
  fullName?: string
  success: boolean
  failureReason?: string
  ipAddress?: string
  userAgent?: string
}
