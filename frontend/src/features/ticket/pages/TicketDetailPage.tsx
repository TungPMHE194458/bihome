import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Rating from '@mui/material/Rating'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { isAxiosError } from 'axios'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Can } from '@/components/Can'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { AttachmentChips } from '@/features/ticket/components/AttachmentChips'
import { RatingDialog } from '@/features/ticket/components/RatingDialog'
import { TicketTimeline } from '@/features/ticket/components/TicketTimeline'
import { useTicketActions } from '@/features/ticket/components/useTicketActions'
import { STATUS_ACTION, TICKET_CHANNEL, TICKET_PRIORITY, TICKET_STATUS, isFinal } from '@/features/ticket/constants'
import { useTicket } from '@/features/ticket/hooks'
import type { TicketDetail, TicketStatus } from '@/features/ticket/types'
import { formatDateTime } from '@/lib/format'
import { NotFoundPage } from '@/pages/ErrorPages'
import { usePermission } from '@/stores/authStore'

const LIST = [{ label: 'Yêu cầu và hỗ trợ', to: '/tickets' }]
/** Thứ tự nút: hướng tiến lên trước, Huỷ cuối cùng. */
const BUTTON_ORDER: TicketStatus[] = ['RECEIVED', 'IN_PROGRESS', 'WAITING', 'DONE', 'CLOSED', 'CANCELLED']

export function TicketDetailPage() {
  const navigate = useNavigate()
  const id = Number(useParams().id)
  const { data: detail, isLoading, error, refetch } = useTicket(Number.isFinite(id) ? id : undefined)
  const actions = useTicketActions({ onDeleted: () => navigate('/tickets', { replace: true }) })
  const canWrite = usePermission('TICKET_WRITE')
  const [rating, setRating] = useState<TicketDetail | null>(null)

  if (!Number.isFinite(id) || (isAxiosError(error) && error.response?.status === 404)) return <NotFoundPage />
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !detail) {
    return (
      <Stack spacing={2}>
        <Skeleton width={320} height={32} />
        <Skeleton variant="rounded" height={360} />
      </Stack>
    )
  }

  const t = detail.ticket
  const transitions = BUTTON_ORDER.filter((s) => detail.allowedStatuses.includes(s))
  const responseLate = t.status === 'NEW' && new Date(t.responseDueAt) < new Date()

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title={t.code} parents={LIST} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Can permission="TICKET_WRITE">
            {transitions.map((s) => (
              <Button
                key={s}
                variant={s === 'CANCELLED' ? 'outlined' : 'contained'}
                color={s === 'CANCELLED' ? 'error' : 'primary'}
                onClick={() => actions.openStatus(t, s)}
              >
                {STATUS_ACTION[s]}
              </Button>
            ))}
            {!isFinal(t.status) && (
              <>
                <Button variant="outlined" startIcon={<PersonAddAltOutlinedIcon />} onClick={() => actions.openAssign(t)}>
                  Phân công
                </Button>
                <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => actions.openEdit(t.id)}>
                  Chỉnh sửa
                </Button>
              </>
            )}
            {(t.status === 'DONE' || t.status === 'CLOSED') && (
              <Button variant="outlined" startIcon={<StarOutlineIcon />} onClick={() => setRating(detail)}>
                {t.rating ? 'Sửa đánh giá' : 'Ghi nhận đánh giá'}
              </Button>
            )}
          </Can>
          {(t.status === 'NEW' || t.status === 'CANCELLED') && (
            <Can permission="TICKET_DELETE">
              <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => actions.requestDelete(t)}>
                Xoá
              </Button>
            </Can>
          )}
        </Stack>
      </Box>

      {t.overdue && (
        <Alert severity="error" icon={<WarningAmberIcon />}>
          Yêu cầu đã quá hạn {responseLate ? 'phản hồi' : 'xử lý'} theo SLA ({formatDateTime(responseLate ? t.responseDueAt : t.resolutionDueAt)}).
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' }, alignItems: 'start' }}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
                {t.title}
              </Typography>
              <StatusChip {...TICKET_STATUS[t.status]} />
              <StatusChip {...TICKET_PRIORITY[t.priority]} />
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-line' }} color={detail.description ? 'text.primary' : 'text.secondary'}>
              {detail.description ?? 'Không có mô tả.'}
            </Typography>
            {detail.attachments.length > 0 && <AttachmentChips attachments={detail.attachments} sx={{ mt: 2 }} />}
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Dòng thời gian
            </Typography>
            <TicketTimeline ticketId={t.id} canComment={canWrite} />
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Info label="Danh mục">{t.categoryName}</Info>
          <Info label="Tòa nhà">
            <Link component={RouterLink} to={`/buildings/${t.buildingId}`} underline="hover">
              {t.buildingName}
            </Link>
          </Info>
          <Info label="Căn hộ">
            {t.apartmentId ? (
              <Link component={RouterLink} to={`/apartments/${t.apartmentId}`} underline="hover">
                {t.apartmentName} ({t.apartmentCode})
              </Link>
            ) : (
              '—'
            )}
          </Info>
          <Info label="Người gửi">
            {t.residentId ? (
              <Link component={RouterLink} to={`/residents/${t.residentId}`} underline="hover">
                {t.residentName} · {t.residentPhone}
              </Link>
            ) : (
              '—'
            )}
          </Info>
          <Info label="Kênh tiếp nhận">{TICKET_CHANNEL[t.channel]}</Info>
          <Info label="Người xử lý">{t.assigneeName ?? 'Chưa phân công'}</Info>
          <Divider sx={{ my: 1.5 }} />
          <Info label="Hạn phản hồi">
            <Typography color={responseLate ? 'error.main' : 'text.primary'} component="span">
              {formatDateTime(t.responseDueAt)}
            </Typography>
            {detail.respondedAt && (
              <Typography variant="caption" color="text.secondary" component="div">
                Đã phản hồi {formatDateTime(detail.respondedAt)}
              </Typography>
            )}
          </Info>
          <Info label="Hạn xử lý">
            <Typography color={t.overdue && !responseLate ? 'error.main' : 'text.primary'} component="span">
              {formatDateTime(t.resolutionDueAt)}
            </Typography>
            {detail.resolvedAt && (
              <Typography variant="caption" color="text.secondary" component="div">
                Hoàn thành {formatDateTime(detail.resolvedAt)}
              </Typography>
            )}
          </Info>
          {detail.closedAt && <Info label="Đóng lúc">{formatDateTime(detail.closedAt)}</Info>}
          <Info label="Đánh giá">
            {t.rating ? (
              <Box>
                <Rating value={t.rating} readOnly size="small" />
                {detail.ratingComment && (
                  <Typography variant="body2" color="text.secondary">
                    “{detail.ratingComment}”
                  </Typography>
                )}
              </Box>
            ) : (
              '—'
            )}
          </Info>
          <Divider sx={{ my: 1.5 }} />
          <Info label="Tạo bởi">
            {detail.createdByName ?? detail.createdBy ?? '—'} · {formatDateTime(t.createdAt)}
          </Info>
          <Info label="Cập nhật lần cuối">{formatDateTime(t.updatedAt)}</Info>
        </Paper>
      </Box>
      {actions.dialogs}
      <RatingDialog detail={rating} onClose={() => setRating(null)} />
    </Stack>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div">{children}</Typography>
    </Box>
  )
}
