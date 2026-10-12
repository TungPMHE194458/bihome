import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useEffect, useRef, useState } from 'react'

type DebouncedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'defaultValue'> & {
  value: string
  onDebouncedChange: (value: string) => void
  delay?: number
}

/** Ô nhập chỉ báo thay đổi sau khi người dùng ngừng gõ (mặc định 400ms) để không gọi API mỗi phím. */
export function DebouncedTextField({
  value,
  onDebouncedChange,
  delay = 400,
  ...rest
}: DebouncedTextFieldProps) {
  const [text, setText] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Giá trị đổi từ bên ngoài (vd bấm "Tất cả" để xoá lọc) → cập nhật ô nhập.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(value)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <TextField
      {...rest}
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          setSyncedValue(next)
          onDebouncedChange(next)
        }, delay)
      }}
    />
  )
}
