import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { FileIcon } from '@/components/FileIcon'
import { FormDialog } from '@/components/FormDialog'
import { FormFileUpload } from '@/components/form/FormFileUpload'
import { FormTextField } from '@/components/form/FormTextField'
import { StatusChip } from '@/components/StatusChip'
import { documentApi } from '@/features/document/api'
import { useDocumentVersions, useReplaceDocumentFile } from '@/features/document/hooks'
import type { DocumentFileVersion, DocumentItem } from '@/features/document/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatDateTime, formatFileSize } from '@/lib/format'

const schema = z
  .object({
    file: z.object({ fileId: z.number(), name: z.string(), size: z.number(), contentType: z.string() }).nullable(),
    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (!v.file) ctx.addIssue({ code: 'custom', path: ['file'], message: 'Vui lòng chọn tệp mới' })
  })
type Values = z.infer<typeof schema>

interface Props {
  document: DocumentItem | null
  onClose: () => void
}

/** Thay tệp (tệp hiện tại được lưu thành phiên bản cũ) + lịch sử phiên bản có tải xuống. */
export function ReplaceFileDialog({ document, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const replace = useReplaceDocumentFile()
  const { data: versions = [], isLoading, error: versionsError, refetch } = useDocumentVersions(document?.id)
  const { control, handleSubmit, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { file: null, note: '' },
  })

  useEffect(() => {
    if (document) reset({ file: null, note: '' })
  }, [document, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!document) return
    try {
      await replace.mutateAsync({
        id: document.id,
        body: { fileId: values.file!.fileId, note: values.note.trim() || null, version: document.version },
      })
      enqueueSnackbar(`Đã thay tệp, phiên bản hiện tại là v${document.fileVersionNo + 1}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, { fileId: 'file' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  const download = (v: DocumentFileVersion) =>
    document &&
    documentApi
      .download(document.id, v.fileName, v.id)
      .catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))

  const columns: Column<DocumentFileVersion>[] = [
    {
      key: 'versionNo',
      header: 'Phiên bản',
      render: (v) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <span>v{v.versionNo}</span>
          {v.current && <StatusChip label="Hiện tại" tone="success" />}
        </Stack>
      ),
    },
    {
      key: 'fileName',
      header: 'Tệp',
      render: (v) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <FileIcon name={v.fileName} contentType={v.contentType} size={20} />
          <Typography variant="body2" noWrap title={v.fileName} sx={{ maxWidth: 200 }}>
            {v.fileName}
          </Typography>
        </Stack>
      ),
    },
    { key: 'fileSize', header: 'Kích thước', render: (v) => formatFileSize(v.fileSize) },
    {
      key: 'uploadedAt',
      header: 'Tải lên',
      render: (v) => `${formatDateTime(v.uploadedAt)}${v.uploadedBy ? ` · ${v.uploadedBy}` : ''}`,
    },
    {
      key: 'note',
      header: 'Ghi chú khi thay',
      render: (v) =>
        v.current ? '' : (
          <Box>
            <Typography variant="body2">{v.note ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(v.replacedAt)}
              {v.replacedBy ? ` · ${v.replacedBy}` : ''}
            </Typography>
          </Box>
        ),
    },
    {
      key: 'download',
      header: '',
      width: 56,
      render: (v) => (
        <Tooltip title="Tải xuống">
          <IconButton size="small" aria-label={`Tải xuống v${v.versionNo}`} onClick={() => void download(v)}>
            <DownloadOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  return (
    <FormDialog
      open={!!document}
      title="Thay file"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Thay file"
      maxWidth="md"
    >
      <Stack spacing={2.5}>
        <Typography color="text.secondary">
          Tài liệu <b>{document?.name}</b> — tệp hiện tại (v{document?.fileVersionNo}) sẽ được lưu lại thành phiên bản cũ.
        </Typography>
        <FormFileUpload name="file" control={control} purpose="DOCUMENT" label="Tệp mới *" />
        <FormTextField name="note" control={control} label="Ghi chú thay đổi" placeholder="vd Cập nhật biểu phí 2027" />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Lịch sử phiên bản
          </Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <DataTable
              columns={columns}
              rows={versions}
              getRowId={(v) => v.versionNo}
              loading={isLoading}
              error={versionsError}
              onRetry={() => void refetch()}
              emptyMessage="Chưa có phiên bản"
            />
          </Box>
        </Box>
      </Stack>
    </FormDialog>
  )
}
