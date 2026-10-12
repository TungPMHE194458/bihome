import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FindReplaceOutlinedIcon from '@mui/icons-material/FindReplaceOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { FileIcon } from '@/components/FileIcon'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { documentApi } from '@/features/document/api'
import { DocumentFormDialog } from '@/features/document/components/DocumentFormDialog'
import { DocumentPreviewDialog } from '@/features/document/components/DocumentPreviewDialog'
import { ReplaceFileDialog } from '@/features/document/components/ReplaceFileDialog'
import { AUDIENCE, AUDIENCE_OPTIONS } from '@/features/document/constants'
import { useDeleteDocument, useDocumentCategoryOptions, useDocuments } from '@/features/document/hooks'
import type { DocumentItem } from '@/features/document/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime, formatFileSize } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'name',
  'tag',
  'categoryId',
  'description',
  'audience',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const

export function DocumentListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useDocuments(list.apiParams)
  const { data: categories = [] } = useDocumentCategoryOptions()
  const remove = useDeleteDocument()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('DOCUMENT_WRITE')
  const canDelete = usePermission('DOCUMENT_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [preview, setPreview] = useState<DocumentItem | null>(null)
  const [replace, setReplace] = useState<DocumentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null)

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id.toString(), label: c.name })), [categories])

  const download = (d: DocumentItem) =>
    documentApi.download(d.id, d.fileName).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))

  const rowActions = (d: DocumentItem): RowAction[] => [
    { label: 'Xem trước', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => setPreview(d) },
    { label: 'Tải xuống', icon: <DownloadOutlinedIcon fontSize="small" />, onClick: () => void download(d) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: d.id }) },
          { label: 'Thay file', icon: <FindReplaceOutlinedIcon fontSize="small" />, onClick: () => setReplace(d) },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(d) }]
      : []),
  ]

  const columns: Column<DocumentItem>[] = [
    {
      key: 'code',
      header: 'Mã',
      sortable: true,
      filter: { type: 'text' },
      render: (d) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <FileIcon name={d.fileName} contentType={d.contentType} />
          <Link component="button" type="button" fontWeight={600} underline="hover" onClick={() => setPreview(d)} sx={{ whiteSpace: 'nowrap' }}>
            {d.code}
          </Link>
        </Stack>
      ),
    },
    {
      key: 'name',
      header: 'Tên tài liệu',
      sortable: true,
      filter: { type: 'text' },
      minWidth: 200,
      render: (d) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {d.name}
          </Typography>
          {d.fileVersionNo > 1 && (
            <Typography variant="caption" color="text.secondary">
              Phiên bản {d.fileVersionNo}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'tag',
      header: 'Thẻ',
      filter: { type: 'text' },
      minWidth: 140,
      render: (d) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {d.tags.map((t) => (
            <StatusChip key={t} label={t} tone="neutral" />
          ))}
        </Stack>
      ),
    },
    {
      key: 'categoryId',
      header: 'Danh mục',
      sortKey: 'categoryName',
      sortable: true,
      filter: { type: 'select', options: categoryOptions },
      render: (d) => <StatusChip label={d.categoryName} color={d.categoryColor} />,
    },
    ...(allBuildings
      ? [{ key: 'buildingName', header: 'Tòa nhà', sortable: true, minWidth: 150, render: (d: DocumentItem) => d.buildingName }]
      : []),
    { key: 'fileSize', header: 'Kích thước', align: 'right', sortable: true, render: (d) => formatFileSize(d.fileSize) },
    {
      key: 'description',
      header: 'Mô tả',
      filter: { type: 'text' },
      minWidth: 180,
      render: (d) => (
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {d.description ?? ''}
        </Typography>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (d) => formatDateTime(d.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (d) => formatDateTime(d.updatedAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Danh sách tài liệu"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect
                label="Đối tượng"
                value={list.filters.audience ?? ''}
                options={AUDIENCE_OPTIONS}
                onChange={(v) => list.setFilter('audience', v)}
              />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên, mô tả tài liệu..."
            onAdd={() => setForm({ open: true })}
            addPermission="DOCUMENT_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(d) => d.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={rowActions}
          emptyMessage={list.hasFilters ? 'Không có tài liệu phù hợp với bộ lọc' : 'Chưa có tài liệu nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <DocumentFormDialog open={form.open} documentId={form.id} onClose={() => setForm({ open: false })} />
      <DocumentPreviewDialog document={preview} onClose={() => setPreview(null)} />
      <ReplaceFileDialog document={replace} onClose={() => setReplace(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá tài liệu?"
        message={
          <>
            Xoá vĩnh viễn tài liệu <b>{deleteTarget?.name}</b> ({deleteTarget ? AUDIENCE[deleteTarget.audience] : ''}) cùng
            tất cả phiên bản tệp đã lưu.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove.mutateAsync(deleteTarget.id)
            enqueueSnackbar('Đã xoá tài liệu.', { variant: 'success' })
            setDeleteTarget(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )
}
