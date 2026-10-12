import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState, type ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { AttachmentList } from '@/components/form/AttachmentList'
import type { UploadedFile } from '@/components/form/FormFileUpload'
import { StatusChip } from '@/components/StatusChip'
import { AttachmentChips } from '@/features/ticket/components/AttachmentChips'
import { TICKET_STATUS } from '@/features/ticket/constants'
import { useCommentTicket, useTimeline } from '@/features/ticket/hooks'
import type { EntryType, TimelineEntry, Visibility } from '@/features/ticket/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'

const ICONS: Record<EntryType, ReactNode> = {
  CREATED: <AddCircleOutlineIcon fontSize="small" />,
  STATUS_CHANGE: <SwapHorizIcon fontSize="small" />,
  ASSIGNMENT: <PersonOutlineIcon fontSize="small" />,
  COMMENT: <ChatBubbleOutlineIcon fontSize="small" />,
  RATING: <StarOutlineIcon fontSize="small" />,
}

function describe(e: TimelineEntry): ReactNode {
  switch (e.type) {
    case 'CREATED':
      return 'tạo yêu cầu'
    case 'STATUS_CHANGE':
      return (
        <Stack direction="row" spacing={0.75} alignItems="center" component="span" flexWrap="wrap" useFlexGap>
          <span>chuyển trạng thái</span>
          {e.fromStatus && <StatusChip {...TICKET_STATUS[e.fromStatus]} />}
          <span>→</span>
          {e.toStatus && <StatusChip {...TICKET_STATUS[e.toStatus]} />}
        </Stack>
      )
    case 'ASSIGNMENT':
      return e.assigneeName ? (
        <>
          phân công cho <b>{e.assigneeName}</b>
        </>
      ) : (
        'bỏ phân công'
      )
    case 'COMMENT':
      return 'bình luận'
    case 'RATING':
      return 'ghi nhận đánh giá'
  }
}

/** Dòng thời gian (cũ → mới) + ô bình luận nội bộ/công khai có đính kèm. */
export function TicketTimeline({ ticketId, canComment }: { ticketId: number; canComment: boolean }) {
  const { data = [], isLoading, error, refetch } = useTimeline(ticketId)

  return (
    <Box>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Stack>
      ) : (
        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {data.map((e, i) => (
            <Box component="li" key={e.id} sx={{ display: 'flex', gap: 1.5, pb: 2, position: 'relative' }}>
              {i < data.length - 1 && (
                <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: 0, borderLeft: 1, borderColor: 'divider' }} />
              )}
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: e.type === 'COMMENT' ? 'primary.light' : 'grey.100',
                  color: e.type === 'COMMENT' ? 'primary.main' : 'text.secondary',
                }}
              >
                {ICONS[e.type]}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <b>{e.actorName ?? e.actorUsername ?? 'Hệ thống'}</b> {describe(e)}
                  {e.type === 'COMMENT' && e.visibility === 'INTERNAL' && (
                    <StatusChip label="Nội bộ" tone="warning" icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />} />
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDateTime(e.createdAt)}
                </Typography>
                {e.content && (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.75,
                      whiteSpace: 'pre-line',
                      ...(e.type === 'COMMENT' || e.type === 'STATUS_CHANGE'
                        ? { p: 1.25, borderRadius: 2, bgcolor: e.visibility === 'INTERNAL' ? '#FFFBEB' : 'grey.50', border: 1, borderColor: 'divider' }
                        : {}),
                    }}
                  >
                    {e.content}
                  </Typography>
                )}
                {e.attachments.length > 0 && <AttachmentChips attachments={e.attachments} sx={{ mt: 1 }} />}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {canComment && <CommentBox ticketId={ticketId} />}
    </Box>
  )
}

function CommentBox({ ticketId }: { ticketId: number }) {
  const { enqueueSnackbar } = useSnackbar()
  const comment = useCommentTicket()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('INTERNAL')
  const [files, setFiles] = useState<UploadedFile[]>([])

  const submit = async () => {
    if (!content.trim()) return
    try {
      await comment.mutateAsync({ id: ticketId, content: content.trim(), visibility, fileIds: files.map((f) => f.fileId) })
      setContent('')
      setFiles([])
      enqueueSnackbar('Đã gửi bình luận.', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Box sx={{ mt: 1, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        placeholder="Viết bình luận..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 4000, 'aria-label': 'Nội dung bình luận' } }}
      />
      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
        <AttachmentList value={files} onChange={setFiles} purpose="TICKET_ATTACHMENT" max={5} label="Đính kèm" />
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup exclusive size="small" value={visibility} onChange={(_, v) => v && setVisibility(v)}>
            <ToggleButton value="INTERNAL">Nội bộ</ToggleButton>
            <ToggleButton value="PUBLIC">Công khai</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={() => void submit()} disabled={!content.trim() || comment.isPending}>
            Gửi
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
