import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Can } from '@/components/Can'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { transactionApi } from '@/features/transaction/api'
import {
  METHOD_OPTIONS,
  PAYMENT_METHOD,
  SOURCE_OPTIONS,
  TRANSACTION_SOURCE,
  TRANSACTION_STATUS,
  TRANSACTION_STATUS_OPTIONS,
} from '@/features/transaction/constants'
import type { Transaction } from '@/features/transaction/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'sourceType', 'sourceCode', 'apartment', 'method', 'status', 'from', 'to'] as const

/** Lịch sử giao dịch: chỉ đọc + xuất Excel. Thanh toán ghi nhận ở đăng ký tiện ích / đơn dịch vụ. */
export function TransactionListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', buildingId, list.apiParams],
    queryFn: () => transactionApi.list(list.apiParams),
    placeholderData: keepPreviousData,
  })
  const [exporting, setExporting] = useState(false)

  const exportExcel = async () => {
    setExporting(true)
    try {
      await transactionApi.exportExcel(list.apiParams)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<Transaction>[] = [
    { key: 'code', header: 'Mã giao dịch', sortable: true, filter: { type: 'text' }, render: (t) => <Typography fontWeight={600} fontSize={14}>{t.code}</Typography> },
    {
      key: 'sourceType',
      header: 'Loại nguồn',
      filter: { type: 'select', options: SOURCE_OPTIONS },
      render: (t) => TRANSACTION_SOURCE[t.sourceType],
    },
    { key: 'sourceCode', header: 'Mã tham chiếu', filter: { type: 'text' }, render: (t) => t.sourceCode },
    ...(buildingId == null ? [{ key: 'buildingName', header: 'Tòa nhà', render: (t: Transaction) => t.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', filter: { type: 'text' }, render: (t) => t.apartmentCode ?? '' },
    { key: 'resident', header: 'Cư dân', render: (t) => t.residentName ?? '' },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      sortable: true,
      render: (t) => <Box sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(t.amount)}</Box>,
    },
    {
      key: 'method',
      header: 'Phương thức',
      filter: { type: 'select', options: METHOD_OPTIONS },
      render: (t) => (t.method ? PAYMENT_METHOD[t.method] : ''),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: TRANSACTION_STATUS_OPTIONS },
      render: (t) => <StatusChip {...TRANSACTION_STATUS[t.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (t) => (
        <Box>
          <Typography variant="body2">{formatDateTime(t.createdAt)}</Typography>
          {t.paidAt && (
            <Typography variant="caption" color="text.secondary">
              Thu lúc {formatDateTime(t.paidAt)}
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'description', header: 'Nội dung', minWidth: 200, render: (t) => t.description ?? '' },
  ]

  return (
    <ListPageLayout
      title="Lịch sử giao dịch"
      onClearFilters={list.clearFilters}
      hasFilters={list.hasFilters}
      toolbar={
        <ListToolbar
          filters={
            <>
              <ToolbarSelect label="Loại nguồn" value={list.filters.sourceType ?? ''} options={SOURCE_OPTIONS} onChange={(v) => list.setFilter('sourceType', v)} />
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={TRANSACTION_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            </>
          }
          search={list.filters.keyword ?? ''}
          onSearchChange={(v) => list.setFilter('keyword', v)}
          searchPlaceholder="Tìm mã, mã tham chiếu, căn hộ..."
          actions={
            <Can permission="TRANSACTION_EXPORT">
              <Button startIcon={<DownloadOutlinedIcon />} onClick={() => void exportExcel()} disabled={exporting} sx={{ bgcolor: 'background.paper' }}>
                Xuất Excel
              </Button>
            </Can>
          }
        />
      }
    >
      <DataTable
        columns={columns}
        rows={data?.content ?? []}
        getRowId={(t) => t.id}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        filters={list.filters}
        onFilterChange={list.setFilter}
        sort={list.sort}
        onSortChange={list.setSort}
        emptyMessage={list.hasFilters ? 'Không có giao dịch phù hợp với bộ lọc' : 'Chưa có giao dịch nào'}
        page={list.page}
        size={list.size}
        total={data?.totalElements ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
    </ListPageLayout>
  )
}
