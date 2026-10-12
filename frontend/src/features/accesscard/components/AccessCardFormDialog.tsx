import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { CardAssignmentFields } from '@/features/accesscard/components/CardAssignmentFields'
import { CARD_STATUS, CARD_TYPE_OPTIONS, allowsVehicle } from '@/features/accesscard/constants'
import { useAccessCard, useSaveAccessCard } from '@/features/accesscard/hooks'
import { cardSchema, cardToForm, cardToRequest, emptyCard, normalizeCardNo, type CardFormValues } from '@/features/accesscard/schema'
import type { ApartmentOption } from '@/features/apartment/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  cardId?: number
  /** Thêm từ chi tiết căn hộ: cấp luôn cho căn đó. */
  initialApartment?: ApartmentOption
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const
const ALIASES = { apartmentId: 'apartment', residentId: 'resident' }

export function AccessCardFormDialog({ open, cardId, initialApartment, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = cardId != null
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useAccessCard(open ? cardId : undefined)
  const save = useSaveAccessCard()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: emptyCard(),
  })
  const [cardType, apartment] = useWatch({ control, name: ['cardType', 'apartment'] })
  // Thẻ trong kho / thu hồi / báo mất chỉ sửa thông tin thẻ; gán căn hộ qua "Cấp thẻ".
  const assignable = !editing || detail?.status === 'IN_USE' || detail?.status === 'LOCKED'

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? cardToForm(detail) : { ...emptyCard(), apartment: initialApartment ?? null })
  }, [open, editing, detail, initialApartment, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: cardId, body: cardToRequest(values, detail?.version) })
      enqueueSnackbar(
        editing ? 'Đã cập nhật thẻ.' : saved.status === 'IN_USE' ? `Đã cấp thẻ ${saved.cardNo}.` : `Đã nhập kho thẻ ${saved.cardNo}.`,
        { variant: 'success' },
      )
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, ALIASES)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Chỉnh sửa thẻ ${detail?.cardNo ?? ''}` : 'Thêm thẻ từ'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField name="cardNo" control={control} label="Mã thẻ / Serial" required transform={normalizeCardNo} />
          <FormSelect name="cardType" control={control} label="Loại thẻ" options={CARD_TYPE_OPTIONS} required />
          {assignable ? (
            <CardAssignmentFields
              control={control}
              setValue={setValue}
              buildingId={editing ? detail?.buildingId : (selectedBuildingId ?? undefined)}
              showBuilding={selectedBuildingId == null}
              vehicleAllowed={allowsVehicle(cardType)}
              apartmentRequired={editing}
            />
          ) : (
            detail && (
              <Alert severity="info" sx={full}>
                Thẻ đang ở trạng thái <b>{CARD_STATUS[detail.status].label}</b>
                {detail.status === 'IN_STOCK' ? ' — dùng "Cấp thẻ" để gán cho căn hộ.' : ' — chỉ sửa được thông tin thẻ.'}
              </Alert>
            )
          )}
          <FormTextField
            name="issueFee"
            control={control}
            label="Phí làm thẻ"
            slotProps={{ input: { endAdornment: <InputAdornment position="end">đ</InputAdornment> } }}
          />
          <Box sx={full}>
            <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} />
          </Box>
          {!editing && (
            <Alert severity="info" sx={full}>
              {apartment ? (
                <>
                  Thẻ được <b>cấp ngay</b> cho căn {apartment.name} ({apartment.code}).
                </>
              ) : (
                'Không chọn căn hộ: thẻ được nhập kho (Trong kho), cấp sau.'
              )}
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
