import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { TicketCategoryFormDialog } from '@/features/ticket/components/TicketCategoryFormDialog'
import { CATEGORY_STATUS_OPTIONS, formatHours } from '@/features/ticket/constants'
import { useChangeTicketCategoryStatus, useDeleteTicketCategory, useTicketCategories } from '@/features/ticket/hooks'
import type { TicketCategory } from '@/features/ticket/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const FILTER_KEYS = ['keyword', 'name', 'status', 'createdFrom', 'createdTo'] as const
const STATUS = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
} as const

/** Danh mục yêu cầu & hỗ trợ dùng chung cho mọi tòa. */
export function TicketCategoryListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useTicketCategories(list.apiParams)
  const changeStatus = useChangeTicketCategoryStatus()
  const remove = useDeleteTicketCategory()
  const canWrite = usePermission('TICKET_WRITE')
  const canDelete = usePermission('TICKET_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<TicketCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TicketCategory | null>(null)
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

  const rowActions = (c: TicketCategory): RowAction[] => [
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

  const columns: Column<TicketCategory>[] = [
    { key: 'name', header: 'Tên danh mục', sortable: true, filter: { type: 'text' }, render: (c) => <b>{c.name}</b> },
    { key: 'description', header: 'Mô tả', minWidth: 200, render: (c) => c.description ?? '' },
    { key: 'responseSlaHours', header: 'SLA phản hồi', sortable: true, render: (c) => formatHours(c.responseSlaHours) },
    { key: 'resolutionSlaHours', header: 'SLA xử lý', sortable: true, render: (c) => formatHours(c.resolutionSlaHours) },
    {
      key: 'defaultAssignee',
      header: 'Người phụ trách mặc định',
      render: (c) => c.defaultAssigneeName ?? <Typography variant="body2" color="text.secondary">—</Typography>,
    },
    {
      key: 'ticketCount',
      header: 'Số yêu cầu',
      align: 'right',
      sortable: true,
      render: (c) =>
        c.ticketCount > 0 ? (
          <Link component={RouterLink} to={`/tickets?categoryId=${c.id}`} underline="hover">
            {c.ticketCount}
          </Link>
        ) : (
          0
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: CATEGORY_STATUS_OPTIONS },
      render: (c) => <StatusChip {...STATUS[c.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (c) => formatDateTime(c.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Danh mục yêu cầu & hỗ trợ"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={CATEGORY_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tên, mô tả danh mục..."
            onAdd={() => setForm({ open: true })}
            addPermission="TICKET_WRITE"
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
          emptyMessage={list.hasFilters ? 'Không có danh mục phù hợp với bộ lọc' : 'Chưa có danh mục nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <TicketCategoryFormDialog open={form.open} categoryId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động danh mục?' : 'Kích hoạt lại danh mục?'}
        message={
          deactivating ? (
            <>
              Danh mục <b>{statusTarget?.name}</b> sẽ không còn được chọn cho yêu cầu mới; yêu cầu hiện có giữ nguyên.
            </>
          ) : (
            <>
              Danh mục <b>{statusTarget?.name}</b> sẽ được chọn lại được cho yêu cầu.
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
        title="Xoá danh mục yêu cầu?"
        message={
          <>
            Xoá vĩnh viễn danh mục <b>{deleteTarget?.name}</b>. Danh mục đang có yêu cầu thì chỉ chuyển được sang Ngừng hoạt động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá danh mục.', () => setDeleteTarget(null))}
      />
    </>
  )
}
