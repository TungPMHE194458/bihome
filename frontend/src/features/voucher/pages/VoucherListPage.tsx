import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { VoucherFormDialog } from '@/features/voucher/components/VoucherFormDialog'
import {
  APPLY_SCOPE,
  APPLY_SCOPE_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  VALIDITY,
  VALIDITY_OPTIONS,
  VOUCHER_STATUS,
  VOUCHER_STATUS_OPTIONS,
  formatDiscount,
  formatTargets,
} from '@/features/voucher/constants'
import { useChangeVoucherStatus, useDeleteVoucher, useVouchers } from '@/features/voucher/hooks'
import type { Voucher } from '@/features/voucher/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDate, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'name',
  'discountType',
  'applyScope',
  'status',
  'validity',
  'validFrom',
  'validTo',
  'createdFrom',
  'createdTo',
] as const

export function VoucherListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useVouchers(list.apiParams)
  const changeStatus = useChangeVoucherStatus()
  const remove = useDeleteVoucher()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('VOUCHER_WRITE')
  const canDelete = usePermission('VOUCHER_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<Voucher | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null)
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

  const rowActions = (v: Voucher): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: v.id }) },
          {
            label: v.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: v.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => setStatusTarget(v),
          },
        ]
      : []),
    ...(canDelete && v.usedCount === 0
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(v) }]
      : []),
  ]

  const columns: Column<Voucher>[] = [
    {
      key: 'code',
      header: 'Mã',
      sortable: true,
      filter: { type: 'text' },
      render: (v) => (
        <Typography fontWeight={700} fontFamily="monospace" color="primary.main">
          {v.code}
        </Typography>
      ),
    },
    { key: 'name', header: 'Tên', sortable: true, filter: { type: 'text' }, minWidth: 180 },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', minWidth: 140, render: (v: Voucher) => v.buildingName }] : []),
    {
      key: 'discountType',
      header: 'Mức giảm',
      sortKey: 'discountValue',
      sortable: true,
      filter: { type: 'select', options: DISCOUNT_TYPE_OPTIONS },
      render: (v) => <Box sx={{ whiteSpace: 'nowrap' }}>{formatDiscount(v)}</Box>,
    },
    {
      key: 'applyScope',
      header: 'Áp dụng cho',
      minWidth: 140,
      filter: { type: 'select', options: APPLY_SCOPE_OPTIONS },
      render: (v) => (
        <Box>
          <Typography variant="body2">{APPLY_SCOPE[v.applyScope]}</Typography>
          {formatTargets(v) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220 }} noWrap title={formatTargets(v)}>
              {formatTargets(v)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'usedCount',
      header: 'Đã dùng / Tổng',
      sortable: true,
      minWidth: 130,
      render: (v) => (
        <Box>
          <Typography variant="body2">
            {v.usedCount} / {v.totalQuantity ?? '∞'}
          </Typography>
          {v.totalQuantity != null && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (v.usedCount / v.totalQuantity) * 100)}
              color={v.soldOut ? 'error' : 'primary'}
              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
              aria-label={`Đã dùng ${v.usedCount}/${v.totalQuantity}`}
            />
          )}
        </Box>
      ),
    },
    { key: 'perApartmentLimit', header: 'Mỗi căn', align: 'right', render: (v) => v.perApartmentLimit ?? '∞' },
    {
      key: 'validTo',
      header: 'Hiệu lực',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'validFrom', toKey: 'validTo' },
      render: (v) => (
        <Box sx={{ whiteSpace: 'nowrap' }}>
          {formatDate(v.validFrom)} – {formatDate(v.validTo)}
        </Box>
      ),
    },
    {
      key: 'validity',
      header: 'Tình trạng',
      filter: { type: 'select', options: VALIDITY_OPTIONS },
      render: (v) => (
        <Stack direction="row" spacing={0.5}>
          <StatusChip {...VALIDITY[v.validity]} />
          {v.soldOut && <StatusChip label="Hết lượt" tone="warning" />}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: VOUCHER_STATUS_OPTIONS },
      render: (v) => <StatusChip {...VOUCHER_STATUS[v.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (v) => formatDateTime(v.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Voucher"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Tình trạng" value={list.filters.validity ?? ''} options={VALIDITY_OPTIONS} onChange={(v) => list.setFilter('validity', v)} />
                <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={VOUCHER_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên voucher..."
            onAdd={() => setForm({ open: true })}
            addPermission="VOUCHER_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(v) => v.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={canWrite || canDelete ? rowActions : undefined}
          emptyMessage={list.hasFilters ? 'Không có voucher phù hợp với bộ lọc' : 'Chưa có voucher nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <VoucherFormDialog open={form.open} voucherId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động voucher?' : 'Kích hoạt lại voucher?'}
        message={
          <>
            Voucher <b>{statusTarget?.code}</b> sẽ {deactivating ? 'không còn dùng được.' : 'dùng lại được trong thời gian hiệu lực.'}
          </>
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          statusTarget &&
          run(
            () => changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' }),
            deactivating ? 'Đã ngừng hoạt động voucher.' : 'Đã kích hoạt lại voucher.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá voucher?"
        message={
          <>
            Xoá vĩnh viễn voucher <b>{deleteTarget?.code}</b>. Voucher đã có lượt dùng thì chỉ chuyển được sang Ngừng hoạt động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá voucher.', () => setDeleteTarget(null))}
      />
    </>
  )
}
