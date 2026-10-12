import Box, { type BoxProps } from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { AuthImage } from '@/components/AuthImage'
import { FileIcon } from '@/components/FileIcon'
import type { TicketAttachment } from '@/features/ticket/types'
import { getErrorMessage } from '@/lib/apiError'
import { downloadFile } from '@/lib/files'
import { formatFileSize } from '@/lib/format'

/** Ảnh hiện thumbnail, tệp khác hiện nhãn loại tệp; bấm để tải về. */
export function AttachmentChips({ attachments, sx }: { attachments: TicketAttachment[]; sx?: BoxProps['sx'] }) {
  const { enqueueSnackbar } = useSnackbar()
  const download = (a: TicketAttachment) =>
    downloadFile(a.url, a.name).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ...sx }}>
      {attachments.map((a) =>
        a.contentType.startsWith('image/') ? (
          <ButtonBase
            key={a.id}
            title={`${a.name} — bấm để tải về`}
            aria-label={`Tải ${a.name}`}
            onClick={() => void download(a)}
            sx={{ borderRadius: 1.5, overflow: 'hidden', border: 1, borderColor: 'divider' }}
          >
            <AuthImage url={a.url} alt={a.name} sx={{ width: 96, height: 72 }} />
          </ButtonBase>
        ) : (
          <ButtonBase
            key={a.id}
            aria-label={`Tải ${a.name}`}
            onClick={() => void download(a)}
            sx={{ borderRadius: 1.5, border: 1, borderColor: 'divider', px: 1, py: 0.75, maxWidth: 240 }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <FileIcon name={a.name} contentType={a.contentType} size={20} />
              <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                <Typography variant="body2" noWrap>
                  {a.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(a.size)}
                </Typography>
              </Box>
            </Stack>
          </ButtonBase>
        ),
      )}
    </Box>
  )
}
