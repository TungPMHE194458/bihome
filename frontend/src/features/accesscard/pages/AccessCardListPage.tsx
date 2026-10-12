import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { useCardActions } from '@/features/accesscard/components/useCardActions'
import { CARD_STATUS, CARD_STATUS_OPTIONS, CARD_TYPE, CARD_TYPE_OPTIONS } from '@/features/accesscard/constants'
import { useAccessCards } from '@/features/accesscard/hooks'
import type { AccessCard } from '@/features/accesscard/types'
import { useListParams } from '@/hooks/useListParams'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'cardNo', 'cardType', 'apartment', 'resident', 'status', 'expired', 'createdFrom', 'createdTo'] as const

export function AccessCardListPage() {
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useAccessCards(list.apiParams)
  const actions = useCardActions()
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const expiredOnly = list.filters.expired === 'true'

  const columns: Column<AccessCard>[] = [
    {
      key: 'cardNo',
      header: 'Mã thẻ',
      sortable: true,
      filter: { type: 'text' },
      render: (c) => (
        <Typography fontWeight={600} fontFamily="monospace" sx={{ whiteSpace: 'nowrap' }}>
          {c.cardNo}
        </Typography>
      ),
    },
    {
      key: 'cardType',
      header: 'Loại thẻ',
      filter: { type: 'select', options: CARD_TYPE_OPTIONS },
      render: (c) => <StatusChip {...CARD_TYPE[c.cardType]} />,
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', minWidth: 140, render: (c: AccessCard) => c.buildingName }] : []),
    {
      key: 'apartment',
      header: 'Căn hộ',
      sortKey: 'apartment',
      sortable: true,
      filter: { type: 'text' },
      render: (c) =>
        c.apartmentId ? (
          <Link component={RouterLink} to={`/apartments/${c.apartmentId}?tab=cards`} underline="hover" sx={{ whiteSpace: 'nowrap' }}>
            {c.apartmentCode}
          </Link>
        ) : (
          ''
        ),
    },
    {
      key: 'resident',
      header: 'Cư dân',
      filter: { type: 'text' },
      minWidth: 140,
      render: (c) =>
        c.residentId ? (
          <Link component={RouterLink} to={`/residents/${c.residentId}`} underline="hover">
            {c.residentName}
          </Link>
        ) : (
          ''
        ),
    },
    {
      key: 'vehicle',
      header: 'Xe liên kết',
      render: (c) =>
        c.assetItemId ? (
          <Box>
            <Typography variant="body2">{c.assetItemName}</Typography>
            {c.plateNumber && (
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                {c.plateNumber}
              </Typography>
            )}
          </Box>
        ) : (
          ''
        ),
    },
    { key: 'issuedDate', header: 'Ngày cấp', sortable: true, render: (c) => formatDate(c.issuedDate) },
    {
      key: 'expiryDate',
      header: 'Ngày hết hạn',
      sortable: true,
      render: (c) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <span>{formatDate(c.expiryDate)}</span>
          {c.expired && <StatusChip label="Hết hạn" tone="danger" />}
        </Stack>
      ),
    },
    { key: 'issueFee', header: 'Phí làm thẻ', align: 'right', render: (c) => formatCurrency(c.issueFee) },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: CARD_STATUS_OPTIONS },
      render: (c) => <StatusChip {...CARD_STATUS[c.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (c) => formatDateTime(c.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Thẻ từ"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={CARD_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
                <ToolbarSelect label="Loại thẻ" value={list.filters.cardType ?? ''} options={CARD_TYPE_OPTIONS} onChange={(v) => list.setFilter('cardType', v)} />
                <Chip
                  label="Hết hạn"
                  color={expiredOnly ? 'error' : 'default'}
                  variant={expiredOnly ? 'filled' : 'outlined'}
                  onClick={() => list.setFilter('expired', expiredOnly ? '' : 'true')}
                  aria-pressed={expiredOnly}
                  sx={{ bgcolor: expiredOnly ? undefined : 'background.paper', height: 36 }}
                />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã thẻ..."
            onAdd={() => actions.openCreate()}
            addPermission="ACCESS_CARD_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(c) => c.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={actions.rowActions}
          emptyMessage={list.hasFilters ? 'Không có thẻ phù hợp với bộ lọc' : 'Chưa có thẻ từ nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      {actions.dialogs}
    </>
  )
}
