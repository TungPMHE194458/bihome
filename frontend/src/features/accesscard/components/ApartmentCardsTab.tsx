import AddCardOutlinedIcon from '@mui/icons-material/AddCardOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { StatusChip } from '@/components/StatusChip'
import { useCardActions } from '@/features/accesscard/components/useCardActions'
import { CARD_STATUS, CARD_TYPE } from '@/features/accesscard/constants'
import { useAccessCards } from '@/features/accesscard/hooks'
import type { AccessCard } from '@/features/accesscard/types'
import type { ApartmentDetail } from '@/features/apartment/types'
import { formatDate } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const columns: Column<AccessCard>[] = [
  {
    key: 'cardNo',
    header: 'Mã thẻ',
    render: (c) => (
      <Typography fontWeight={600} fontFamily="monospace">
        {c.cardNo}
      </Typography>
    ),
  },
  { key: 'cardType', header: 'Loại thẻ', render: (c) => <StatusChip {...CARD_TYPE[c.cardType]} /> },
  { key: 'residentName', header: 'Cư dân', render: (c) => c.residentName ?? '' },
  { key: 'vehicle', header: 'Xe liên kết', render: (c) => (c.plateNumber ? `${c.assetItemName} · ${c.plateNumber}` : (c.assetItemName ?? '')) },
  { key: 'issuedDate', header: 'Ngày cấp', render: (c) => formatDate(c.issuedDate) },
  {
    key: 'expiryDate',
    header: 'Hết hạn',
    render: (c) => (c.expired ? <StatusChip label={`Hết hạn ${formatDate(c.expiryDate)}`} tone="danger" /> : formatDate(c.expiryDate)),
  },
  { key: 'status', header: 'Trạng thái', render: (c) => <StatusChip {...CARD_STATUS[c.status]} /> },
]

/** Thẻ từ đang gắn với căn hộ (đang dùng, khoá, báo mất). */
export function ApartmentCardsTab({ apartment }: { apartment: ApartmentDetail }) {
  const canRead = usePermission('ACCESS_CARD_READ')
  const canWrite = usePermission('ACCESS_CARD_WRITE')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const { data, isLoading, error, refetch } = useAccessCards(
    { apartmentId: apartment.id, buildingId: apartment.buildingId, page, size },
    canRead,
  )
  const actions = useCardActions()

  return (
    <Box>
      {canWrite && apartment.status === 'ACTIVE' && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddCardOutlinedIcon />}
            onClick={() =>
              actions.openCreate({
                id: apartment.id,
                code: apartment.code,
                name: apartment.name,
                buildingId: apartment.buildingId,
                buildingName: apartment.buildingName,
              })
            }
          >
            Cấp thẻ mới
          </Button>
        </Box>
      )}
      <DataTable
        columns={columns}
        rows={data?.content ?? []}
        getRowId={(c) => c.id}
        loading={canRead && isLoading}
        error={error}
        onRetry={() => void refetch()}
        rowActions={actions.rowActions}
        emptyMessage={canRead ? 'Căn hộ chưa có thẻ từ' : 'Bạn không có quyền xem thẻ từ'}
        page={page}
        size={size}
        total={data?.totalElements ?? 0}
        onPageChange={setPage}
        onSizeChange={(s) => {
          setSize(s)
          setPage(0)
        }}
      />
      {actions.dialogs}
    </Box>
  )
}
