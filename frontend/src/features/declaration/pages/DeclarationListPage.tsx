import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { DeclarationDetailDialog } from '@/features/declaration/components/DeclarationDetailDialog'
import {
  DECLARATION_STATUS,
  DECLARATION_STATUS_OPTIONS,
  DECLARATION_TYPE,
  DECLARATION_TYPE_OPTIONS,
} from '@/features/declaration/constants'
import { useDeclarations } from '@/features/declaration/hooks'
import type { Declaration } from '@/features/declaration/types'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'

const FILTER_KEYS = ['keyword', 'type', 'status', 'apartment', 'createdFrom', 'createdTo'] as const

/** Nội dung chính của phiếu: tên + SĐT (thành viên) hoặc tên xe + biển số. */
function subject(d: Declaration) {
  return d.type === 'MEMBER'
    ? { title: d.fullName, sub: d.phone }
    : { title: d.vehicleName, sub: [d.categoryName, d.plateNumber].filter(Boolean).join(' · ') }
}

/** Phiếu kê khai thành viên / xe gửi từ app cư dân. ?view=<id> (từ chuông thông báo) mở chi tiết. */
export function DeclarationListPage() {
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useDeclarations(list.apiParams)
  const location = useLocation()
  const [viewId, setViewId] = useState<number>()
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('view'))
    if (id) setViewId(id)
  }, [location.key, location.search])

  const rowActions = (d: Declaration): RowAction[] => [
    { label: d.status === 'PENDING' ? 'Xem & duyệt' : 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => setViewId(d.id) },
  ]

  const columns: Column<Declaration>[] = [
    { key: 'code', header: 'Mã', sortable: true, render: (d) => <b>{d.code}</b> },
    {
      key: 'type',
      header: 'Loại',
      filter: { type: 'select', options: DECLARATION_TYPE_OPTIONS },
      render: (d) => <StatusChip {...DECLARATION_TYPE[d.type]} />,
    },
    { key: 'apartment', header: 'Căn hộ', sortable: true, filter: { type: 'text', placeholder: 'Mã căn' }, render: (d) => d.apartmentCode },
    {
      key: 'subject',
      header: 'Nội dung kê khai',
      minWidth: 220,
      render: (d) => {
        const s = subject(d)
        return (
          <>
            {s.title}
            {s.sub && (
              <Typography variant="caption" color="text.secondary" component="div">
                {s.sub}
              </Typography>
            )}
          </>
        )
      },
    },
    { key: 'submittedBy', header: 'Người gửi', render: (d) => d.submittedByName },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: DECLARATION_STATUS_OPTIONS },
      render: (d) => <StatusChip {...DECLARATION_STATUS[d.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Gửi lúc',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (d) => formatDateTime(d.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Kê khai từ cư dân"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={DECLARATION_STATUS_OPTIONS}
                onChange={(v) => list.setFilter('status', v)} />
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, tên, SĐT, biển số..."
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(d) => d.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(d) => setViewId(d.id)}
          rowActions={rowActions}
          emptyMessage={list.hasFilters ? 'Không có phiếu phù hợp với bộ lọc' : 'Chưa có phiếu kê khai nào từ app cư dân'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <DeclarationDetailDialog id={viewId} onClose={() => setViewId(undefined)} />
    </>
  )
}
