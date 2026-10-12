import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useRef, useState, type DragEvent } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { AuthImage } from '@/components/AuthImage'
import type { FilePurpose } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { IMAGE_MAX_BYTES, IMAGE_TYPES, uploadFile } from '@/lib/files'

export interface UploadedImage {
  fileId: number
  url: string
  isCover: boolean
}

interface FormImageUploadProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  purpose: FilePurpose
  label?: string
  max?: number
}

/** Kéo thả nhiều ảnh, tải lên ngay khi chọn; form chỉ giữ fileId. Ảnh đầu tiên mặc định là ảnh đại diện. */
export function FormImageUpload<T extends FieldValues>({
  name,
  control,
  purpose,
  label = 'Ảnh',
  max = 10,
}: FormImageUploadProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <ImageUploader
          label={label}
          purpose={purpose}
          max={max}
          value={(field.value as UploadedImage[] | undefined) ?? []}
          onChange={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}

interface ImageUploaderProps {
  label: string
  purpose: FilePurpose
  max: number
  value: UploadedImage[]
  onChange: (value: UploadedImage[]) => void
  error?: string
}

function ImageUploader({ label, purpose, max, value, onChange, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [uploadError, setUploadError] = useState<string>()
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(undefined)
    const list = Array.from(files)
    const room = max - value.length
    if (list.length > room) {
      setUploadError(`Tối đa ${max} ảnh.`)
    }
    let next = [...value]
    for (const file of list.slice(0, Math.max(0, room))) {
      if (!IMAGE_TYPES.includes(file.type)) {
        setUploadError(`"${file.name}" không phải ảnh JPG, PNG hoặc WEBP.`)
        continue
      }
      if (file.size > IMAGE_MAX_BYTES) {
        setUploadError(`"${file.name}" vượt quá 5MB.`)
        continue
      }
      setUploading((n) => n + 1)
      try {
        const res = await uploadFile(file, purpose)
        next = [...next, { fileId: res.id, url: res.url, isCover: next.length === 0 }]
        onChange(next)
      } catch (e) {
        setUploadError(getErrorMessage(e, `Không tải được "${file.name}".`))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const remove = (fileId: number) => {
    const rest = value.filter((img) => img.fileId !== fileId)
    if (rest.length > 0 && !rest.some((img) => img.isCover)) rest[0] = { ...rest[0], isCover: true }
    onChange(rest)
  }

  const setCover = (fileId: number) =>
    onChange(value.map((img) => ({ ...img, isCover: img.fileId === fileId })))

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <Box>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {value.map((img) => (
          <Box key={img.fileId} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: img.isCover ? 'primary.main' : 'divider' }}>
            <AuthImage url={img.url} alt="Ảnh đã tải lên" sx={{ width: '100%', aspectRatio: '16 / 9' }} />
            <Box sx={{ position: 'absolute', top: 2, right: 2, display: 'flex', bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 1 }}>
              <Tooltip title={img.isCover ? 'Ảnh đại diện' : 'Đặt làm ảnh đại diện'}>
                <IconButton size="small" aria-label="Đặt làm ảnh đại diện" onClick={() => setCover(img.fileId)}>
                  {img.isCover ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Xoá ảnh">
                <IconButton size="small" aria-label="Xoá ảnh" onClick={() => remove(img.fileId)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <Box key={`up-${i}`} sx={{ aspectRatio: '16 / 9', border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ))}
        {value.length + uploading < max && (
          <Box
            role="button"
            tabIndex={0}
            aria-label="Chọn ảnh tải lên"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            sx={{
              aspectRatio: '16 / 9',
              border: '1px dashed',
              borderColor: dragOver ? 'primary.main' : 'grey.400',
              bgcolor: dragOver ? 'primary.light' : 'transparent',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'text.secondary',
              textAlign: 'center',
              p: 1,
            }}
          >
            <AddPhotoAlternateOutlinedIcon />
            <Typography variant="caption">Kéo thả hoặc bấm để chọn ảnh</Typography>
          </Box>
        )}
      </Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={IMAGE_TYPES.join(',')}
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <FormHelperText error={!!(uploadError || error)}>
        {uploadError ?? error ?? 'JPG, PNG hoặc WEBP, tối đa 5MB mỗi ảnh.'}
      </FormHelperText>
    </Box>
  )
}
