import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ApartmentOption } from '@/features/apartment/types'
import { MoveOutDialog, type MoveOutTarget } from '@/features/resident/components/MoveOutDialog'
import { ResidenceFormDialog, type ResidenceTarget } from '@/features/resident/components/ResidenceFormDialog'
import { ResidentFormDialog } from '@/features/resident/components/ResidentFormDialog'
import { useDeleteResident } from '@/features/resident/hooks'
import type { ResidentDetail, ResidentLink } from '@/features/resident/types'
import { getErrorMessage } from '@/lib/apiError'

type Target = ResidenceTarget & MoveOutTarget

interface Options {
  onDeleted?: () => void
  onCreated?: (resident: ResidentDetail) => void
}

/** Thêm/sửa, gán căn hộ, sửa cư trú, chuyển đi, xoá — dùng chung cho danh sách, chi tiết và tab Cư dân của căn hộ. */
export function useResidentActions({ onDeleted, onCreated }: Options = {}) {
  const { enqueueSnackbar } = useSnackbar()
  const remove = useDeleteResident()
  const [form, setForm] = useState<{ open: boolean; id?: number; apartment?: ApartmentOption }>({ open: false })
  const [residence, setResidence] = useState<{ resident: Target; link?: ResidentLink } | null>(null)
  const [moveOut, setMoveOut] = useState<{ resident: Target; linkId?: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null)

  const dialogs = (
    <>
      <ResidentFormDialog
        open={form.open}
        residentId={form.id}
        initialApartment={form.apartment}
        onClose={() => setForm({ open: false })}
        onCreated={onCreated}
      />
      <ResidenceFormDialog
        open={!!residence}
        resident={residence?.resident ?? null}
        link={residence?.link}
        onClose={() => setResidence(null)}
      />
      <MoveOutDialog resident={moveOut?.resident ?? null} linkId={moveOut?.linkId} onClose={() => setMoveOut(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá cư dân?"
        message={
          <>
            Xoá vĩnh viễn cư dân <b>{deleteTarget?.fullName}</b> cùng lịch sử cư trú. Chỉ xoá được khi cư dân đã chuyển đi
            khỏi mọi căn hộ.
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
            enqueueSnackbar('Đã xoá cư dân.', { variant: 'success' })
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
    openCreate: (apartment?: ApartmentOption) => setForm({ open: true, apartment }),
    openEdit: (id: number) => setForm({ open: true, id }),
    openAssign: (resident: Target) => setResidence({ resident }),
    openEditResidence: (resident: Target, link: ResidentLink) => setResidence({ resident, link }),
    requestMoveOut: (resident: Target, linkId?: number) => setMoveOut({ resident, linkId }),
    requestDelete: (resident: Target) => setDeleteTarget(resident),
    dialogs,
  }
}
