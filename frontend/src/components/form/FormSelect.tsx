import MenuItem from '@mui/material/MenuItem'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import type { SelectOption } from '@/components/DataTable/types'

type FormSelectProps<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  options: SelectOption[]
  /** Nhãn cho lựa chọn rỗng; bỏ trống nếu trường bắt buộc. */
  emptyLabel?: string
} & Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'select' | 'error'>

export function FormSelect<T extends FieldValues>({
  name,
  control,
  options,
  emptyLabel,
  helperText,
  fullWidth = true,
  ...rest
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, value, ...field }, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          select
          value={value ?? ''}
          inputRef={ref}
          fullWidth={fullWidth}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        >
          {emptyLabel !== undefined && (
            <MenuItem value="">
              <em>{emptyLabel}</em>
            </MenuItem>
          )}
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  )
}
