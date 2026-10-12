import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'
import { FileIcon } from '@/components/FileIcon'
import type { UploadedFile } from '@/components/form/FormFileUpload'
import type { FilePurpose } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, uploadFile } from '@/lib/files'
import { formatFileSize } from '@/lib/format'

interface AttachmentListProps {
  value: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  purpose: FilePurpose
  max?: number
  label?: string
  error?: string
  disabled?: boolean
}

/** Nhiều tệp đính kèm, mỗi tệp tải lên ngay khi chọn (ảnh, PDF, Word...). */
export function AttachmentList({ value, onChange, purpose, max = 10, label = 'Đính kèm tệp', error, disabled }: AttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [uploadError, setUploadError] = useState<string>()

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(undefined)
    const room = max - value.length
    const picked = Array.from(files).slice(0, Math.max(0, room))
    if (files.length > picked.length) setUploadError(`Tối đa ${max} tệp.`)
    const tooBig = picked.find((f) => f.size > DOCUMENT_MAX_BYTES)
    if (tooBig) {
      setUploadError(`Tệp "${tooBig.name}" vượt quá 20MB.`)
      return
    }
    setUploading(picked.length)
    const added: UploadedFile[] = []
    try {
      for (const file of picked) {
        const res = await uploadFile(file, purpose)
        added.push({ fileId: res.id, name: res.name, size: res.size, contentType: res.contentType })
        setUploading((n) => n - 1)
      }
    } catch (e) {
      setUploadError(getErrorMessage(e, 'Không tải được tệp lên.'))
    } finally {
      setUploading(0)
      if (added.length) onChange([...value, ...added])
    }
  }

  return (
    <Box>
      <Stack spacing={0.75}>
        {value.map((f) => (
          <Stack key={f.fileId} direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 0.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
            <FileIcon name={f.name} contentType={f.contentType} size={20} />
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={f.name}>
              {f.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(f.size)}
            </Typography>
            <IconButton size="small" aria-label={`Bỏ tệp ${f.name}`} disabled={disabled} onClick={() => onChange(value.filter((x) => x.fileId !== f.fileId))}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        size="small"
        startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileIcon />}
        disabled={disabled || uploading > 0 || value.length >= max}
        onClick={() => inputRef.current?.click()}
        sx={{ mt: value.length ? 1 : 0 }}
      >
        {uploading ? `Đang tải ${uploading} tệp...` : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={DOCUMENT_ACCEPT}
        aria-label={label}
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
      {(uploadError || error) && <FormHelperText error>{uploadError ?? error}</FormHelperText>}
    </Box>
  )
}
