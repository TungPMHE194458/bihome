import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import { FEE_NOTICE_STATUS } from '@/features/feenotice/constants'
import { useFeeNotices } from '@/features/feenotice/hooks'
import type { FeeNoticeSummary } from '@/features/feenotice/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'

const columns: Column<FeeNoticeSummary>[] = [
  {
    key: 'code',
    header: 'Mã thông báo',
    render: (n) => (
      <Link component={RouterLink} to={`/fee-notices/${n.id}`} fontWeight={600} underline="hover">
        {n.code}
      </Link>
    ),
  },
  { key: 'period', header: 'Kỳ', render: (n) => formatPeriod(n.period) },
  { key: 'totalAmount', header: 'Tổng cộng', align: 'right', render: (n) => formatCurrency(n.totalAmount) },
  { key: 'paidAmount', header: 'Đã thanh toán', align: 'right', render: (n) => formatCurrency(n.paidAmount) },
  {
    key: 'outstanding',
    header: 'Còn nợ',
    align: 'right',
    render: (n) => (
      <Typography variant="body2" fontWeight={600} color={n.outstanding > 0 ? 'error.main' : 'text.secondary'}>
        {formatCurrency(n.outstanding)}
      </Typography>
    ),
  },
  { key: 'dueDate', header: 'Hạn thanh toán', render: (n) => formatDate(n.dueDate) },
  { key: 'status', header: 'Trạng thái', render: (n) => <StatusChip {...FEE_NOTICE_STATUS[n.status]} /> },
]

/** Thông báo phí của một căn hộ (lọc theo apartmentId, không phụ thuộc tòa đang chọn). */
export function ApartmentFeeNoticesTab({ apartmentId, buildingId }: { apartmentId: number; buildingId: number }) {
  const canRead = usePermission('FEE_NOTICE_READ')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useFeeNotices({ apartmentId, buildingId, page, size }, canRead)

  return (
    <DataTable
      columns={columns}
      rows={data?.content ?? []}
      getRowId={(n) => n.id}
      loading={canRead && isLoading}
      error={error}
      onRetry={() => void refetch()}
      highlightRow={(n) => n.status === 'OVERDUE'}
      emptyMessage={canRead ? 'Căn hộ chưa có thông báo phí' : 'Bạn không có quyền xem thông báo phí'}
      page={page}
      size={size}
      total={data?.totalElements ?? 0}
      onPageChange={setPage}
      onSizeChange={(s) => {
        setSize(s)
        setPage(0)
      }}
    />
  )
}
