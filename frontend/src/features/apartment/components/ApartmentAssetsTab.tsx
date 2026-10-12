import { useState } from 'react'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import { ASSET_STATUS } from '@/features/asset/constants'
import { useAssetItems } from '@/features/asset/hooks'
import type { AssetItem } from '@/features/asset/types'
import { formatDate } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const columns: Column<AssetItem>[] = [
  { key: 'name', header: 'Tên' },
  { key: 'plateNumber', header: 'Số hiệu', render: (i) => i.plateNumber ?? '' },
  { key: 'categoryName', header: 'Danh mục' },
  { key: 'entryDate', header: 'Ngày vào', render: (i) => formatDate(i.entryDate) },
  { key: 'exitDate', header: 'Ngày ra', render: (i) => formatDate(i.exitDate) },
  { key: 'status', header: 'Trạng thái', render: (i) => <StatusChip {...ASSET_STATUS[i.status]} /> },
]

/** Hạng mục (xe) của một căn hộ; lọc theo apartmentId nên không phụ thuộc tòa đang chọn. */
export function ApartmentAssetsTab({ apartmentId, buildingId }: { apartmentId: number; buildingId: number }) {
  const canRead = usePermission('ASSET_READ')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useAssetItems(
    { apartmentId, buildingId, page, size, sort: 'entryDate,desc' },
    { enabled: canRead },
  )

  return (
    <DataTable
      columns={columns}
      rows={data?.content ?? []}
      getRowId={(i) => i.id}
      loading={canRead && isLoading}
      error={error}
      onRetry={() => void refetch()}
      emptyMessage={canRead ? 'Căn hộ chưa kê khai hạng mục nào' : 'Bạn không có quyền xem hạng mục căn hộ'}
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
