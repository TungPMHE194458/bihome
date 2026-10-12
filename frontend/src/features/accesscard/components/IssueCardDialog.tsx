import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormTextField } from '@/components/form/FormTextField'
import { CardAssignmentFields } from '@/features/accesscard/components/CardAssignmentFields'
import { CARD_TYPE, allowsVehicle } from '@/features/accesscard/constants'
import { useIssueAccessCard } from '@/features/accesscard/hooks'
import { issueSchema, issueToRequest, type IssueFormValues } from '@/features/accesscard/schema'
import type { AccessCard } from '@/features/accesscard/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

const empty = (): IssueFormValues => ({
  apartment: null,
  resident: null,
  assetItemId: '',
  issuedDate: '',
  expiryDate: '',
  issueFee: '',
  note: '',
})

/** Cấp thẻ đang trong kho cho căn hộ / cư dân / xe. */
export function IssueCardDialog({ card, onClose }: { card: AccessCard | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const issue = useIssueAccessCard()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: empty(),
  })

  useEffect(() => {
    if (card) reset({ ...empty(), expiryDate: card.expiryDate ?? '', issueFee: String(card.issueFee) })
  }, [card, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!card) return
    try {
      await issue.mutateAsync({ id: card.id, body: issueToRequest(values, card.version, allowsVehicle(card.cardType)) })
      enqueueSnackbar(`Đã cấp thẻ ${card.cardNo}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, { apartmentId: 'apartment', residentId: 'resident' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={!!card}
      title="Cấp thẻ"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Cấp thẻ"
      maxWidth="md"
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Thẻ <b>{card?.cardNo}</b> · {card ? CARD_TYPE[card.cardType].label : ''}
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <CardAssignmentFields
          control={control}
          setValue={setValue}
          buildingId={card?.buildingId}
          vehicleAllowed={!!card && allowsVehicle(card.cardType)}
          apartmentRequired
        />
        <FormTextField
          name="issueFee"
          control={control}
          label="Phí làm thẻ"
          slotProps={{ input: { endAdornment: <InputAdornment position="end">đ</InputAdornment> } }}
        />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormTextField name="note" control={control} label="Ghi chú" />
        </Box>
      </Box>
    </FormDialog>
  )
}
