import Link from '@mui/material/Link'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import { TICKET_PRIORITY, TICKET_STATUS } from '@/features/ticket/constants'
import { useTickets } from '@/features/ticket/hooks'
import type { TicketSummary } from '@/features/ticket/types'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const columns: Column<TicketSummary>[] = [
  {
    key: 'code',
    header: 'Mã yêu cầu',
    render: (t) => (
      <Link component={RouterLink} to={`/tickets/${t.id}`} fontWeight={600} underline="hover" color={t.overdue ? 'error.main' : 'primary.main'}>
        {t.code}
      </Link>
    ),
  },
  { key: 'title', header: 'Tiêu đề', minWidth: 200 },
  { key: 'categoryName', header: 'Danh mục' },
  { key: 'priority', header: 'Ưu tiên', render: (t) => <StatusChip {...TICKET_PRIORITY[t.priority]} /> },
  { key: 'assigneeName', header: 'Người xử lý', render: (t) => t.assigneeName ?? '' },
  { key: 'status', header: 'Trạng thái', render: (t) => <StatusChip {...TICKET_STATUS[t.status]} /> },
  { key: 'createdAt', header: 'Ngày tạo', render: (t) => formatDateTime(t.createdAt) },
]

/** Yêu cầu hỗ trợ của một căn hộ (lọc theo apartmentId nên không phụ thuộc tòa đang chọn). */
export function ApartmentTicketsTab({ apartmentId, buildingId }: { apartmentId: number; buildingId: number }) {
  const canRead = usePermission('TICKET_READ')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useTickets({ apartmentId, buildingId, page, size }, canRead)

  return (
    <DataTable
      columns={columns}
      rows={data?.content ?? []}
      getRowId={(t) => t.id}
      loading={canRead && isLoading}
      error={error}
      onRetry={() => void refetch()}
      highlightRow={(t) => t.overdue}
      emptyMessage={canRead ? 'Căn hộ chưa có yêu cầu hỗ trợ' : 'Bạn không có quyền xem yêu cầu hỗ trợ'}
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
