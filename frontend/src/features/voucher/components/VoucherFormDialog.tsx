import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { useAmenityOptions } from '@/features/amenity/hooks'
import { useServiceOptions } from '@/features/servicecatalog/hooks'
import { VoucherTargetPicker } from '@/features/voucher/components/VoucherTargetPicker'
import { APPLY_SCOPE_OPTIONS, DISCOUNT_TYPE_OPTIONS, VOUCHER_STATUS_OPTIONS } from '@/features/voucher/constants'
import { useSaveVoucher, useVoucher } from '@/features/voucher/hooks'
import { emptyVoucher, voucherSchema, voucherToForm, voucherToRequest, type VoucherFormValues } from '@/features/voucher/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingOptions } from '@/features/building/hooks'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  voucherId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const
const suffix = (text: string) => ({ input: { endAdornment: <InputAdornment position="end">{text}</InputAdornment> } })

export function VoucherFormDialog({ open, voucherId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = voucherId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useVoucher(open ? voucherId : undefined)
  const save = useSaveVoucher()
  const { control, handleSubmit, reset, setError, formState } = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: emptyVoucher(),
  })
  const discountType = useWatch({ control, name: 'discountType' })
  const applyScope = useWatch({ control, name: 'applyScope' })
  const locked = !!detail?.valueLocked
  // Tiện ích / dịch vụ lấy theo tòa của voucher (sửa) hoặc tòa đang chọn (thêm).
  const voucherBuildingId = editing ? detail?.buildingId : buildingId
  const { data: amenityOptions = [], isLoading: loadingAmenities } = useAmenityOptions(voucherBuildingId, open && applyScope !== 'SERVICE')
  const { data: serviceOptions = [], isLoading: loadingServices } = useServiceOptions(voucherBuildingId, open && applyScope !== 'AMENITY')
  const amenities = amenityOptions.map(({ id, code, name }) => ({ id, code, name }))
  const services = serviceOptions.map(({ id, code, name }) => ({ id, code, name }))

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? voucherToForm(detail) : emptyVoucher())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: voucherId, body: voucherToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật voucher.' : `Đã thêm voucher ${saved.code}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Chỉnh sửa voucher ${detail?.code ?? ''}` : 'Thêm voucher'}
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
      ) : !editing && buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi thêm voucher.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {locked && (
            <Alert severity="info" sx={full}>
              Voucher đã có <b>{detail?.usedCount}</b> lượt dùng nên không sửa được mã, loại / giá trị giảm và phạm vi áp dụng.
            </Alert>
          )}
          <FormTextField name="code" control={control} label="Mã voucher" required disabled={locked} transform={(v) => v.toUpperCase()} />
          <FormTextField name="name" control={control} label="Tên voucher" required />
          <FormSelect name="discountType" control={control} label="Loại giảm" options={DISCOUNT_TYPE_OPTIONS} required disabled={locked} />
          <FormTextField
            name="discountValue"
            control={control}
            label="Giá trị giảm"
            required
            disabled={locked}
            slotProps={suffix(discountType === 'PERCENT' ? '%' : 'đ')}
          />
          {discountType === 'PERCENT' && (
            <FormTextField
              name="maxDiscount"
              control={control}
              label="Giảm tối đa"
              disabled={locked}
              helperText="Bỏ trống = không giới hạn"
              slotProps={suffix('đ')}
            />
          )}
          {/* Phạm vi + tiện ích / dịch vụ cụ thể trên cùng một hàng. */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={full}>
            <Box sx={{ width: { sm: 200 }, flexShrink: 0 }}>
              <FormSelect name="applyScope" control={control} label="Áp dụng cho" options={APPLY_SCOPE_OPTIONS} required disabled={locked} />
            </Box>
            {applyScope !== 'SERVICE' && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <VoucherTargetPicker
                  name="amenityIds"
                  control={control}
                  label="Tiện ích cụ thể"
                  options={amenities}
                  attached={detail?.amenities ?? []}
                  loading={loadingAmenities}
                  disabled={locked}
                />
              </Box>
            )}
            {applyScope !== 'AMENITY' && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <VoucherTargetPicker
                  name="serviceIds"
                  control={control}
                  label="Dịch vụ cụ thể"
                  options={services}
                  attached={detail?.services ?? []}
                  loading={loadingServices}
                  disabled={locked}
                />
              </Box>
            )}
          </Stack>
          <FormTextField name="totalQuantity" control={control} label="Tổng số lượng" helperText="Bỏ trống = không giới hạn" />
          <FormTextField name="perApartmentLimit" control={control} label="Giới hạn mỗi căn hộ" helperText="Bỏ trống = không giới hạn" />
          <FormDatePicker name="validFrom" control={control} label="Hiệu lực từ" required />
          <FormDatePicker name="validTo" control={control} label="Hiệu lực đến" required />
          <FormSelect name="status" control={control} label="Trạng thái" options={VOUCHER_STATUS_OPTIONS} required />
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
          </Box>
          {!editing && building && (
            <Alert severity="info" sx={full}>
              Voucher dùng cho tòa nhà <b>{building.name}</b>.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
