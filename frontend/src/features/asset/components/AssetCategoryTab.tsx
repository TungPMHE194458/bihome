import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import { useSnackbar } from 'notistack'
import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { CategoryFormDialog } from '@/features/asset/components/CategoryFormDialog'
import { ASSET_STATUS, ASSET_STATUS_OPTIONS } from '@/features/asset/constants'
import { useAssetCategories, useCategoryStatus, useDeleteCategory } from '@/features/asset/hooks'
import type { AssetCategory } from '@/features/asset/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'name', 'unit', 'status', 'createdFrom', 'createdTo', 'updatedFrom', 'updatedTo'] as const

export function AssetCategoryTab({ tabs }: { tabs: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useAssetCategories(list.apiParams)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('ASSET_WRITE')
  const canDelete = usePermission('ASSET_DELETE')
  const changeStatus = useCategoryStatus()
  const remove = useDeleteCategory()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<AssetCategory | null>(null)

  const toggleStatus = async (c: AssetCategory) => {
    try {
      await changeStatus.mutateAsync({ id: c.id, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      enqueueSnackbar(c.status === 'ACTIVE' ? 'Đã ngừng hoạt động danh mục.' : 'Đã kích hoạt lại danh mục.', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      enqueueSnackbar('Đã xoá danh mục.', { variant: 'success' })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteTarget(null)
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const rowActions = (c: AssetCategory): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: c.id }) },
          {
            label: c.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: c.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => void toggleStatus(c),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(c) }]
      : []),
  ]

  const columns: Column<AssetCategory>[] = [
    { key: 'name', header: 'Tên', sortable: true, filter: { type: 'text' }, minWidth: 160 },
    { key: 'description', header: 'Mô tả', minWidth: 200, render: (c) => c.description ?? '' },
    { key: 'unit', header: 'Đơn vị', sortable: true, filter: { type: 'text' } },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (c: AssetCategory) => c.buildingName }] : []),
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: ASSET_STATUS_OPTIONS },
      render: (c) => <StatusChip {...ASSET_STATUS[c.status]} />,
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
        title="Hạng mục căn hộ"
        tabs={tabs}
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={ASSET_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm danh mục..."
            onAdd={() => setForm({ open: true })}
            addPermission="ASSET_WRITE"
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
      <CategoryFormDialog open={form.open} categoryId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá danh mục?"
        message={
          <>
            Xoá danh mục <b>{deleteTarget?.name}</b>. Danh mục đang có hạng mục thì không xoá được, hãy chuyển sang{' '}
            <b>Ngừng hoạt động</b>.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
