import CloseIcon from '@mui/icons-material/Close'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import { CARD_STATUS, HISTORY_ACTION } from '@/features/accesscard/constants'
import { useCardHistory } from '@/features/accesscard/hooks'
import type { AccessCard, CardHistoryEntry } from '@/features/accesscard/types'
import { formatDateTime } from '@/lib/format'

const columns: Column<CardHistoryEntry>[] = [
  { key: 'createdAt', header: 'Thời gian', render: (h) => formatDateTime(h.createdAt) },
  { key: 'action', header: 'Thao tác', render: (h) => HISTORY_ACTION[h.action] },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (h) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {h.fromStatus && h.fromStatus !== h.toStatus && (
          <>
            <StatusChip {...CARD_STATUS[h.fromStatus]} />
            <span>→</span>
          </>
        )}
        <StatusChip {...CARD_STATUS[h.toStatus]} />
      </Stack>
    ),
  },
  { key: 'apartmentLabel', header: 'Căn hộ', render: (h) => h.apartmentLabel ?? '' },
  { key: 'residentName', header: 'Cư dân', render: (h) => h.residentName ?? '' },
  { key: 'note', header: 'Ghi chú', minWidth: 160, render: (h) => h.note ?? '' },
  { key: 'actor', header: 'Người thực hiện', render: (h) => h.actor ?? '' },
]

/** Lịch sử đổi trạng thái / gán thẻ (mới nhất trước). */
export function CardHistoryDialog({ card, onClose }: { card: AccessCard | null; onClose: () => void }) {
  const { data = [], isLoading, error, refetch } = useCardHistory(card?.id)
  return (
    <Dialog open={!!card} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pr: 7 }}>
        Lịch sử thẻ {card?.cardNo}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <DataTable
          columns={columns}
          rows={data}
          getRowId={(h) => h.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          emptyMessage="Chưa có lịch sử"
        />
      </DialogContent>
    </Dialog>
  )
}
