import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { BuildingFormDialog } from '@/features/building/components/BuildingFormDialog'
import { useChangeBuildingStatus, useDeleteBuilding } from '@/features/building/hooks'
import type { BuildingSummary } from '@/features/building/types'
import { getErrorMessage } from '@/lib/apiError'

type Target = Pick<BuildingSummary, 'id' | 'name' | 'status'>

/** Thêm/sửa, đổi trạng thái, xoá tòa nhà kèm hộp thoại xác nhận — dùng chung cho trang danh sách và chi tiết. */
export function useBuildingActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const { enqueueSnackbar } = useSnackbar()
  const changeStatus = useChangeBuildingStatus()
  const remove = useDeleteBuilding()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<Target | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null)

  const deactivating = statusTarget?.status === 'ACTIVE'

  const confirmStatus = async () => {
    if (!statusTarget) return
    try {
      await changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' })
      enqueueSnackbar(deactivating ? 'Đã chuyển tòa nhà sang Không hoạt động.' : 'Đã kích hoạt lại tòa nhà.', {
        variant: 'success',
      })
      setStatusTarget(null)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      enqueueSnackbar('Đã xoá tòa nhà.', { variant: 'success' })
      setDeleteTarget(null)
      onDeleted?.()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const dialogs = (
    <>
      <BuildingFormDialog open={form.open} buildingId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động tòa nhà?' : 'Kích hoạt lại tòa nhà?'}
        message={
          deactivating ? (
            <>
              Tòa nhà <b>{statusTarget?.name}</b> sẽ bị ẩn khỏi bộ chọn tòa nhà của nhân viên. Dữ liệu vẫn được giữ nguyên.
            </>
          ) : (
            <>
              Tòa nhà <b>{statusTarget?.name}</b> sẽ hiển thị lại trong bộ chọn tòa nhà.
            </>
          )
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onConfirm={confirmStatus}
        onClose={() => setStatusTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá tòa nhà?"
        message={
          <>
            Xoá vĩnh viễn tòa nhà <b>{deleteTarget?.name}</b>. Người dùng đang được gán vào tòa này sẽ mất quyền truy cập.
            Nếu chỉ tạm ngừng, hãy chuyển sang <b>Không hoạt động</b>.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )

  return {
    openCreate: () => setForm({ open: true }),
    openEdit: (id: number) => setForm({ open: true, id }),
    requestStatusChange: (b: Target) => setStatusTarget(b),
    requestDelete: (b: Target) => setDeleteTarget(b),
    dialogs,
  }
}
