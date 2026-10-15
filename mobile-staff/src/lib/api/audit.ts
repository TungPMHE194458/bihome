import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type { AuditLogEntry, LoginRecord, PageResponse } from '@/lib/types'

export const auditApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<AuditLogEntry>>('/audit-logs', { params: clean({ size: 20, sort: 'occurredAt,desc', ...p }) })),
  logins: (p: Params) =>
    data(
      http.get<PageResponse<LoginRecord>>('/login-history', {
        params: clean({ size: 20, sort: 'createdAt,desc', ...p }),
        ...noBuilding,
      }),
    ),
}
