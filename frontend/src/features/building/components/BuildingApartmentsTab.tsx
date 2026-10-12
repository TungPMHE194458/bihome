import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ViewToggle } from '@/components/ListPage/ViewToggle'
import { StatusChip } from '@/components/StatusChip'
import { apartmentCardProps } from '@/features/apartment/components/apartmentCard'
import { APARTMENT_STATUS, APARTMENT_TYPE, USAGE_STATUS } from '@/features/apartment/constants'
import { useApartmentList } from '@/features/apartment/hooks'
import type { ApartmentSummary } from '@/features/apartment/types'
import type { ViewMode } from '@/hooks/useListParams'
import { formatArea } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const columns: Column<ApartmentSummary>[] = [
  {
    key: 'name',
    header: 'Tên',
    render: (a) => (
      <Link component={RouterLink} to={`/apartments/${a.id}`} fontWeight={600} underline="hover">
        {a.name}
      </Link>
    ),
  },
  { key: 'code', header: 'Mã' },
  { key: 'floorNo', header: 'Tầng' },
  { key: 'area', header: 'Diện tích', align: 'right', render: (a) => formatArea(a.area) },
  { key: 'type', header: 'Loại', render: (a) => <StatusChip {...APARTMENT_TYPE[a.type]} /> },
  { key: 'usageStatus', header: 'Tình trạng', render: (a) => <StatusChip {...USAGE_STATUS[a.usageStatus]} /> },
  { key: 'status', header: 'Trạng thái', render: (a) => <StatusChip {...APARTMENT_STATUS[a.status]} /> },
]

const cardProps = apartmentCardProps(false)

/** Lọc theo tòa đang xem (tham số buildingId), không phụ thuộc tòa đang chọn ở header. */
export function BuildingApartmentsTab({ buildingId }: { buildingId: number }) {
  const canRead = usePermission('APARTMENT_READ')
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('list')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useApartmentList({ buildingId, page, size, sort: 'code,asc' }, { enabled: canRead })

  const common = {
    loading: canRead && isLoading,
    error,
    onRetry: () => void refetch(),
    emptyMessage: canRead ? 'Chưa có căn hộ nào trong tòa nhà này' : 'Bạn không có quyền xem danh sách căn hộ',
    page,
    size,
    total: data?.totalElements ?? 0,
    onPageChange: setPage,
    onSizeChange: (s: number) => {
      setSize(s)
      setPage(0)
    },
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 1 }}>
        <ViewToggle value={view} onChange={setView} />
      </Box>
      {view === 'grid' ? (
        <CardGrid items={data?.content ?? []} {...cardProps} onItemClick={(a) => navigate(`/apartments/${a.id}`)} {...common} />
      ) : (
        <DataTable columns={columns} rows={data?.content ?? []} getRowId={(a) => a.id} {...common} />
      )}
    </Box>
  )
}
