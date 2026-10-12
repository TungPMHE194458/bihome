import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PoolOutlinedIcon from '@mui/icons-material/PoolOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip, TONES } from '@/components/StatusChip'
import { AmenityFormDialog } from '@/features/amenity/components/AmenityFormDialog'
import { AMENITY_STATUS, AMENITY_STATUS_OPTIONS, APPROVAL_OPTIONS } from '@/features/amenity/constants'
import { useAmenities, useChangeAmenityStatus, useDeleteAmenity } from '@/features/amenity/hooks'
import type { Amenity } from '@/features/amenity/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'name', 'location', 'requiresApproval', 'status', 'createdFrom', 'createdTo'] as const

/** Danh mục tiện ích (danh sách + lưới ảnh). */
export function AmenityListPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useAmenities(list.apiParams)
  const changeStatus = useChangeAmenityStatus()
  const remove = useDeleteAmenity()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('AMENITY_WRITE')
  const canDelete = usePermission('AMENITY_DELETE')
  const [form, setForm] = useState<{ open: boolean; id?: number }>({ open: false })
  const [statusTarget, setStatusTarget] = useState<Amenity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Amenity | null>(null)
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

  const rowActions = (a: Amenity): RowAction[] => [
    { label: 'Cấu hình khung giờ & giá', icon: <ScheduleOutlinedIcon fontSize="small" />, onClick: () => navigate(`/amenity-configs?amenityId=${a.id}`) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => setForm({ open: true, id: a.id }) },
          {
            label: a.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: a.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => setStatusTarget(a),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setDeleteTarget(a) }]
      : []),
  ]

  const slotInfo = (a: Amenity) =>
    a.slotCount > 0 ? (
      `${a.slotCount} khung giờ`
    ) : (
      <Link component={RouterLink} to={`/amenity-configs?amenityId=${a.id}`} underline="hover" color="warning.main">
        Chưa cấu hình
      </Link>
    )

  const columns: Column<Amenity>[] = [
    {
      key: 'cover',
      header: 'Ảnh',
      width: 72,
      render: (a) => <AuthImage url={a.coverImageUrl} alt={a.name} placeholder={<PoolOutlinedIcon fontSize="small" />} sx={{ width: 56, height: 36, borderRadius: 1 }} />,
    },
    { key: 'code', header: 'Mã', sortable: true, filter: { type: 'text' }, render: (a) => <Typography fontWeight={600} fontFamily="monospace">{a.code}</Typography> },
    { key: 'name', header: 'Tên', sortable: true, filter: { type: 'text' }, minWidth: 150, render: (a) => <b>{a.name}</b> },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', minWidth: 140, render: (a: Amenity) => a.buildingName }] : []),
    { key: 'location', header: 'Vị trí', filter: { type: 'text' }, render: (a) => a.location ?? '' },
    { key: 'capacity', header: 'Sức chứa', align: 'right', sortable: true, render: (a) => `${a.capacity} người` },
    { key: 'hours', header: 'Giờ mở cửa', render: (a) => `${a.openTime}–${a.closeTime}` },
    { key: 'slotCount', header: 'Khung giờ', sortable: true, render: slotInfo },
    {
      key: 'requiresApproval',
      header: 'Duyệt đăng ký',
      filter: { type: 'select', options: APPROVAL_OPTIONS },
      render: (a) => <StatusChip label={a.requiresApproval ? 'Cần duyệt' : 'Tự duyệt'} tone={a.requiresApproval ? 'warning' : 'neutral'} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: AMENITY_STATUS_OPTIONS },
      render: (a) => <StatusChip {...AMENITY_STATUS[a.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (a) => formatDateTime(a.createdAt),
    },
  ]

  const pagination = {
    page: list.page,
    size: list.size,
    total: data?.totalElements ?? 0,
    onPageChange: list.setPage,
    onSizeChange: list.setSize,
  }
  const emptyMessage = list.hasFilters ? 'Không có tiện ích phù hợp với bộ lọc' : 'Chưa có tiện ích nào'

  return (
    <>
      <ListPageLayout
        title="Danh mục tiện ích"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            view={list.view}
            onViewChange={list.setView}
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={AMENITY_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên, vị trí..."
            onAdd={() => setForm({ open: true })}
            addPermission="AMENITY_WRITE"
          />
        }
      >
        {list.view === 'grid' ? (
          <CardGrid
            items={data?.content ?? []}
            getId={(a) => a.id}
            getTitle={(a) => a.name}
            getSubtitle={(a) => (allBuildings ? `${a.code} · ${a.buildingName}` : a.code)}
            getImageUrl={(a) => a.coverImageUrl}
            placeholderIcon={<PoolOutlinedIcon />}
            renderBadge={(a) => <StatusChip label={a.requiresApproval ? 'Cần duyệt' : 'Tự duyệt'} tone={a.requiresApproval ? 'warning' : 'neutral'} />}
            getDetails={(a) => [
              { label: 'Vị trí', value: a.location || '—' },
              { label: 'Giờ mở cửa', value: `${a.openTime}–${a.closeTime}` },
              { label: 'Sức chứa', value: `${a.capacity} người` },
              { label: 'Khung giờ', value: slotInfo(a) },
            ]}
            renderStatus={(a) => <StatusChip {...AMENITY_STATUS[a.status]} />}
            getAccentColor={(a) => TONES[AMENITY_STATUS[a.status].tone].fg}
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
            getRowId={(a) => a.id}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            filters={list.filters}
            onFilterChange={list.setFilter}
            sort={list.sort}
            onSortChange={list.setSort}
            rowActions={rowActions}
            emptyMessage={emptyMessage}
            {...pagination}
          />
        )}
      </ListPageLayout>
      <AmenityFormDialog open={form.open} amenityId={form.id} onClose={() => setForm({ open: false })} />
      <ConfirmDialog
        open={!!statusTarget}
        title={deactivating ? 'Ngừng hoạt động tiện ích?' : 'Kích hoạt lại tiện ích?'}
        message={
          <>
            Tiện ích <b>{statusTarget?.name}</b> sẽ {deactivating ? 'không nhận đăng ký mới.' : 'nhận đăng ký trở lại.'}
          </>
        }
        confirmLabel={deactivating ? 'Ngừng hoạt động' : 'Kích hoạt'}
        loading={changeStatus.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() =>
          statusTarget &&
          run(
            () => changeStatus.mutateAsync({ id: statusTarget.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' }),
            deactivating ? 'Đã ngừng hoạt động tiện ích.' : 'Đã kích hoạt lại tiện ích.',
            () => setStatusTarget(null),
          )
        }
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xoá tiện ích?"
        message={
          <>
            Xoá vĩnh viễn tiện ích <b>{deleteTarget?.name}</b> cùng cấu hình khung giờ, giá. Tiện ích đang được dùng thì hãy chuyển
            sang Ngừng hoạt động.
          </>
        }
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && run(() => remove.mutateAsync(deleteTarget.id), 'Đã xoá tiện ích.', () => setDeleteTarget(null))}
      />
    </>
  )
}
