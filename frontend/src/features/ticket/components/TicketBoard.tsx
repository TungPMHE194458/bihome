import AccessTimeIcon from '@mui/icons-material/AccessTime'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState, type DragEvent } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { NEXT_STATUSES, STATUS_ACTION, TICKET_PRIORITY, TICKET_STATUS, isFinal } from '@/features/ticket/constants'
import type { BoardColumn, TicketStatus, TicketSummary } from '@/features/ticket/types'
import { formatDateTime } from '@/lib/format'

interface TicketBoardProps {
  columns: BoardColumn[] | undefined
  loading: boolean
  error: unknown
  onRetry: () => void
  /** Kéo thả hoặc chọn ở menu của thẻ; chỉ gọi với trạng thái hợp lệ theo luồng. */
  onMove: (ticket: TicketSummary, to: TicketStatus) => void
  onOpen: (ticket: TicketSummary) => void
  canWrite: boolean
}

const COLUMN_WIDTH = 280

/** Kanban theo trạng thái: kéo thẻ sang cột khác để chuyển trạng thái (cột không hợp lệ bị làm mờ khi kéo). */
export function TicketBoard({ columns, loading, error, onRetry, onMove, onOpen, canWrite }: TicketBoardProps) {
  const [dragging, setDragging] = useState<TicketSummary | null>(null)
  const [over, setOver] = useState<TicketStatus | null>(null)

  if (error) return <ErrorState error={error} onRetry={onRetry} />

  const allowed = (to: TicketStatus) => !!dragging && NEXT_STATUSES[dragging.status].includes(to)

  return (
    <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', p: 2, alignItems: 'flex-start' }}>
      {(columns ?? []).map((col) => {
        const dropTarget = allowed(col.status)
        return (
          <Box
            key={col.status}
            role="region"
            aria-label={`Cột ${TICKET_STATUS[col.status].label}`}
            onDragOver={(e: DragEvent) => {
              if (!dropTarget) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (over !== col.status) setOver(col.status)
            }}
            onDragLeave={() => over === col.status && setOver(null)}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              if (dragging && dropTarget) onMove(dragging, col.status)
              setDragging(null)
              setOver(null)
            }}
            sx={{
              width: COLUMN_WIDTH,
              flexShrink: 0,
              bgcolor: over === col.status ? 'primary.light' : 'grey.50',
              border: 1,
              borderColor: over === col.status ? 'primary.main' : 'divider',
              borderStyle: dragging && dropTarget ? 'dashed' : 'solid',
              borderRadius: 2,
              opacity: dragging && !dropTarget && dragging.status !== col.status ? 0.45 : 1,
              transition: 'opacity .15s, background-color .15s',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1 }}>
              <StatusChip {...TICKET_STATUS[col.status]} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {col.total}
              </Typography>
            </Stack>
            <Stack spacing={1} sx={{ px: 1, pb: 1, minHeight: 80 }}>
              {loading && !columns
                ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} variant="rounded" height={96} />)
                : col.items.map((t) => (
                    <BoardCard
                      key={t.id}
                      ticket={t}
                      draggable={canWrite && !isFinal(t.status)}
                      onDragStart={() => setDragging(t)}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      onOpen={() => onOpen(t)}
                      onMove={canWrite ? (to) => onMove(t, to) : undefined}
                    />
                  ))}
              {col.total > col.items.length && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 0.5 }}>
                  Còn {col.total - col.items.length} yêu cầu — xem ở dạng danh sách
                </Typography>
              )}
            </Stack>
          </Box>
        )
      })}
    </Box>
  )
}

interface BoardCardProps {
  ticket: TicketSummary
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpen: () => void
  onMove?: (to: TicketStatus) => void
}

function BoardCard({ ticket: t, draggable, onDragStart, onDragEnd, onOpen, onMove }: BoardCardProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const next = NEXT_STATUSES[t.status]

  return (
    <Card
      variant="outlined"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(t.id))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      data-testid={`ticket-card-${t.id}`}
      sx={{
        position: 'relative',
        cursor: draggable ? 'grab' : 'default',
        borderColor: t.overdue ? 'error.main' : 'divider',
        borderLeft: 3,
        borderLeftColor: t.overdue ? 'error.main' : 'transparent',
      }}
    >
      <CardActionArea onClick={onOpen} sx={{ p: 1.25, pr: onMove && next.length ? 4.5 : 1.25 }}>
        <Typography variant="caption" fontWeight={700} color={t.overdue ? 'error.main' : 'primary.main'}>
          {t.code}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {t.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" noWrap>
          {t.categoryName}
          {t.apartmentCode ? ` · ${t.apartmentCode}` : ''}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
          <StatusChip {...TICKET_PRIORITY[t.priority]} />
          {!isFinal(t.status) && t.status !== 'DONE' && (
            <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: t.overdue ? 'error.main' : 'text.secondary' }}>
              <AccessTimeIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption">{formatDateTime(t.resolutionDueAt)}</Typography>
            </Stack>
          )}
        </Stack>
        <Typography variant="caption" color={t.assigneeName ? 'text.primary' : 'text.secondary'} component="div" sx={{ mt: 0.5 }} noWrap>
          {t.assigneeName ?? 'Chưa phân công'}
        </Typography>
      </CardActionArea>
      {onMove && next.length > 0 && (
        <>
          <IconButton
            size="small"
            aria-label={`Chuyển trạng thái ${t.code}`}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ position: 'absolute', top: 4, right: 4 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {next.map((to) => (
              <MenuItem
                key={to}
                onClick={() => {
                  setAnchor(null)
                  onMove(to)
                }}
              >
                {STATUS_ACTION[to]}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Card>
  )
}
