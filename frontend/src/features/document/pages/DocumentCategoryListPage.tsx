import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Link from '@mui/material/Link'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { DocumentCategoryFormDialog } from '@/features/document/components/DocumentCategoryFormDialog'
import { CATEGORY_STATUS, CATEGORY_STATUS_OPTIONS } from '@/features/document/constants'
import {
  useChangeDocumentCategoryStatus,
  useDeleteDocumentCategory,
  useDocumentCategories,
} from '@/features/document/hooks'
import type { DocumentCategory } from '@/features/document/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const FILTER_KEYS = ['keyword', 'name', 'description', 'status', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'] as const

/** Danh mục tài liệu dùng chung cho mọi tòa (không lọc theo tòa đang chọn). */
export function DocumentCategoryListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useDocumentCategories(list.apiParams)
  const changeStatus = useChangeDocumentCategoryStatus()
  const remove = useDeleteDocumentCategory()
  const canWrite = usePermission('DOCUMENT_WRITE')
  const canDelete = usePermission('DOCUMENT_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<DocumentCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentCategory | null>(null)
  const deactivating = statusTarget?.status === 'ACTIVE'

  const run = async (action: () => Promise<unknown>, success: string, done: () => void) => {
    try {
      await action()
      enqueueSnackbar(success, { variant: 'success' })
      done()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const rowActions = (c: DocumentCategory): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: c.id }) },
          {
            label: c.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: c.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => setStatusTarget(c),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(c) }]
      : []),
  ]

  const columns: Column<DocumentCategory>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      sortable: true,
      filter: { type: 'text' },
      render: (c) => <StatusChip label={c.name} color={c.color} />,
    },
    { key: 'description', header: 'Mô tả', filter: { type: 'text' }, render: (c) => c.description ?? '' },
    {
      key: 'documentCount',
      header: 'Số tài liệu',
      align: 'right',
      sortable: true,
      render: (c) =>
        c.documentCount > 0 ? (
          <Link component={RouterLink} to={`/documents?categoryId=${c.id}`} underline="hover">
            {c.documentCount}
          </Link>
        ) : (
          0
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: CATEGORY_STATUS_OPTIONS },
      render: (c) => <StatusChip {...CATEGORY_STATUS[c.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (c) => formatDateTime(c.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (c) => formatDateTime(c.updatedAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Danh mục tài liệu"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect
                label="Trạng thái"
                value={list.filters.status ?? ''}
                options={CATEGORY_STATUS_OPTIONS}
                onChange={(v) => list.setFilter('status', v)}
              />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tên, mô tả danh mục..."
            onAdd={() => setForm({ open: true })}
            addPermission="DOCUMENT_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(c) => c.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={canWrite || canDelete ? rowActions : undefined}
          emptyMessage={list.hasFilters ? 'Không có danh mục phù hợp với bộ lọc' : 'Chưa có danh mục tài liệu nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <DocumentCategoryFormDialog open={form.open} categoryId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động danh mục?' : 'Kích hoạt lại danh mục?'}
        message={
          deactivating ? (
            <>
              Danh mục <b>{statusTarget?.name}</b> sẽ không còn được chọn cho tài liệu mới; tài liệu hiện có giữ nguyên.
            </>
          ) : (
            <>
              Danh mục <b>{statusTarget?.name}</b> sẽ được chọn lại được cho tài liệu.
            </>
          )
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          statusTarget &&
          run(
            () => changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' }),
            deactivating ? 'Đã ngừng hoạt động danh mục.' : 'Đã kích hoạt lại danh mục.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá danh mục tài liệu?"
        message={
          <>
            Xoá vĩnh viễn danh mục <b>{deleteTarget?.name}</b>. Danh mục đang có tài liệu thì chỉ chuyển được sang Ngừng hoạt
            động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá danh mục.', () => setDeleteTarget(null))
        }
      />
    </>
  )
}
