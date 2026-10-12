import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export type AuditAction = 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE'

export interface AuditChange {
  field: string
  oldValue?: string | null
  newValue?: string | null
}

export interface AuditLog {
  id: number
  occurredAt: string
  actorId?: number
  actorUsername: string
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

export type ListParams = Record<string, string | number>

/** Phạm vi theo tòa đang chọn (X-Building-Id do http tự gửi). */
export const auditApi = {
  list: (params: ListParams) => http.get<PageResponse<AuditLog>>('/audit-logs', { params }).then((r) => r.data),
  logins: (params: ListParams) =>
    http.get<PageResponse<LoginRecord>>('/login-history', { params, skipBuildingContext: true }).then((r) => r.data),
}

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: ListParams, buildingId: number | null) => [...auditKeys.all, 'list', buildingId, params] as const,
  logins: (params: ListParams) => [...auditKeys.all, 'logins', params] as const,
}

export function useAuditLogs(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: auditKeys.list(params, buildingId),
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useLoginHistory(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: auditKeys.logins(params),
    queryFn: () => auditApi.logins(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}
