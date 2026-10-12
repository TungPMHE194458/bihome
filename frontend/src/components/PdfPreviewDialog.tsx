import CloseIcon from '@mui/icons-material/Close'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { http } from '@/lib/http'

interface Props {
  /** Đường dẫn API trả PDF (vd /fee-notices/1/pdf); null = đóng. */
  path: string | null
  title: string
  fileName: string
  onClose: () => void
}

/** Xem PDF do backend sinh (tải blob kèm token), có nút tải xuống. */
export function PdfPreviewDialog({ path, title, fileName, onClose }: Props) {
  const { data: blob, isLoading, error, refetch } = useQuery({
    queryKey: ['pdf-preview', path],
    enabled: !!path,
    queryFn: () => http.get<Blob>(path!, { responseType: 'blob' }).then((r) => r.data),
    gcTime: 0,
    retry: false,
  })
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])

  const download = () => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
  }

  return (
    <Dialog open={!!path} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { height: '90vh' } } }}>
      <DialogTitle sx={{ pr: 7 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography fontWeight={700} noWrap sx={{ flex: 1 }}>
            {title}
          </Typography>
          <Button startIcon={<DownloadOutlinedIcon />} disabled={!url} onClick={download}>
            Tải PDF
          </Button>
        </Stack>
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <Box component="iframe" title={title} src={url} sx={{ width: '100%', height: '100%', border: 0 }} />
        )}
      </DialogContent>
    </Dialog>
  )
}
