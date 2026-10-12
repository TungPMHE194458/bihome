import CloseIcon from '@mui/icons-material/Close'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import Box from '@mui/material/Box'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { useRef, useState, type DragEvent } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { FileIcon } from '@/components/FileIcon'
import type { FilePurpose } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, uploadFile } from '@/lib/files'
import { formatFileSize } from '@/lib/format'

export interface UploadedFile {
  fileId: number
  name: string
  size: number
  contentType: string
}

interface FormFileUploadProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  purpose: FilePurpose
  label?: string
  accept?: string
  maxBytes?: number
  helperText?: string
}

/** Một tệp tài liệu, tải lên ngay khi chọn; form giữ thông tin tệp (fileId, tên, dung lượng). */
export function FormFileUpload<T extends FieldValues>({
  name,
  control,
  purpose,
  label = 'Tệp đính kèm',
  accept = DOCUMENT_ACCEPT,
  maxBytes = DOCUMENT_MAX_BYTES,
  helperText = 'PDF, Word, Excel, PowerPoint, JPG, PNG — tối đa 20MB.',
}: FormFileUploadProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FileUploader
          label={label}
          purpose={purpose}
          accept={accept}
          maxBytes={maxBytes}
          helperText={helperText}
          value={(field.value as UploadedFile | null | undefined) ?? null}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}

interface FileUploaderProps {
  label: string
  purpose: FilePurpose
  accept: string
  maxBytes: number
  helperText: string
  value: UploadedFile | null
  onChange: (value: UploadedFile | null) => void
  error?: string
}

function FileUploader({ label, purpose, accept, maxBytes, helperText, value, onChange, error }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string>()
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploadError(undefined)
    if (file.size > maxBytes) {
      setUploadError(`Tệp vượt quá ${Math.round(maxBytes / (1024 * 1024))}MB.`)
      return
    }
    setProgress(0)
    try {
      const res = await uploadFile(file, purpose, setProgress)
      onChange({ fileId: res.id, name: res.name, size: res.size, contentType: res.contentType })
    } catch (e) {
      setUploadError(getErrorMessage(e, 'Không tải được tệp lên.'))
    } finally {
      setProgress(null)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleFile(e.dataTransfer.files[0])
  }

  return (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>
      {value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <FileIcon name={value.name} contentType={value.contentType} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap title={value.name}>
              {value.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(value.size)}
            </Typography>
          </Box>
          <IconButton aria-label="Bỏ tệp" onClick={() => onChange(null)}>
            <CloseIcon />
          </IconButton>
        </Box>
      ) : (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Chọn tệp tải lên"
          onClick={() => progress === null && inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          sx={{
            p: 3,
            border: '1px dashed',
            borderColor: dragOver ? 'primary.main' : 'grey.400',
            bgcolor: dragOver ? 'primary.light' : 'transparent',
            borderRadius: 2,
            textAlign: 'center',
            cursor: 'pointer',
            color: 'text.secondary',
          }}
        >
          <UploadFileOutlinedIcon />
          <Typography variant="body2">Kéo thả tệp vào đây hoặc bấm để chọn</Typography>
          {progress !== null && <LinearProgress variant="determinate" value={progress} sx={{ mt: 1.5 }} />}
        </Box>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <FormHelperText error={!!(uploadError || error)}>{uploadError ?? error ?? helperText}</FormHelperText>
    </Box>
  )
}
