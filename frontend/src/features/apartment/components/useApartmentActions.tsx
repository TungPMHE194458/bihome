import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ApartmentFormDialog } from '@/features/apartment/components/ApartmentFormDialog'
import { useChangeApartmentStatus, useDeleteApartment } from '@/features/apartment/hooks'
import type { ApartmentSummary } from '@/features/apartment/types'
import { getErrorMessage } from '@/lib/apiError'

type Target = Pick<ApartmentSummary, 'id' | 'name' | 'status'>

export function useApartmentActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const { enqueueSnackbar } = useSnackbar()
  const changeStatus = useChangeApartmentStatus()
  const remove = useDeleteApartment()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<Target | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null)
  const deactivating = statusTarget?.status === 'ACTIVE'

  const run = async (action: () => Promise<unknown>, success: string, done: () => void) => {
    try {
      await action()
      enqueueSnackbar(success, { variant: 'success' })
      done()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const dialogs = (
    <>
      <ApartmentFormDialog open={form.open} apartmentId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động căn hộ?' : 'Kích hoạt lại căn hộ?'}
        message={
          <>
            Căn hộ <b>{statusTarget?.name}</b> sẽ chuyển sang {deactivating ? <b>Không hoạt động</b> : <b>Hoạt động</b>}.
          </>
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          statusTarget &&
          run(
            () => changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' }),
            deactivating ? 'Đã chuyển căn hộ sang Không hoạt động.' : 'Đã kích hoạt lại căn hộ.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá căn hộ?"
        message={
          <>
            Xoá vĩnh viễn căn hộ <b>{deleteTarget?.name}</b>. Nếu chỉ tạm ngừng, hãy chuyển sang <b>Không hoạt động</b>.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá căn hộ.', () => {
            setDeleteTarget(null)
            onDeleted?.()
          })
        }
      />
    </>
  )

  return {
    openCreate: () => setForm({ open: true }),
    openEdit: (id: number) => setForm({ open: true, id }),
    requestStatusChange: (a: Target) => setStatusTarget(a),
    requestDelete: (a: Target) => setDeleteTarget(a),
    dialogs,
  }
}
