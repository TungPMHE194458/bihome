import { DatePicker, type DatePickerProps } from '@mui/x-date-pickers/DatePicker'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import dayjs from '@/lib/dayjs'

type FormDatePickerProps<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  label: string
  required?: boolean
  helperText?: string
} & Omit<DatePickerProps, 'value' | 'onChange' | 'label'>

/** Giá trị trong form là chuỗi YYYY-MM-DD (hoặc chuỗi rỗng), khớp LocalDate ở backend. */
export function FormDatePicker<T extends FieldValues>({
  name,
  control,
  label,
  required,
  helperText,
  ...rest
}: FormDatePickerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DatePicker
          {...rest}
          label={label}
          format="DD/MM/YYYY"
          value={field.value ? dayjs(field.value as string) : null}
          onChange={(v) => field.onChange(v && v.isValid() ? v.format('YYYY-MM-DD') : '')}
          inputRef={field.ref}
          slotProps={{
            textField: {
              fullWidth: true,
              required,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? helperText,
            },
          }}
        />
      )}
    />
  )
}
