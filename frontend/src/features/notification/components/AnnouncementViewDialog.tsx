import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { useAnnouncement } from '@/features/notification/api'
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_CATEGORY, ANNOUNCEMENT_STATUS } from '@/features/notification/constants'
import { AttachmentChips } from '@/features/ticket/components/AttachmentChips'
import { formatDateTime } from '@/lib/format'

/** Xem nội dung thông báo (mở từ danh sách hoặc từ chuông thông báo qua ?view=). */
export function AnnouncementViewDialog({ id, onClose }: { id?: number; onClose: () => void }) {
  const { data: a, isLoading, error, refetch } = useAnnouncement(id)
  return (
    <Dialog open={id != null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {a?.title ?? 'Thông báo'}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !a ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatusChip {...ANNOUNCEMENT_CATEGORY[a.category]} />
              <StatusChip {...ANNOUNCEMENT_STATUS[a.status]} />
              <Typography variant="body2" color="text.secondary">
                {a.buildingName} · {ANNOUNCEMENT_AUDIENCE[a.audience]}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {a.status === 'SENT'
                ? `Đã gửi ${formatDateTime(a.sentAt)}${a.sentBy ? ` bởi ${a.sentBy}` : ''}`
                : a.status === 'SCHEDULED'
                  ? `Hẹn gửi ${formatDateTime(a.scheduledAt)}`
                  : `Nháp · tạo ${formatDateTime(a.createdAt)}`}
            </Typography>
            <Divider />
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{a.content}</Typography>
            {a.attachments.length > 0 && <AttachmentChips attachments={a.attachments.map((f) => ({ ...f, id: f.fileId }))} />}
            {a.status === 'SENT' && (
              <Typography variant="caption" color="text.secondary">
                {a.audience !== 'RESIDENT' && `${a.staffCount} nhân viên đã nhận`}
                {a.audience === 'ALL' && ' · '}
                {a.audience !== 'STAFF' && `${a.residentCount} cư dân (nhận qua app)`}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
