import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Link from '@mui/material/Link'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { AMENITY_STATUS, AMENITY_STATUS_OPTIONS } from '@/features/amenity/constants'
import { ServiceTypeFormDialog } from '@/features/servicecatalog/components/ServiceTypeFormDialog'
import { useChangeServiceTypeStatus, useDeleteServiceType, useServiceTypes } from '@/features/servicecatalog/hooks'
import type { ServiceType } from '@/features/servicecatalog/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const FILTER_KEYS = ['keyword', 'name', 'status', 'createdFrom', 'createdTo'] as const

/** Loại dịch vụ dùng chung cho mọi tòa. */
export function ServiceTypeListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useServiceTypes(list.apiParams)
  const changeStatus = useChangeServiceTypeStatus()
  const remove = useDeleteServiceType()
  const canWrite = usePermission('SERVICE_WRITE')
  const canDelete = usePermission('SERVICE_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<ServiceType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceType | null>(null)
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

  const rowActions = (t: ServiceType): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: t.id }) },
          {
            label: t.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: t.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => setStatusTarget(t),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(t) }]
      : []),
  ]

  const columns: Column<ServiceType>[] = [
    { key: 'name', header: 'Tên loại dịch vụ', sortable: true, filter: { type: 'text' }, render: (t) => <b>{t.name}</b> },
    { key: 'description', header: 'Mô tả', minWidth: 240, render: (t) => t.description ?? '' },
    {
      key: 'serviceCount',
      header: 'Số dịch vụ',
      align: 'right',
      sortable: true,
      render: (t) =>
        t.serviceCount > 0 ? (
          <Link component={RouterLink} to={`/services?serviceTypeId=${t.id}`} underline="hover">
            {t.serviceCount}
          </Link>
        ) : (
          0
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: AMENITY_STATUS_OPTIONS },
      render: (t) => <StatusChip {...AMENITY_STATUS[t.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (t) => formatDateTime(t.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Loại dịch vụ"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={AMENITY_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tên, mô tả..."
            onAdd={() => setForm({ open: true })}
            addPermission="SERVICE_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(t) => t.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={canWrite || canDelete ? rowActions : undefined}
          emptyMessage={list.hasFilters ? 'Không có loại dịch vụ phù hợp với bộ lọc' : 'Chưa có loại dịch vụ nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <ServiceTypeFormDialog open={form.open} typeId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động loại dịch vụ?' : 'Kích hoạt lại loại dịch vụ?'}
        message={
          deactivating ? (
            <>
              Loại <b>{statusTarget?.name}</b> sẽ không còn được chọn khi thêm dịch vụ mới; dịch vụ hiện có giữ nguyên.
            </>
          ) : (
            <>
              Loại <b>{statusTarget?.name}</b> sẽ được chọn lại được cho dịch vụ.
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
            deactivating ? 'Đã ngừng hoạt động loại dịch vụ.' : 'Đã kích hoạt lại loại dịch vụ.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá loại dịch vụ?"
        message={
          <>
            Xoá vĩnh viễn loại <b>{deleteTarget?.name}</b>. Loại đang có dịch vụ thì chỉ chuyển được sang Ngừng hoạt động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá loại dịch vụ.', () => setDeleteTarget(null))}
      />
    </>
  )
}
