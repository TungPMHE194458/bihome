import AddHomeOutlinedIcon from '@mui/icons-material/AddHomeOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { AuthAvatar } from '@/components/AuthImage'
import { Can } from '@/components/Can'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ImportExcelDialog } from '@/components/ImportExcelDialog'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip, TONES } from '@/components/StatusChip'
import { residentApi } from '@/features/resident/api'
import { useResidentActions } from '@/features/resident/components/useResidentActions'
import {
  APP_ACCOUNT_OPTIONS,
  APP_ACCOUNT_STATUS,
  ID_TYPE,
  RESIDENCE_STATUS,
  RESIDENCE_STATUS_OPTIONS,
  RESIDENT_ROLE,
  RESIDENT_ROLE_OPTIONS,
  TEMP_RESIDENCE_OPTIONS,
} from '@/features/resident/constants'
import { useImportResidents, useResidentList } from '@/features/resident/hooks'
import type { ResidentSummary } from '@/features/resident/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = [
  'keyword',
  'code',
  'fullName',
  'phone',
  'email',
  'apartment',
  'role',
  'residenceStatus',
  'tempResidenceRegistered',
  'appAccountStatus',
  'createdFrom',
  'createdTo',
  'updatedFrom',
  'updatedTo',
] as const

/** Căn hộ đang ở: mã căn, ngôi sao = chủ hộ chính. */
function ApartmentCodes({ resident }: { resident: ResidentSummary }) {
  if (resident.apartments.length === 0) return <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {resident.apartments.map((a) => (
        <Tooltip key={a.id} title={`${a.apartmentName} · ${RESIDENT_ROLE[a.role].label}${a.householdHead ? ' · Chủ hộ chính' : ''}`}>
          <Link component={RouterLink} to={`/apartments/${a.apartmentId}?tab=residents`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {a.apartmentCode}
            {a.householdHead && <StarRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
          </Link>
        </Tooltip>
      ))}
    </Stack>
  )
}

export function ResidentListPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useResidentList(list.apiParams)
  const actions = useResidentActions({ onCreated: (r) => navigate(`/residents/${r.id}`) })
  const importer = useImportResidents()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('RESIDENT_WRITE')
  const canDelete = usePermission('RESIDENT_DELETE')
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportExcel = async () => {
    setExporting(true)
    try {
      await residentApi.exportExcel(list.apiParams)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const rowActions = (r: ResidentSummary): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/residents/${r.id}`) },
    ...(canWrite
      ? [
          { label: 'Chỉnh sửa', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => actions.openEdit(r.id) },
          { label: 'Gán căn hộ', icon: <AddHomeOutlinedIcon fontSize="small" />, onClick: () => actions.openAssign(r) },
          {
            label: 'Chuyển đi',
            icon: <LogoutOutlinedIcon fontSize="small" />,
            disabled: r.apartments.length === 0,
            onClick: () => actions.requestMoveOut(r),
          },
          // Tài khoản app cư dân làm cùng app cư dân (giai đoạn sau).
          { label: 'Tạo tài khoản app (sắp có)', icon: <PhoneIphoneOutlinedIcon fontSize="small" />, disabled: true, onClick: () => undefined },
        ]
      : []),
    ...(canDelete
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => actions.requestDelete(r) }]
      : []),
  ]

  const columns: Column<ResidentSummary>[] = [
    {
      key: 'avatar',
      header: 'Ảnh',
      width: 64,
      render: (r) => <AuthAvatar url={r.avatarUrl} name={r.fullName} sx={{ width: 36, height: 36, fontSize: 14 }} />,
    },
    {
      key: 'fullName',
      header: 'Họ và tên',
      sortable: true,
      filter: { type: 'text' },
      minWidth: 170,
      render: (r) => (
        <Link component={RouterLink} to={`/residents/${r.id}`} fontWeight={600} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {r.fullName}
        </Link>
      ),
    },
    { key: 'code', header: 'Mã cư dân', sortable: true, filter: { type: 'text' } },
    { key: 'phone', header: 'Số điện thoại', filter: { type: 'text' }, render: (r) => <Box sx={{ whiteSpace: 'nowrap' }}>{r.phone}</Box> },
    { key: 'email', header: 'Email', filter: { type: 'text' }, render: (r) => r.email ?? '' },
    ...(allBuildings
      ? [{ key: 'buildingName', header: 'Tòa nhà', sortable: true, minWidth: 150, render: (r: ResidentSummary) => r.buildingName }]
      : []),
    { key: 'apartment', header: 'Căn hộ', filter: { type: 'text' }, minWidth: 110, render: (r) => <ApartmentCodes resident={r} /> },
    {
      key: 'role',
      header: 'Vai trò',
      filter: { type: 'select', options: RESIDENT_ROLE_OPTIONS },
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          {[...new Set(r.apartments.map((a) => a.role))].map((role) => (
            <StatusChip key={role} {...RESIDENT_ROLE[role]} />
          ))}
        </Stack>
      ),
    },
    {
      key: 'idNumber',
      header: 'Giấy tờ',
      render: (r) =>
        r.idNumberMasked ? (
          <Box sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {r.idType ? `${ID_TYPE[r.idType]} ` : ''}
            {r.idNumberMasked}
          </Box>
        ) : (
          ''
        ),
    },
    {
      key: 'residenceStatus',
      header: 'Tình trạng',
      filter: { type: 'select', options: RESIDENCE_STATUS_OPTIONS },
      render: (r) => <StatusChip {...RESIDENCE_STATUS[r.residenceStatus]} />,
    },
    {
      key: 'tempResidenceRegistered',
      header: 'Tạm trú',
      filter: { type: 'select', options: TEMP_RESIDENCE_OPTIONS },
      render: (r) => (r.tempResidenceRegistered ? 'Có' : 'Chưa'),
    },
    {
      key: 'appAccountStatus',
      header: 'Tài khoản app',
      filter: { type: 'select', options: APP_ACCOUNT_OPTIONS },
      render: (r) => <StatusChip {...APP_ACCOUNT_STATUS[r.appAccountStatus]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'updatedFrom', toKey: 'updatedTo' },
      render: (r) => formatDateTime(r.updatedAt),
    },
  ]

  const pagination = {
    page: list.page,
    size: list.size,
    total: data?.totalElements ?? 0,
    onPageChange: list.setPage,
    onSizeChange: list.setSize,
  }
  const emptyMessage = list.hasFilters ? 'Không có cư dân phù hợp với bộ lọc' : 'Chưa có cư dân nào'

  return (
    <>
      <ListPageLayout
        title="Danh sách cư dân"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            view={list.view}
            onViewChange={list.setView}
            filters={
              <>
                <ToolbarSelect
                  label="Tình trạng"
                  value={list.filters.residenceStatus ?? ''}
                  options={RESIDENCE_STATUS_OPTIONS}
                  onChange={(v) => list.setFilter('residenceStatus', v)}
                />
                <ToolbarSelect label="Vai trò" value={list.filters.role ?? ''} options={RESIDENT_ROLE_OPTIONS} onChange={(v) => list.setFilter('role', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm tên, mã, số điện thoại, email..."
            actions={
              <>
                <Can permission="RESIDENT_WRITE">
                  <Button startIcon={<UploadFileOutlinedIcon />} onClick={() => setImportOpen(true)} sx={{ bgcolor: 'background.paper' }}>
                    Nhập Excel
                  </Button>
                </Can>
                <Can permission="RESIDENT_EXPORT">
                  <Button startIcon={<DownloadOutlinedIcon />} onClick={exportExcel} disabled={exporting} sx={{ bgcolor: 'background.paper' }}>
                    Xuất Excel
                  </Button>
                </Can>
              </>
            }
            onAdd={() => actions.openCreate()}
            addPermission="RESIDENT_WRITE"
          />
        }
      >
        {list.view === 'grid' ? (
          <CardGrid
            items={data?.content ?? []}
            getId={(r) => r.id}
            getTitle={(r) => r.fullName}
            getSubtitle={(r) => (allBuildings ? `${r.code} · ${r.buildingName}` : r.code)}
            renderMedia={(r) => (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2.5, pb: 0.5 }}>
                <AuthAvatar url={r.avatarUrl} name={r.fullName} sx={{ width: 88, height: 88, fontSize: 32, bgcolor: 'primary.main' }} />
              </Box>
            )}
            getDetails={(r) => [
              { label: 'SĐT', value: r.phone },
              { label: 'Căn hộ', value: r.apartments.map((a) => a.apartmentCode).join(', ') || '—' },
              { label: 'Vai trò', value: [...new Set(r.apartments.map((a) => RESIDENT_ROLE[a.role].label))].join(', ') || '—' },
            ]}
            renderStatus={(r) => <StatusChip {...RESIDENCE_STATUS[r.residenceStatus]} />}
            getAccentColor={(r) => TONES[RESIDENCE_STATUS[r.residenceStatus].tone].fg}
            actions={rowActions}
            onItemClick={(r) => navigate(`/residents/${r.id}`)}
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
            getRowId={(r) => r.id}
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
      <ImportExcelDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityLabel="cư dân"
        keyHeader="Họ và tên"
        onDownloadTemplate={residentApi.downloadTemplate}
        onImport={(file, stopOnError) => importer.mutateAsync({ file, stopOnError })}
        pending={importer.isPending}
      />
    </>
  )
}
