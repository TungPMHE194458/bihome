import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatClearIcon from '@mui/icons-material/FormatClear'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import InsertLinkIcon from '@mui/icons-material/InsertLink'
import TitleIcon from '@mui/icons-material/Title'
import Box from '@mui/material/Box'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  label?: string
  required?: boolean
  error?: string
  helperText?: string
  disabled?: boolean
  minHeight?: number
}

/**
 * Soạn thảo văn bản đơn giản (đậm, nghiêng, gạch chân, tiêu đề, danh sách, liên kết) trên contentEditable — không
 * thêm thư viện. Giá trị là HTML; backend lọc lại theo danh sách thẻ cho phép trước khi lưu.
 */
export function RichTextEditor({ value, onChange, label, required, error, helperText, disabled, minHeight = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Chỉ ghi DOM khi giá trị đổi từ bên ngoài (reset form), tránh nhảy con trỏ khi đang gõ.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value
  }, [value])

  const exec = (command: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, arg)
    onChange(ref.current?.innerHTML ?? '')
  }

  const tool = (title: string, icon: ReactNode, run: () => void) => (
    <Tooltip title={title} key={title}>
      <span>
        <IconButton
          size="small"
          aria-label={title}
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault()
            run()
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  )

  return (
    <Box>
      {label && (
        <Typography variant="body2" color={error ? 'error' : 'text.secondary'} sx={{ mb: 0.5 }}>
          {label}
          {required && ' *'}
        </Typography>
      )}
      <Box
        sx={{
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          '&:focus-within': { borderColor: error ? 'error.main' : 'primary.main', boxShadow: (t) => `0 0 0 1px ${t.palette.primary.main}` },
        }}
      >
        <Stack direction="row" spacing={0.25} sx={{ px: 0.5, py: 0.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }} role="toolbar" aria-label="Định dạng">
          {tool('Đậm', <FormatBoldIcon fontSize="small" />, () => exec('bold'))}
          {tool('Nghiêng', <FormatItalicIcon fontSize="small" />, () => exec('italic'))}
          {tool('Gạch chân', <FormatUnderlinedIcon fontSize="small" />, () => exec('underline'))}
          {tool('Đề mục', <TitleIcon fontSize="small" />, () => exec('formatBlock', 'h3'))}
          {tool('Danh sách', <FormatListBulletedIcon fontSize="small" />, () => exec('insertUnorderedList'))}
          {tool('Danh sách đánh số', <FormatListNumberedIcon fontSize="small" />, () => exec('insertOrderedList'))}
          {tool('Chèn liên kết', <InsertLinkIcon fontSize="small" />, () => {
            const url = window.prompt('Địa chỉ liên kết (https://...)')
            if (url && /^https?:\/\//i.test(url.trim())) exec('createLink', url.trim())
          })}
          {tool('Xoá định dạng', <FormatClearIcon fontSize="small" />, () => {
            exec('removeFormat')
            exec('formatBlock', 'p')
          })}
        </Stack>
        <Box
          ref={ref}
          role="textbox"
          aria-label={label}
          aria-multiline
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={() => onChange(ref.current?.innerHTML ?? '')}
          sx={{
            minHeight,
            px: 1.5,
            py: 1,
            outline: 'none',
            fontSize: 14,
            '& p, & h3': { my: 0.75 },
            '& h3': { fontSize: 16 },
            '& ul, & ol': { pl: 3, my: 0.5 },
            '& a': { color: 'primary.main' },
          }}
        />
      </Box>
      {(error || helperText) && <FormHelperText error={!!error}>{error ?? helperText}</FormHelperText>}
    </Box>
  )
}

/** Hiển thị HTML đã được backend lọc (chỉ thẻ định dạng cơ bản). */
export function RichTextView({ html }: { html: string }) {
  return (
    <Box
      sx={{ fontSize: 14, '& p, & h3': { my: 0.75 }, '& h3': { fontSize: 16 }, '& ul, & ol': { pl: 3 }, '& a': { color: 'primary.main' } }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
