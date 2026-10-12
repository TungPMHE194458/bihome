import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { useEffect } from 'react'
import { Controller, useWatch, type Control, type FieldValues, type Path, type PathValue, type UseFormSetValue } from 'react-hook-form'
import { FormCheckbox } from '@/components/form/FormCheckbox'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import { ACTIVE_RESIDENCE_OPTIONS, RELATIONSHIP_OPTIONS, RESIDENT_ROLE_OPTIONS } from '@/features/resident/constants'
import { willMoveOut } from '@/features/resident/schema'
import dayjs from '@/lib/dayjs'

interface ResidenceFieldsProps<T extends FieldValues> {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** '' cho form cư trú riêng, 'residence.' khi nằm trong form thêm cư dân. */
  prefix: '' | 'residence.'
  /** Chỉ chọn căn trong tòa của cư dân. */
  buildingId?: number
  showBuilding?: boolean
  /** Sửa cư trú: không đổi được căn hộ. */
  lockApartment?: boolean
  showMoveOut?: boolean
}

const full = { gridColumn: '1 / -1' } as const

/** Các trường của một lần cư trú (căn hộ, vai trò, chủ hộ, ngày chuyển đến/đi, tình trạng, tạm trú). */
export function ResidenceFields<T extends FieldValues>({
  control,
  setValue,
  prefix,
  buildingId,
  showBuilding,
  lockApartment = false,
  showMoveOut = false,
}: ResidenceFieldsProps<T>) {
  const name = (field: string) => `${prefix}${field}` as Path<T>
  const role = useWatch({ control, name: name('role') }) as string
  const moveOutDate = useWatch({ control, name: name('moveOutDate') }) as string | undefined
  const isOwner = role === 'OWNER'

  // Chỉ Chủ sở hữu mới là chủ hộ chính: đổi vai trò thì bỏ chọn để không còn lỗi ẩn.
  useEffect(() => {
    if (!isOwner) setValue(`${prefix}householdHead` as Path<T>, false as PathValue<T, Path<T>>)
  }, [isOwner, prefix, setValue])

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <Box sx={full}>
        <Controller
          name={name('apartment')}
          control={control}
          render={({ field, fieldState }) =>
            lockApartment ? (
              <ApartmentPicker value={field.value} onChange={() => undefined} buildingId={buildingId} disabled />
            ) : (
              <ApartmentPicker
                value={field.value}
                onChange={field.onChange}
                buildingId={buildingId}
                showBuilding={showBuilding}
                error={fieldState.error?.message}
                inputRef={field.ref}
              />
            )
          }
        />
      </Box>
      <FormSelect name={name('role')} control={control} label="Vai trò tại căn hộ" options={RESIDENT_ROLE_OPTIONS} required />
      <FormSelect
        name={name('relationship')}
        control={control}
        label="Quan hệ với chủ hộ"
        options={RELATIONSHIP_OPTIONS}
        emptyLabel="Không"
      />
      <FormDatePicker name={name('moveInDate')} control={control} label="Ngày chuyển đến" required />
      {showMoveOut ? (
        <FormDatePicker name={name('moveOutDate')} control={control} label="Ngày chuyển đi" />
      ) : (
        <FormSelect name={name('residenceStatus')} control={control} label="Tình trạng cư trú" options={ACTIVE_RESIDENCE_OPTIONS} required />
      )}
      {showMoveOut && (
        <FormSelect name={name('residenceStatus')} control={control} label="Tình trạng cư trú" options={ACTIVE_RESIDENCE_OPTIONS} required />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', ...(showMoveOut ? {} : full) }}>
        {isOwner && <FormCheckbox name={name('householdHead')} control={control} label="Chủ hộ chính" />}
        <FormCheckbox name={name('tempResidenceRegistered')} control={control} label="Đã đăng ký tạm trú" />
      </Box>
      {showMoveOut && moveOutDate && willMoveOut(moveOutDate) && (
        <Alert severity="info" sx={full}>
          Ngày chuyển đi không sau hôm nay nên cư dân sẽ được chuyển sang <b>Đã chuyển đi</b> tại căn này khi lưu.
        </Alert>
      )}
      {showMoveOut && moveOutDate && !willMoveOut(moveOutDate) && (
        <Alert severity="info" sx={full}>
          Cư dân sẽ tự chuyển sang Đã chuyển đi vào ngày {dayjs(moveOutDate).format('DD/MM/YYYY')}.
        </Alert>
      )}
    </Box>
  )
}
