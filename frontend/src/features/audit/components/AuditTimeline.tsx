import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/StatusChip'
import type { AuditLog } from '@/features/audit/api'
import { AuditChanges } from '@/features/audit/components/AuditChanges'
import { AUDIT_ACTION, describe, moduleLabel } from '@/features/audit/constants'
import { formatDateTime } from '@/lib/format'

interface Props {
  logs: AuditLog[]
  /** Ẩn chi tiết trường thay đổi (popover trên header). */
  compact?: boolean
  showBuilding?: boolean
}

/** Danh sách hoạt động theo thời gian: ai làm gì, lúc nào, thay đổi gì. */
export function AuditTimeline({ logs, compact, showBuilding }: Props) {
  return (
    <Stack spacing={compact ? 1.25 : 2}>
      {logs.map((log) => (
        <Stack key={log.id} direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: 'primary.main' }}>
            {(log.actorName ?? log.actorUsername).charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {describe(log)}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(log.occurredAt)}
              </Typography>
              {!compact && <StatusChip {...AUDIT_ACTION[log.action]} sx={{ height: 20, fontSize: 11 }} />}
              <Typography variant="caption" color="text.secondary">
                {moduleLabel(log.module)}
                {showBuilding && log.buildingName ? ` · ${log.buildingName}` : ''}
              </Typography>
            </Stack>
            {!compact && log.changes.length > 0 && (
              <Box sx={{ mt: 0.75, p: 1, borderRadius: 1, bgcolor: 'grey.50', border: 1, borderColor: 'divider' }}>
                <AuditChanges changes={log.changes} />
              </Box>
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
