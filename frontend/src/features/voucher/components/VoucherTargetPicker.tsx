import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useMemo } from 'react'
import { Controller, type Control } from 'react-hook-form'
import type { VoucherFormValues } from '@/features/voucher/schema'
import type { VoucherTarget } from '@/features/voucher/types'

interface Props {
  name: 'amenityIds' | 'serviceIds'
  control: Control<VoucherFormValues>
  label: string
  /** Đối tượng đang hoạt động của tòa voucher. */
  options: VoucherTarget[]
  /** Đối tượng đã gắn (có thể đã ngừng hoạt động) — vẫn hiện để giữ nguyên. */
  attached: VoucherTarget[]
  loading?: boolean
  disabled?: boolean
}

/** Chọn nhiều tiện ích / dịch vụ cụ thể; bỏ trống = áp dụng cho tất cả trong phạm vi. */
export function VoucherTargetPicker({ name, control, label, options, attached, loading, disabled }: Props) {
  const all = useMemo(() => {
    const ids = new Set(options.map((o) => o.id))
    return [...options, ...attached.filter((a) => !ids.has(a.id))]
  }, [options, attached])
  const byId = useMemo(() => new Map(all.map((o) => [o.id, o])), [all])

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple
          options={all}
          loading={loading}
          disabled={disabled}
          value={field.value.map((id) => byId.get(id) ?? { id, code: `#${id}`, name: '' })}
          onChange={(_, v) => field.onChange(v.map((o) => o.id))}
          getOptionLabel={(o) => (o.name ? `${o.name} (${o.code})` : o.code)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterSelectedOptions
          noOptionsText="Không có lựa chọn"
          renderInput={(p) => (
            <TextField
              {...p}
              label={label}
              inputRef={field.ref}
              onBlur={field.onBlur}
              placeholder={field.value.length ? undefined : 'Tất cả'}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? 'Bỏ trống = áp dụng cho tất cả'}
            />
          )}
        />
      )}
    />
  )
}
