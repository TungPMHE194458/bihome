import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

export interface MultiOption<V extends string | number> {
  value: V
  label: string
  /** Hiện dưới nhãn trong danh sách (vd mã). */
  hint?: string
}

interface FormMultiSelectProps<T extends FieldValues, V extends string | number> {
  name: Path<T>
  control: Control<T>
  label: string
  options: MultiOption<V>[]
  required?: boolean
  disabled?: boolean
  helperText?: string
  placeholder?: string
}

/** Chọn nhiều giá trị dạng chip; giá trị form là mảng `value`. */
export function FormMultiSelect<T extends FieldValues, V extends string | number>({
  name,
  control,
  label,
  options,
  required,
  disabled,
  helperText,
  placeholder,
}: FormMultiSelectProps<T, V>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const values = (field.value ?? []) as V[]
        const selected = values.map((v) => options.find((o) => o.value === v) ?? { value: v, label: String(v) })
        return (
          <Autocomplete
            multiple
            disabled={disabled}
            options={options}
            value={selected}
            onChange={(_, v) => field.onChange(v.map((o) => o.value))}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            filterSelectedOptions
            noOptionsText="Không có lựa chọn"
            renderOption={(props, o) => {
              const { key, ...rest } = props
              return (
                <li key={key} {...rest}>
                  <span>
                    {o.label}
                    {o.hint && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>{o.hint}</span>}
                  </span>
                </li>
              )
            }}
            renderInput={(p) => (
              <TextField
                {...p}
                label={label}
                required={required}
                inputRef={field.ref}
                onBlur={field.onBlur}
                placeholder={values.length ? undefined : placeholder}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? helperText}
              />
            )}
          />
        )
      }}
    />
  )
}
