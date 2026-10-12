import AddCardOutlinedIcon from '@mui/icons-material/AddCardOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HistoryIcon from '@mui/icons-material/History'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { RowAction } from '@/components/DataTable/types'
import { AccessCardFormDialog } from '@/features/accesscard/components/AccessCardFormDialog'
import { CardHistoryDialog } from '@/features/accesscard/components/CardHistoryDialog'
import { CardStatusDialog, type CardStatusChange } from '@/features/accesscard/components/CardStatusDialog'
import { IssueCardDialog } from '@/features/accesscard/components/IssueCardDialog'
import { STATUS_ACTION } from '@/features/accesscard/constants'
import { useDeleteAccessCard } from '@/features/accesscard/hooks'
import type { AccessCard } from '@/features/accesscard/types'
import type { ApartmentOption } from '@/features/apartment/types'
import { getErrorMessage } from '@/lib/apiError'
import { usePermission } from '@/stores/authStore'

/** Thêm/sửa, cấp thẻ, đổi trạng thái, lịch sử, xoá — dùng chung cho danh sách thẻ và tab Thẻ từ của căn hộ. */
export function useCardActions() {
  const { enqueueSnackbar } = useSnackbar()
  const remove = useDeleteAccessCard()
  const canWrite = usePermission('ACCESS_CARD_WRITE')
  const canDelete = usePermission('ACCESS_CARD_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number; apartment?: ApartmentOption }>({ open: false })
  const [issueTarget, setIssueTarget] = useState<AccessCard | null>(null)
  const [statusChange, setStatusChange] = useState<CardStatusChange | null>(null)
  const [historyTarget, setHistoryTarget] = useState<AccessCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AccessCard | null>(null)

  const rowActions = (c: AccessCard): RowAction[] => [
    { label: 'Lịch sử', icon: <HistoryIcon fontSize="small" />, onClick: () => setHistoryTarget(c) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: c.id }) },
          ...(c.status === 'IN_STOCK'
            ? [{ label: 'Cấp thẻ', icon: <AddCardOutlinedIcon fontSize="small" />, onClick: () => setIssueTarget(c) }]
            : []),
          ...c.allowedStatuses
            .filter((s) => !(c.status === 'IN_STOCK' && s === 'IN_USE'))
            .map((to) => ({
              label: STATUS_ACTION[to],
              icon: <SwapHorizIcon fontSize="small" />,
              danger: to === 'LOST' || to === 'REVOKED',
              onClick: () => setStatusChange({ card: c, to }),
            })),
        ]
      : []),
    ...(canDelete && c.status === 'IN_STOCK'
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(c) }]
      : []),
  ]

  const dialogs = (
    <>
      <AccessCardFormDialog
        open={form.open}
        cardId={form.id}
        initialApartment={form.apartment}
        onClose={() => setForm({ open: false })}
      />
      <IssueCardDialog card={issueTarget} onClose={() => setIssueTarget(null)} />
      <CardStatusDialog change={statusChange} onClose={() => setStatusChange(null)} />
      <CardHistoryDialog card={historyTarget} onClose={() => setHistoryTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá thẻ từ?"
        message={
          <>
            Xoá vĩnh viễn thẻ <b>{deleteTarget?.cardNo}</b>. Chỉ xoá được thẻ trong kho chưa từng cấp (nhập nhầm); thẻ đã dùng
            hãy Thu hồi để giữ lịch sử.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove.mutateAsync(deleteTarget.id)
            enqueueSnackbar('Đã xoá thẻ.', { variant: 'success' })
            setDeleteTarget(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )

  return {
    openCreate: (apartment?: ApartmentOption) => setForm({ open: true, apartment }),
    rowActions,
    dialogs,
  }
}
