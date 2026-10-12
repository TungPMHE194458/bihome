import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useState } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

export type FormTextFieldProps<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  /** Biến đổi giá trị khi gõ (vd chuyển mã sang chữ in hoa). */
  transform?: (value: string) => string
} & Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'defaultValue'>

export function FormTextField<T extends FieldValues>({
  name,
  control,
  helperText,
  transform,
  fullWidth = true,
  ...rest
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, value, onChange, ...field }, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          value={value ?? ''}
          inputRef={ref}
          fullWidth={fullWidth}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
        />
      )}
    />
  )
}

export function FormPasswordField<T extends FieldValues>(props: FormTextFieldProps<T>) {
  const [visible, setVisible] = useState(false)
  return (
    <FormTextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setVisible((v) => !v)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
