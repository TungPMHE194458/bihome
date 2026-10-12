import Box from '@mui/material/Box'
import { useEffect, useRef } from 'react'
import { Controller, useWatch, type Control, type FieldValues, type Path, type PathValue, type UseFormSetValue } from 'react-hook-form'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import type { ApartmentOption } from '@/features/apartment/types'
import { useAssetItems } from '@/features/asset/hooks'
import { ResidentPicker } from '@/features/resident/components/ResidentPicker'

interface Props<T extends FieldValues> {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** Giới hạn trong tòa của thẻ. */
  buildingId?: number
  showBuilding?: boolean
  vehicleAllowed: boolean
  apartmentRequired?: boolean
}

const full = { gridColumn: '1 / -1' } as const

/** Căn hộ → cư dân đang ở căn đó → xe của căn (chỉ thẻ Gửi xe / Đa năng) + ngày cấp / hết hạn. */
export function CardAssignmentFields<T extends FieldValues>({
  control,
  setValue,
  buildingId,
  showBuilding,
  vehicleAllowed,
  apartmentRequired = false,
}: Props<T>) {
  const name = (field: string) => field as Path<T>
  const apartment = useWatch({ control, name: name('apartment') }) as ApartmentOption | null
  const { data: items } = useAssetItems(
    { apartmentId: apartment?.id ?? 0, buildingId: apartment?.buildingId ?? 0, status: 'ACTIVE', size: 50 },
    { enabled: !!apartment && vehicleAllowed },
  )

  // Đổi căn hộ thì cư dân / xe cũ không còn hợp lệ.
  const lastApartment = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (lastApartment.current !== undefined && apartment?.id !== lastApartment.current) {
      setValue('resident' as Path<T>, null as PathValue<T, Path<T>>)
      setValue('assetItemId' as Path<T>, '' as PathValue<T, Path<T>>)
    }
    lastApartment.current = apartment?.id
  }, [apartment?.id, setValue])

  return (
    <>
      <Box sx={full}>
        <Controller
          name={name('apartment')}
          control={control}
          render={({ field, fieldState }) => (
            <ApartmentPicker
              value={field.value}
              onChange={field.onChange}
              buildingId={buildingId}
              showBuilding={showBuilding}
              optional={!apartmentRequired}
              label={apartmentRequired ? 'Căn hộ' : 'Căn hộ (bỏ trống = nhập kho)'}
              error={fieldState.error?.message}
              inputRef={field.ref}
            />
          )}
        />
      </Box>
      <Controller
        name={name('resident')}
        control={control}
        render={({ field, fieldState }) => (
          <Box sx={{ opacity: apartment ? 1 : 0.5, pointerEvents: apartment ? 'auto' : 'none' }}>
            <ResidentPicker
              value={field.value}
              onChange={field.onChange}
              apartmentId={apartment?.id}
              label="Cư dân sử dụng"
              error={fieldState.error?.message}
              inputRef={field.ref}
            />
          </Box>
        )}
      />
      <FormSelect
        name={name('assetItemId')}
        control={control}
        label="Xe liên kết"
        options={(items?.content ?? []).map((i) => ({
          value: i.id.toString(),
          label: i.plateNumber ? `${i.name} · ${i.plateNumber}` : i.name,
        }))}
        emptyLabel="Không liên kết"
        disabled={!apartment || !vehicleAllowed}
        helperText={!vehicleAllowed ? 'Chỉ thẻ Gửi xe / Đa năng' : !apartment ? 'Chọn căn hộ trước' : undefined}
      />
      <FormDatePicker name={name('issuedDate')} control={control} label="Ngày cấp" helperText={apartment ? 'Bỏ trống = hôm nay' : undefined} />
      <FormDatePicker name={name('expiryDate')} control={control} label="Ngày hết hạn" />
    </>
  )
}
