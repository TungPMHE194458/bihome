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
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FileIcon } from '@/components/FileIcon'
import { documentApi } from '@/features/document/api'
import { canPreview } from '@/features/document/constants'
import type { DocumentItem } from '@/features/document/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatFileSize } from '@/lib/format'

interface Props {
  document: DocumentItem | null
  onClose: () => void
}

/** PDF/ảnh hiển thị trong dialog (tải blob kèm token); loại khác chỉ tải xuống. */
export function DocumentPreviewDialog({ document, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const previewable = !!document && canPreview(document.contentType)
  const { data: blob, isLoading, error, refetch } = useQuery({
    queryKey: ['document-preview', document?.id, document?.fileVersionNo],
    enabled: previewable,
    queryFn: () => documentApi.previewBlob(document!.id),
    gcTime: 0,
    retry: false,
  })
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])

  const download = () =>
    document &&
    documentApi.download(document.id, document.fileName).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))

  let body
  if (!previewable) {
    body = (
      <EmptyState
        message="Loại tệp này không xem trước được trên trình duyệt, hãy tải xuống để mở."
        action={
          <Button variant="contained" startIcon={<DownloadOutlinedIcon />} onClick={() => void download()}>
            Tải xuống
          </Button>
        }
      />
    )
  } else if (isLoading) {
    body = (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  } else if (error) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />
  } else if (document?.contentType === 'application/pdf') {
    body = <Box component="iframe" title={`Xem trước ${document.name}`} src={url} sx={{ width: '100%', height: '100%', border: 0 }} />
  } else {
    body = (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
        <Box component="img" src={url} alt={document?.name} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </Box>
    )
  }

  return (
    <Dialog open={!!document} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { height: previewable ? '90vh' : 'auto' } } }}>
      <DialogTitle sx={{ pr: 7 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {document && <FileIcon name={document.fileName} contentType={document.contentType} />}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={700} noWrap title={document?.name}>
              {document?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {document?.fileName} · {document ? formatFileSize(document.fileSize) : ''} · v{document?.fileVersionNo}
            </Typography>
          </Box>
          <Button startIcon={<DownloadOutlinedIcon />} onClick={() => void download()}>
            Tải xuống
          </Button>
        </Stack>
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 14 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: previewable ? 0 : 3 }}>
        {body}
      </DialogContent>
    </Dialog>
  )
}
