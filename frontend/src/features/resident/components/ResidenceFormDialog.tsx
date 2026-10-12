import { zodResolver } from '@hookform/resolvers/zod'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { ResidenceFields } from '@/features/resident/components/ResidenceFields'
import { useSaveResidence } from '@/features/resident/hooks'
import {
  LINK_ERROR_ALIASES,
  emptyLink,
  linkSchema,
  linkToForm,
  linkToRequest,
  type LinkFormValues,
} from '@/features/resident/schema'
import type { ResidentLink } from '@/features/resident/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

export interface ResidenceTarget {
  id: number
  fullName: string
  buildingId: number
  buildingName: string
}

interface ResidenceFormDialogProps {
  open: boolean
  resident: ResidenceTarget | null
  /** Có = sửa thông tin cư trú tại căn đó; không = gán thêm căn hộ. */
  link?: ResidentLink
  onClose: () => void
}

export function ResidenceFormDialog({ open, resident, link, onClose }: ResidenceFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = link != null
  const save = useSaveResidence()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: emptyLink(),
  })

  useEffect(() => {
    if (!open || !resident) return
    reset(link ? linkToForm(link, resident.buildingId, resident.buildingName) : emptyLink())
  }, [open, link, resident, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!resident) return
    try {
      await save.mutateAsync({ residentId: resident.id, linkId: link?.id, body: linkToRequest(values, link?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật thông tin cư trú.' : 'Đã gán căn hộ cho cư dân.', { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, LINK_ERROR_ALIASES)) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      title={editing ? `Cư trú tại ${link.apartmentCode}` : 'Gán căn hộ'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Cư dân <b>{resident?.fullName}</b> · {resident?.buildingName}
      </Typography>
      <ResidenceFields
        control={control}
        setValue={setValue}
        prefix=""
        buildingId={resident?.buildingId}
        lockApartment={editing}
        showMoveOut={editing}
      />
    </FormDialog>
  )
}
