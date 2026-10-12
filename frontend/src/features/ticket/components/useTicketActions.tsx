import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AssignDialog } from '@/features/ticket/components/AssignDialog'
import { StatusChangeDialog, type StatusChange } from '@/features/ticket/components/StatusChangeDialog'
import { TicketFormDialog } from '@/features/ticket/components/TicketFormDialog'
import { TICKET_STATUS } from '@/features/ticket/constants'
import { useChangeTicketStatus, useDeleteTicket } from '@/features/ticket/hooks'
import type { TicketDetail, TicketStatus, TicketSummary } from '@/features/ticket/types'
import { getErrorMessage } from '@/lib/apiError'

interface Options {
  onCreated?: (ticket: TicketDetail) => void
  onDeleted?: () => void
}

/** Thêm/sửa, chuyển trạng thái, phân công, xoá — dùng chung cho danh sách, Kanban và chi tiết. */
export function useTicketActions({ onCreated, onDeleted }: Options = {}) {
  const { enqueueSnackbar } = useSnackbar()
  const changeStatus = useChangeTicketStatus()
  const remove = useDeleteTicket()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null)
  const [assignTarget, setAssignTarget] = useState<TicketSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TicketSummary | null>(null)

  /** Kéo thả / menu nhanh: chuyển ngay, riêng Huỷ mở hộp thoại để nhập lý do. */
  const move = async (ticket: TicketSummary, to: TicketStatus) => {
    if (to === 'CANCELLED') {
      setStatusChange({ ticket, to })
      return
    }
    try {
      await changeStatus.mutateAsync({ id: ticket.id, status: to, note: null, version: ticket.version })
      enqueueSnackbar(`${ticket.code}: ${TICKET_STATUS[to].label}.`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const dialogs = (
    <>
      <TicketFormDialog open={form.open} ticketId={form.id} onClose={() => setForm({ open: false })} onCreated={onCreated} />
      <StatusChangeDialog change={statusChange} onClose={() => setStatusChange(null)} />
      <AssignDialog ticket={assignTarget} onClose={() => setAssignTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá yêu cầu?"
        message={
          <>
            Xoá vĩnh viễn yêu cầu <b>{deleteTarget?.code}</b> cùng dòng thời gian và tệp đính kèm. Chỉ xoá được yêu cầu Mới
            (tạo nhầm) hoặc đã Huỷ.
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
            enqueueSnackbar('Đã xoá yêu cầu.', { variant: 'success' })
            setDeleteTarget(null)
            onDeleted?.()
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )

  return {
    openCreate: () => setForm({ open: true }),
    openEdit: (id: number) => setForm({ open: true, id }),
    move,
    openStatus: (ticket: TicketSummary, to: TicketStatus) => setStatusChange({ ticket, to }),
    openAssign: (ticket: TicketSummary) => setAssignTarget(ticket),
    requestDelete: (ticket: TicketSummary) => setDeleteTarget(ticket),
    dialogs,
  }
}
