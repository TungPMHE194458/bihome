import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useMemo, useState, type ReactNode } from 'react'
import { AuthImage } from '@/components/AuthImage'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction, SelectOption } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip, TONES } from '@/components/StatusChip'
import { AMENITY_STATUS, AMENITY_STATUS_OPTIONS } from '@/features/amenity/constants'
import { ServiceFormDialog } from '@/features/servicecatalog/components/ServiceFormDialog'
import { useChangeServiceStatus, useDeleteService, useServiceTypeOptions, useServices } from '@/features/servicecatalog/hooks'
import type { Service } from '@/features/servicecatalog/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'name', 'serviceTypeId', 'status', 'createdFrom', 'createdTo'] as const

const price = (s: Service) => `${formatCurrency(s.unitPrice)} / ${s.unit}`

/** Dịch vụ của tòa nhà (danh sách + lưới ảnh). */
export function ServiceListPage({ tabs }: { tabs?: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useServices(list.apiParams)
  const { data: types = [] } = useServiceTypeOptions()
  const changeStatus = useChangeServiceStatus()
  const remove = useDeleteService()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('SERVICE_WRITE')
  const canDelete = usePermission('SERVICE_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<Service | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const deactivating = statusTarget?.status === 'ACTIVE'
  const typeOptions: SelectOption[] = useMemo(() => types.map((t) => ({ value: String(t.id), label: t.name })), [types])

  const run = async (action: () => Promise<unknown>, success: string, done: () => void) => {
    try {
      await action()
      enqueueSnackbar(success, { variant: 'success' })
      done()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const rowActions = (s: Service): RowAction[] => [
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: s.id }) },
          {
            label: s.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: s.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => setStatusTarget(s),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(s) }]
      : []),
  ]

  const columns: Column<Service>[] = [
    {
      key: 'cover',
      header: 'Ảnh',
      width: 72,
      render: (s) => (
        <AuthImage url={s.coverImageUrl} alt={s.name} placeholder={<CleaningServicesOutlinedIcon fontSize="small" />} sx={{ width: 56, height: 36, borderRadius: 1 }} />
      ),
    },
    { key: 'code', header: 'Mã', sortable: true, filter: { type: 'text' }, render: (s) => <Typography fontWeight={600} fontFamily="monospace">{s.code}</Typography> },
    { key: 'name', header: 'Tên dịch vụ', sortable: true, filter: { type: 'text' }, minWidth: 180, render: (s) => <b>{s.name}</b> },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', minWidth: 140, render: (s: Service) => s.buildingName }] : []),
    { key: 'serviceTypeId', header: 'Loại dịch vụ', filter: { type: 'select', options: typeOptions }, render: (s) => s.serviceTypeName },
    { key: 'unitPrice', header: 'Đơn giá', align: 'right', sortable: true, render: price },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: AMENITY_STATUS_OPTIONS },
      render: (s) => <StatusChip {...AMENITY_STATUS[s.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (s) => formatDateTime(s.createdAt),
    },
  ]

  const pagination = {
    page: list.page,
    size: list.size,
    total: data?.totalElements ?? 0,
    onPageChange: list.setPage,
    onSizeChange: list.setSize,
  }
  const emptyMessage = list.hasFilters ? 'Không có dịch vụ phù hợp với bộ lọc' : 'Chưa có dịch vụ nào'

  return (
    <>
      <ListPageLayout
        title="Dịch vụ"
        tabs={tabs}
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            view={list.view}
            onViewChange={list.setView}
            filters={
              <>
                <ToolbarSelect label="Loại dịch vụ" value={list.filters.serviceTypeId ?? ''} options={typeOptions} onChange={(v) => list.setFilter('serviceTypeId', v)} />
                <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={AMENITY_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên dịch vụ..."
            onAdd={() => setForm({ open: true })}
            addPermission="SERVICE_WRITE"
          />
        }
      >
        {list.view === 'grid' ? (
          <CardGrid
            items={data?.content ?? []}
            getId={(s) => s.id}
            getTitle={(s) => s.name}
            getSubtitle={(s) => (allBuildings ? `${s.code} · ${s.buildingName}` : s.code)}
            getImageUrl={(s) => s.coverImageUrl}
            placeholderIcon={<CleaningServicesOutlinedIcon />}
            renderBadge={(s) => <StatusChip label={s.serviceTypeName} tone="info" />}
            getDetails={(s) => [
              { label: 'Đơn giá', value: price(s) },
              { label: 'Mô tả', value: <span title={s.description}>{s.description || '—'}</span> },
            ]}
            renderStatus={(s) => <StatusChip {...AMENITY_STATUS[s.status]} />}
            getAccentColor={(s) => TONES[AMENITY_STATUS[s.status].tone].fg}
            actions={rowActions}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            emptyMessage={emptyMessage}
            {...pagination}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.content ?? []}
            getRowId={(s) => s.id}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            filters={list.filters}
            onFilterChange={list.setFilter}
            sort={list.sort}
            onSortChange={list.setSort}
            rowActions={canWrite || canDelete ? rowActions : undefined}
            emptyMessage={emptyMessage}
            {...pagination}
          />
        )}
      </ListPageLayout>
      <ServiceFormDialog open={form.open} serviceId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động dịch vụ?' : 'Kích hoạt lại dịch vụ?'}
        message={
          <>
            Dịch vụ <b>{statusTarget?.name}</b> sẽ {deactivating ? 'không nhận đặt mới.' : 'nhận đặt trở lại.'}
          </>
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          statusTarget &&
          run(
            () => changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' }),
            deactivating ? 'Đã ngừng hoạt động dịch vụ.' : 'Đã kích hoạt lại dịch vụ.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá dịch vụ?"
        message={
          <>
            Xoá vĩnh viễn dịch vụ <b>{deleteTarget?.name}</b>. Dịch vụ đang được dùng thì hãy chuyển sang Ngừng hoạt động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá dịch vụ.', () => setDeleteTarget(null))}
      />
    </>
  )
}
