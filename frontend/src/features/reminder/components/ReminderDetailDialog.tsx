import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { DataTable } from '@/components/DataTable/DataTable'
import { ErrorState } from '@/components/ErrorState'
import type { Column } from '@/components/DataTable/types'
import { RichTextView } from '@/components/form/RichTextEditor'
import { StatusChip } from '@/components/StatusChip'
import { CHANNEL_LABEL, REMINDER_STATUS, scheduleText } from '@/features/reminder/constants'
import { useReminder, useReminderDeliveries } from '@/features/reminder/hooks'
import type { ReminderDelivery } from '@/features/reminder/types'
import { formatDateTime } from '@/lib/format'

const DELIVERY_STATUS = {
  SENT: { label: 'Đã gửi', tone: 'success' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
  FAILED: { label: 'Lỗi', tone: 'danger' },
} as const

/** Nội dung nhắc nhở + lịch sử gửi từng cư dân × kênh. */
export function ReminderDetailDialog({ id, onClose }: { id?: number; onClose: () => void }) {
  const { data: r, isLoading, error, refetch } = useReminder(id)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const {
    data: deliveries,
    isLoading: loadingDeliveries,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useReminderDeliveries(id, { page, size })

  const columns: Column<ReminderDelivery>[] = [
    { key: 'runNo', header: 'Lần', width: 56, render: (d) => d.runNo },
    { key: 'resident', header: 'Cư dân', render: (d) => <b>{d.residentName}</b> },
    { key: 'apartment', header: 'Căn hộ', render: (d) => d.apartmentCode ?? '' },
    { key: 'channel', header: 'Kênh', render: (d) => CHANNEL_LABEL[d.channel] },
    { key: 'destination', header: 'Gửi tới', render: (d) => d.destination ?? '' },
    { key: 'status', header: 'Kết quả', render: (d) => <StatusChip {...DELIVERY_STATUS[d.status]} title={d.note} /> },
    { key: 'note', header: 'Ghi chú', render: (d) => d.note ?? '' },
    { key: 'sentAt', header: 'Thời gian', render: (d) => formatDateTime(d.sentAt) },
  ]

  return (
    <Dialog open={id != null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {r?.title ?? 'Nhắc nhở'}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !r ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <StatusChip {...REMINDER_STATUS[r.status]} />
              <Typography variant="body2" color="text.secondary">
                {r.targetLabel} · {r.channels.map((c) => CHANNEL_LABEL[c]).join(', ')} · {scheduleText(r)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {r.runCount > 0
                ? `Đã gửi ${r.runCount} lần · lần gần nhất ${formatDateTime(r.lastSentAt)} tới ${r.recipientCount} cư dân`
                : 'Chưa gửi lần nào'}
              {r.nextRunAt ? ` · lần tới ${formatDateTime(r.nextRunAt)}` : ''}
            </Typography>
            <Paper variant="outlined" sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
              <RichTextView html={r.content} />
            </Paper>
            <Divider />
            <Typography fontWeight={700}>Lịch sử gửi</Typography>
            <DataTable
              columns={columns}
              rows={deliveries?.content ?? []}
              getRowId={(d) => d.id}
              loading={loadingDeliveries}
              error={deliveriesError}
              onRetry={() => void refetchDeliveries()}
              emptyMessage="Chưa gửi lần nào"
              page={page}
              size={size}
              total={deliveries?.totalElements ?? 0}
              onPageChange={setPage}
              onSizeChange={(s) => {
                setSize(s)
                setPage(0)
              }}
            />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
