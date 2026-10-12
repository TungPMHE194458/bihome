import ApartmentIcon from '@mui/icons-material/Apartment'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip, TONES } from '@/components/StatusChip'
import { useBuildingActions } from '@/features/building/components/useBuildingActions'
import {
  BUILDING_STATUS,
  BUILDING_STATUS_OPTIONS,
  BUILDING_TYPE,
  BUILDING_TYPE_OPTIONS,
} from '@/features/building/constants'
import { useBuildingList } from '@/features/building/hooks'
import type { BuildingSummary } from '@/features/building/types'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'name',
  'location',
  'type',
  'status',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const

export function BuildingListPage() {
  const navigate = useNavigate()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useBuildingList(list.apiParams)
  const actions = useBuildingActions()
  const canWrite = usePermission('BUILDING_WRITE')
  const canDelete = usePermission('BUILDING_DELETE')

  const rowActions = (b: BuildingSummary): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/buildings/${b.id}`) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => actions.openEdit(b.id) },
          b.status === 'ACTIVE'
            ? { label: 'Ngừng hoạt động', icon: <ToggleOffOutlinedIcon fontSize="small" />, onClick: () => actions.requestStatusChange(b) }
            : { label: 'Kích hoạt', icon: <ToggleOnOutlinedIcon fontSize="small" />, onClick: () => actions.requestStatusChange(b) },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => actions.requestDelete(b) }]
      : []),
  ]

  const columns: Column<BuildingSummary>[] = [
    {
      key: 'cover',
      header: 'Ảnh',
      width: 72,
      render: (b) => (
        <AuthImage
          url={b.coverImageUrl}
          alt={b.name}
          placeholder={<ApartmentIcon fontSize="small" />}
          sx={{ width: 56, height: 36, borderRadius: 1 }}
        />
      ),
    },
    {
      key: 'code',
      header: 'Mã',
      sortable: true,
      filter: { type: 'text' },
      render: (b) => (
        <Link component={RouterLink} to={`/buildings/${b.id}`} fontWeight={600} underline="hover">
          {b.code}
        </Link>
      ),
    },
    { key: 'name', header: 'Tên', sortable: true, filter: { type: 'text' }, minWidth: 180 },
    { key: 'apartmentCount', header: 'Số lượng căn hộ', align: 'right', sortable: true },
    {
      key: 'location',
      header: 'Vị trí',
      filter: { type: 'text' },
      minWidth: 220,
      render: (b) => (
        <Typography fontSize={14} sx={{ maxWidth: 320 }} noWrap title={b.fullAddress}>
          {b.fullAddress}
        </Typography>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      filter: { type: 'select', options: BUILDING_TYPE_OPTIONS },
      render: (b) => <StatusChip {...BUILDING_TYPE[b.type]} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: BUILDING_STATUS_OPTIONS },
      render: (b) => <StatusChip {...BUILDING_STATUS[b.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (b) => formatDateTime(b.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (b) => formatDateTime(b.updatedAt),
    },
  ]

  const pagination = {
    page: list.page,
    size: list.size,
    total: data?.totalElements ?? 0,
    onPageChange: list.setPage,
    onSizeChange: list.setSize,
  }
  const emptyMessage = list.hasFilters ? 'Không có tòa nhà phù hợp với bộ lọc' : 'Chưa có tòa nhà nào'

  return (
    <>
      <ListPageLayout
        title="Danh sách tòa nhà"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            view={list.view}
            onViewChange={list.setView}
            filters={
              <>
                <ToolbarSelect label="Loại" value={list.filters.type ?? ''} options={BUILDING_TYPE_OPTIONS} onChange={(v) => list.setFilter('type', v)} />
                <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={BUILDING_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên, địa chỉ..."
            onAdd={actions.openCreate}
            addPermission="BUILDING_WRITE"
          />
        }
      >
        {list.view === 'grid' ? (
          <CardGrid
            items={data?.content ?? []}
            getId={(b) => b.id}
            getTitle={(b) => b.name}
            getSubtitle={(b) => b.code}
            getImageUrl={(b) => b.coverImageUrl}
            placeholderIcon={<ApartmentIcon />}
            renderBadge={(b) => <StatusChip {...BUILDING_TYPE[b.type]} />}
            getDetails={(b) => [
              { label: 'Địa chỉ', value: <span title={b.fullAddress}>{b.fullAddress || '—'}</span> },
              { label: 'Số tầng', value: b.floorsAbove != null ? `${b.floorsAbove} nổi${b.floorsBelow ? ` · ${b.floorsBelow} hầm` : ''}` : '—' },
              { label: 'Số căn hộ', value: b.apartmentCount },
            ]}
            renderStatus={(b) => <StatusChip {...BUILDING_STATUS[b.status]} />}
            getAccentColor={(b) => TONES[BUILDING_STATUS[b.status].tone].fg}
            actions={rowActions}
            onItemClick={(b) => navigate(`/buildings/${b.id}`)}
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
            getRowId={(b) => b.id}
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
      {actions.dialogs}
    </>
  )
}
