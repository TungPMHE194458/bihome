import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useMemo, useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { ItemFormDialog } from '@/features/asset/components/ItemFormDialog'
import { ASSET_STATUS, ASSET_STATUS_OPTIONS } from '@/features/asset/constants'
import { useAllCategoryNames, useAssetItems, useCategoryOptions, useDeleteItem, useItemStatus } from '@/features/asset/hooks'
import type { AssetItem } from '@/features/asset/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDate, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'apartment',
  'name',
  'plateNumber',
  'accessCardNo',
  'categoryId',
  'categoryName',
  'status',
  'entryFrom',
  'entryTo',
  'createdFrom',
  'createdTo',
] as const

export function AssetItemTab({ tabs }: { tabs: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useAssetItems(list.apiParams)
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId)
  // Lọc danh mục chỉ có nghĩa trong một tòa (danh mục riêng từng tòa).
  const { data: categories = [] } = useCategoryOptions(selectedBuildingId)
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.id.toString(), label: c.name })), [categories])
  // "Tất cả" tòa: mỗi tòa có danh mục riêng → lọc theo tên danh mục.
  const { data: categoryNames = [] } = useAllCategoryNames(selectedBuildingId == null)
  const categoryNameOptions = useMemo(() => categoryNames.map((n) => ({ value: n, label: n })), [categoryNames])
  const canWrite = usePermission('ASSET_WRITE')
  const canDelete = usePermission('ASSET_DELETE')
  const changeStatus = useItemStatus()
  const remove = useDeleteItem()
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<AssetItem | null>(null)

  const toggleStatus = async (i: AssetItem) => {
    try {
      await changeStatus.mutateAsync({ id: i.id, status: i.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      enqueueSnackbar(i.status === 'ACTIVE' ? 'Đã ngừng hoạt động hạng mục.' : 'Đã kích hoạt lại hạng mục.', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      enqueueSnackbar('Đã xoá hạng mục.', { variant: 'success' })
      setDeleteTarget(null)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const rowActions = (i: AssetItem): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: i.id }) },
          {
            label: i.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: i.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => void toggleStatus(i),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(i) }]
      : []),
  ]

  const columns: Column<AssetItem>[] = [
    {
      key: 'apartment',
      header: 'Căn hộ',
      sortable: true,
      filter: { type: 'text' },
      minWidth: 150,
      render: (i) => (
        <Box>
          <Link component={RouterLink} to={`/apartments/${i.apartmentId}`} fontWeight={600} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
            {i.apartmentName}
          </Link>
          {selectedBuildingId == null && (
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              {i.buildingName}
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'name', header: 'Tên', sortable: true, filter: { type: 'text' }, minWidth: 160 },
    {
      key: 'plateNumber',
      header: 'Số hiệu',
      sortable: true,
      filter: { type: 'text' },
      render: (i) => (
        <Typography fontSize={14} fontFamily="monospace" sx={{ whiteSpace: 'nowrap' }}>
          {i.plateNumber ?? ''}
        </Typography>
      ),
    },
    {
      key: 'accessCardNo',
      header: 'Mã thẻ từ',
      filter: { type: 'text' },
      render: (i) =>
        i.accessCardNo ? (
          <Link component={RouterLink} to={`/access-cards?cardNo=${encodeURIComponent(i.accessCardNo)}`} underline="hover" sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {i.accessCardNo}
          </Link>
        ) : (
          ''
        ),
    },
    selectedBuildingId != null
      ? { key: 'categoryId', header: 'Danh mục', filter: { type: 'select', options: categoryOptions }, render: (i) => i.categoryName }
      : { key: 'categoryName', header: 'Danh mục', filter: { type: 'select', options: categoryNameOptions }, render: (i) => i.categoryName },
    { key: 'unit', header: 'Đơn vị' },
    {
      key: 'entryDate',
      header: 'Ngày vào',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'entryFrom', toKey: 'entryTo' },
      render: (i) => formatDate(i.entryDate),
    },
    { key: 'exitDate', header: 'Ngày ra', sortable: true, render: (i) => formatDate(i.exitDate) },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: ASSET_STATUS_OPTIONS },
      render: (i) => <StatusChip {...ASSET_STATUS[i.status]} />,
    },
    { key: 'createdAt', header: 'Ngày tạo', sortable: true, render: (i) => formatDateTime(i.createdAt) },
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
            searchPlaceholder="Tìm tên, biển số, căn hộ..."
            onAdd={() => setForm({ open: true })}
            addPermission="ASSET_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(i) => i.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={canWrite || canDelete ? rowActions : undefined}
          emptyMessage={list.hasFilters ? 'Không có hạng mục phù hợp với bộ lọc' : 'Chưa có hạng mục nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <ItemFormDialog open={form.open} itemId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá hạng mục?"
        message={
          <>
            Xoá hạng mục <b>{deleteTarget?.name}</b> của căn <b>{deleteTarget?.apartmentName}</b>. Nếu xe đã rời đi, nên nhập{' '}
            <b>Ngày ra</b> thay vì xoá để giữ lịch sử.
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
