import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

interface FormCheckboxProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label: string
}

/** Lỗi của trường (vd lỗi từ server "Căn hộ đã có chủ hộ chính") hiện ngay dưới ô chọn. */
export function FormCheckbox<T extends FieldValues>({ name, control, label }: FormCheckboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Box>
          <FormControlLabel
            label={label}
            control={
              <Checkbox
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                inputRef={field.ref}
              />
            }
          />
          {fieldState.error && (
            <FormHelperText error sx={{ mt: -0.5, mb: 0.5 }}>
              {fieldState.error.message}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  )
}
