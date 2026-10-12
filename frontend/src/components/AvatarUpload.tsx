import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormHelperText from '@mui/material/FormHelperText'
import Stack from '@mui/material/Stack'
import { useRef, useState } from 'react'
import { AuthAvatar } from '@/components/AuthImage'
import type { FilePurpose } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { IMAGE_MAX_BYTES, IMAGE_TYPES, uploadFile } from '@/lib/files'
import { cropToSquare } from '@/lib/image'

interface AvatarUploadProps {
  url?: string
  name: string
  onUploaded: (fileId: number, url: string) => Promise<void>
  onRemove: () => Promise<void>
  /** AVATAR (người dùng hệ thống) hoặc RESIDENT_AVATAR (cư dân). */
  purpose?: FilePurpose
  size?: number
}

/** Ảnh đại diện được cắt vuông ở giữa trước khi tải lên. */
export function AvatarUpload({ url, name, onUploaded, onRemove, purpose = 'AVATAR', size = 112 }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const handle = async (file?: File) => {
    if (!file) return
    setError(undefined)
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Chỉ nhận ảnh JPG, PNG hoặc WEBP.')
      return
    }
    if (file.size > IMAGE_MAX_BYTES * 4) {
      setError('Ảnh quá lớn.')
      return
    }
    setBusy(true)
    try {
      const square = await cropToSquare(file)
      const res = await uploadFile(square, purpose)
      await onUploaded(res.id, res.url)
    } catch (e) {
      setError(getErrorMessage(e, 'Không cập nhật được ảnh đại diện.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.5} alignItems="center">
      <Box sx={{ position: 'relative' }}>
        <AuthAvatar url={url} name={name} sx={{ width: size, height: size, fontSize: size * 0.36, bgcolor: 'primary.main' }} />
        {busy && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.6)', borderRadius: '50%' }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />} disabled={busy} onClick={() => inputRef.current?.click()}>
          Đổi ảnh
        </Button>
        {url && (
          <Button
            size="small"
            color="inherit"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onRemove()
              } catch (e) {
                setError(getErrorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            Gỡ ảnh
          </Button>
        )}
      </Stack>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={IMAGE_TYPES.join(',')}
        onChange={(e) => {
          void handle(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  )
}
