import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { SosDetailDialog } from '@/features/sos/components/SosDetailDialog'
import { SosFormDialog } from '@/features/sos/components/SosFormDialog'
import { SOS_STATUS, SOS_STATUS_OPTIONS, SOS_TYPE_LABEL, SOS_TYPE_OPTIONS, isOpen, sosPlace } from '@/features/sos/constants'
import { useSosAlerts } from '@/features/sos/hooks'
import type { SosAlert } from '@/features/sos/types'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'alertType', 'status', 'open', 'apartment', 'from', 'to'] as const

/** Cảnh báo khẩn cấp (SOS): danh sách, tạo tay, tiếp nhận / kết thúc. ?view=<id> mở chi tiết, ?create=1 mở form. */
export function SosAlertListPage() {
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useSosAlerts(list.apiParams)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const location = useLocation()
  const [viewId, setViewId] = useState<number>()
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const id = Number(q.get('view'))
    if (id) setViewId(id)
    if (q.get('create') === '1') setCreating(true)
  }, [location.key, location.search])

  const rowActions = (a: SosAlert): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => setViewId(a.id) },
  ]

  const columns: Column<SosAlert>[] = [
    { key: 'code', header: 'Mã', sortable: true, filter: { type: 'text' }, render: (a) => <b>{a.code}</b> },
    ...(buildingId == null ? [{ key: 'buildingName', header: 'Tòa nhà', render: (a: SosAlert) => a.buildingName }] : []),
    {
      key: 'alertType',
      header: 'Loại sự cố',
      sortable: true,
      filter: { type: 'select', options: SOS_TYPE_OPTIONS },
      render: (a) => SOS_TYPE_LABEL[a.alertType],
    },
    {
      key: 'apartment',
      header: 'Nơi xảy ra',
      filter: { type: 'text', placeholder: 'Mã căn' },
      minWidth: 200,
      render: (a) => sosPlace(a),
    },
    {
      key: 'reporterName',
      header: 'Người báo',
      render: (a) => (
        <>
          {a.reporterName}
          {a.reporterPhone && (
            <Typography variant="caption" color="text.secondary" component="div">
              {a.reporterPhone}
            </Typography>
          )}
        </>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: SOS_STATUS_OPTIONS },
      render: (a) => <StatusChip {...SOS_STATUS[a.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (a) => formatDateTime(a.createdAt),
    },
    { key: 'resolvedAt', header: 'Kết thúc', sortable: true, render: (a) => formatDateTime(a.resolvedAt) },
  ]

  return (
    <>
      <ListPageLayout
        title="Cảnh báo SOS"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Tình trạng" value={list.filters.open ?? ''} options={[{ value: 'true', label: 'Đang mở' }]}
                onChange={(v) => list.setFilter('open', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, vị trí, người báo..."
            onAdd={buildingId != null ? () => setCreating(true) : undefined}
            addLabel="Tạo cảnh báo"
            addPermission="SOS_WRITE"
          />
        }
      >
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
          onRowClick={(a) => setViewId(a.id)}
          rowActions={rowActions}
          highlightRow={(a) => isOpen(a.status)}
          emptyMessage={list.hasFilters ? 'Không có cảnh báo phù hợp với bộ lọc' : 'Chưa có cảnh báo khẩn cấp nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <SosFormDialog open={creating} onClose={() => setCreating(false)} />
      <SosDetailDialog id={viewId} onClose={() => setViewId(undefined)} />
    </>
  )
}
