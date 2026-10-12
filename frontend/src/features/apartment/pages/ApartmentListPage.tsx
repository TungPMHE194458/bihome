import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined'
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined'
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { apartmentApi } from '@/features/apartment/api'
import { apartmentCardProps } from '@/features/apartment/components/apartmentCard'
import { ApartmentImportDialog } from '@/features/apartment/components/ApartmentImportDialog'
import { useApartmentActions } from '@/features/apartment/components/useApartmentActions'
import {
  APARTMENT_STATUS,
  APARTMENT_STATUS_OPTIONS,
  APARTMENT_TYPE,
  APARTMENT_TYPE_OPTIONS,
  OWNERSHIP_TYPE,
  OWNERSHIP_TYPE_OPTIONS,
  USAGE_STATUS,
  USAGE_STATUS_OPTIONS,
} from '@/features/apartment/constants'
import { useApartmentList } from '@/features/apartment/hooks'
import type { ApartmentSummary } from '@/features/apartment/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatArea, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'name',
  'owner',
  'floorNo',
  'bedrooms',
  'rooms',
  'type',
  'ownershipType',
  'usageStatus',
  'status',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const

export function ApartmentListPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useApartmentList(list.apiParams)
  const actions = useApartmentActions()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('APARTMENT_WRITE')
  const canDelete = usePermission('APARTMENT_DELETE')
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportExcel = async () => {
    setExporting(true)
    try {
      await apartmentApi.exportExcel(list.apiParams)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const rowActions = (a: ApartmentSummary): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/apartments/${a.id}`) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => actions.openEdit(a.id) },
          {
            label: a.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
            icon: a.status === 'ACTIVE' ? <ToggleOffOutlinedIcon fontSize="small" /> : <ToggleOnOutlinedIcon fontSize="small" />,
            onClick: () => actions.requestStatusChange(a),
          },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => actions.requestDelete(a) }]
      : []),
  ]

  const columns: Column<ApartmentSummary>[] = [
    {
      key: 'cover',
      header: 'Ảnh',
      width: 72,
      render: (a) => (
        <AuthImage url={a.coverImageUrl} alt={a.name} placeholder={<HomeWorkOutlinedIcon fontSize="small" />} sx={{ width: 56, height: 36, borderRadius: 1 }} />
      ),
    },
    {
      key: 'name',
      header: 'Tên',
      sortable: true,
      filter: { type: 'text' },
      minWidth: 130,
      render: (a) => (
        <Link component={RouterLink} to={`/apartments/${a.id}`} fontWeight={600} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {a.name}
        </Link>
      ),
    },
    { key: 'code', header: 'Mã', sortable: true, filter: { type: 'text' } },
    {
      key: 'owner',
      header: 'Chủ sở hữu',
      filter: { type: 'text' },
      minWidth: 150,
      render: (a) => a.ownerName ?? '',
    },
    ...(allBuildings
      ? [{ key: 'buildingName', header: 'Tòa nhà', sortable: true, minWidth: 160, render: (a: ApartmentSummary) => a.buildingName }]
      : []),
    { key: 'floorNo', header: 'Tầng', sortable: true, filter: { type: 'text' } },
    { key: 'bedrooms', header: 'Phòng ngủ', align: 'right', filter: { type: 'text' }, render: (a) => a.bedrooms ?? '' },
    { key: 'rooms', header: 'Số phòng', align: 'right', filter: { type: 'text' }, render: (a) => a.rooms ?? '' },
    { key: 'area', header: 'Diện tích', align: 'right', sortable: true, render: (a) => formatArea(a.area) },
    { key: 'memberCount', header: 'Thành viên', align: 'right', sortable: true, render: (a) => a.memberCount },
    {
      key: 'type',
      header: 'Loại',
      filter: { type: 'select', options: APARTMENT_TYPE_OPTIONS },
      render: (a) => <StatusChip {...APARTMENT_TYPE[a.type]} />,
    },
    {
      key: 'ownershipType',
      header: 'Hình thức',
      filter: { type: 'select', options: OWNERSHIP_TYPE_OPTIONS },
      render: (a) => <StatusChip {...OWNERSHIP_TYPE[a.ownershipType]} />,
    },
    {
      key: 'usageStatus',
      header: 'Tình trạng',
      filter: { type: 'select', options: USAGE_STATUS_OPTIONS },
      render: (a) => <StatusChip {...USAGE_STATUS[a.usageStatus]} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: APARTMENT_STATUS_OPTIONS },
      render: (a) => <StatusChip {...APARTMENT_STATUS[a.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (a) => formatDateTime(a.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (a) => formatDateTime(a.updatedAt),
    },
  ]

  const pagination = {
    page: list.page,
    size: list.size,
    total: data?.totalElements ?? 0,
    onPageChange: list.setPage,
    onSizeChange: list.setSize,
  }
  const emptyMessage = list.hasFilters ? 'Không có căn hộ phù hợp với bộ lọc' : 'Chưa có căn hộ nào'

  return (
    <>
      <ListPageLayout
        title="Danh sách căn hộ"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            view={list.view}
            onViewChange={list.setView}
            filters={
              <>
                <ToolbarSelect label="Loại" value={list.filters.type ?? ''} options={APARTMENT_TYPE_OPTIONS} onChange={(v) => list.setFilter('type', v)} />
                <ToolbarSelect label="Tình trạng" value={list.filters.usageStatus ?? ''} options={USAGE_STATUS_OPTIONS} onChange={(v) => list.setFilter('usageStatus', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên căn hộ..."
            actions={
              <>
                <Can permission="APARTMENT_WRITE">
                  <Button startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)} sx={{ bgcolor: 'background.paper' }}>
                    Nhập Excel
                  </Button>
                </Can>
                <Can permission="APARTMENT_EXPORT">
                  <Button startIcon={<DownloadOutlinedIcon />} onClick={exportExcel} disabled={exporting} sx={{ bgcolor: 'background.paper' }}>
                    Xuất Excel
                  </Button>
                </Can>
              </>
            }
            onAdd={actions.openCreate}
            addPermission="APARTMENT_WRITE"
          />
        }
      >
        {list.view === 'grid' ? (
          <CardGrid
            items={data?.content ?? []}
            {...apartmentCardProps(allBuildings)}
            actions={rowActions}
            onItemClick={(a) => navigate(`/apartments/${a.id}`)}
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
      {actions.dialogs}
      <ApartmentImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
