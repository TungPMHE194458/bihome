import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Can } from '@/components/Can'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { StatusChip } from '@/components/StatusChip'
import { useAmenityOptions } from '@/features/amenity/hooks'
import { BookingCalendar, mondayOf } from '@/features/booking/components/BookingCalendar'
import { BookingDetailDialog } from '@/features/booking/components/BookingDetailDialog'
import { BookingFormDialog } from '@/features/booking/components/BookingFormDialog'
import { BOOKING_STATUS, BOOKING_STATUS_OPTIONS } from '@/features/booking/constants'
import { useBookingAction, useBookings } from '@/features/booking/hooks'
import type { BookingFormValues } from '@/features/booking/schema'
import type { Booking } from '@/features/booking/types'
import { TRANSACTION_STATUS } from '@/features/transaction/constants'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

type TabKey = 'list' | 'calendar'

/**
 * Đăng ký tiện ích: tab Danh sách và Lịch tuần (?tab=calendar). ?create=1 (tạo nhanh trên header) mở form,
 * ?view=<id> (từ chuông thông báo) mở chi tiết.
 */
export function BookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('tab') === 'calendar' ? 'calendar' : 'list'
  const [form, setForm] = useState<{ open: boolean; preset?: Partial<BookingFormValues> }>({ open: false })
  const [viewId, setViewId] = useState<number>()

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const view = Number(q.get('view'))
    if (view) setViewId(view)
    if (q.get('create') === '1') setForm({ open: true })
  }, [location.key, location.search])

  const tabs = (
    <Tabs value={tab} onChange={(_, v: TabKey) => navigate({ search: v === 'list' ? '' : `?tab=${v}` }, { replace: true })}>
      <Tab value="list" label="Danh sách" />
      <Tab value="calendar" label="Lịch tuần" />
    </Tabs>
  )
  const openCreate = (preset?: Partial<BookingFormValues>) => setForm({ open: true, preset })

  return (
    <>
      {tab === 'calendar' ? (
        <CalendarTab key="calendar" tabs={tabs} onOpen={setViewId} onCreate={openCreate} />
      ) : (
        <ListTab key="list" tabs={tabs} onOpen={setViewId} onCreate={() => openCreate()} />
      )}
      <BookingFormDialog
        open={form.open}
        preset={form.preset}
        onClose={() => setForm({ open: false })}
        onCreated={(b) => setViewId(b.id)}
      />
      <BookingDetailDialog id={viewId} onClose={() => setViewId(undefined)} />
    </>
  )
}

const FILTER_KEYS = ['keyword', 'code', 'amenityId', 'apartment', 'status', 'bookingFrom', 'bookingTo', 'createdFrom', 'createdTo'] as const

function ListTab({ tabs, onOpen, onCreate }: { tabs: ReactNode; onOpen: (id: number) => void; onCreate: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useBookings(list.apiParams)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const allBuildings = buildingId == null
  const { data: amenities = [] } = useAmenityOptions(buildingId)
  const amenityOptions = useMemo(() => amenities.map((a) => ({ value: String(a.id), label: a.name })), [amenities])
  const canWrite = usePermission('AMENITY_BOOKING_WRITE')
  const action = useBookingAction()

  const rowActions = (b: Booking): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => onOpen(b.id) },
    ...(canWrite && b.status === 'PENDING'
      ? [
          {
            label: 'Duyệt',
            icon: <CheckCircleOutlineIcon fontSize="small" />,
            onClick: () =>
              action.mutateAsync({ type: 'approve', id: b.id, version: b.version }).then(
                () => enqueueSnackbar(`Đã duyệt ${b.code}.`, { variant: 'success' }),
                (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
              ),
          },
        ]
      : []),
  ]

  const columns: Column<Booking>[] = [
    { key: 'code', header: 'Mã đăng ký', sortable: true, filter: { type: 'text' }, render: (b) => <Typography fontWeight={600} fontSize={14}>{b.code}</Typography> },
    {
      key: 'amenityId',
      header: 'Tiện ích',
      sortKey: 'amenityName',
      sortable: true,
      filter: { type: 'select', options: amenityOptions },
      render: (b) => b.amenityName,
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (b: Booking) => b.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', sortKey: 'apartmentCode', sortable: true, filter: { type: 'text' }, render: (b) => b.apartmentCode },
    { key: 'resident', header: 'Cư dân', render: (b) => b.residentName ?? '' },
    {
      key: 'bookingDate',
      header: 'Ngày sử dụng',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'bookingFrom', toKey: 'bookingTo' },
      render: (b) => (
        <Box sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2" fontWeight={600}>
            {b.startTime}–{b.endTime}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(b.bookingDate)}
          </Typography>
        </Box>
      ),
    },
    { key: 'peopleCount', header: 'Số người', align: 'right', render: (b) => b.peopleCount },
    {
      key: 'total',
      header: 'Thành tiền',
      align: 'right',
      sortable: true,
      render: (b) =>
        b.total ? (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(b.total)}
            </Typography>
            {b.voucherCode && (
              <Typography variant="caption" color="text.secondary">
                {b.voucherCode} −{formatCurrency(b.discount)}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="success.main">
            Miễn phí
          </Typography>
        ),
    },
    {
      key: 'payment',
      header: 'Thanh toán',
      render: (b) => (b.transaction ? <StatusChip {...TRANSACTION_STATUS[b.transaction.status]} /> : ''),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: BOOKING_STATUS_OPTIONS },
      render: (b) => <StatusChip {...BOOKING_STATUS[b.status]} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (b) => formatDateTime(b.createdAt),
    },
  ]

  return (
    <ListPageLayout
      title="Đăng ký tiện ích"
      tabs={tabs}
      onClearFilters={list.clearFilters}
      hasFilters={list.hasFilters}
      toolbar={
        <ListToolbar
          filters={
            <>
              <ToolbarSelect label="Tiện ích" value={list.filters.amenityId ?? ''} options={amenityOptions} onChange={(v) => list.setFilter('amenityId', v)} />
              <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={BOOKING_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />
            </>
          }
          search={list.filters.keyword ?? ''}
          onSearchChange={(v) => list.setFilter('keyword', v)}
          searchPlaceholder="Tìm mã, căn hộ, cư dân..."
          onAdd={onCreate}
          addLabel="Đăng ký"
          addPermission="AMENITY_BOOKING_WRITE"
        />
      }
    >
      <DataTable
        columns={columns}
        rows={data?.content ?? []}
        getRowId={(b) => b.id}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        filters={list.filters}
        onFilterChange={list.setFilter}
        sort={list.sort}
        onSortChange={list.setSort}
        onRowClick={(b) => onOpen(b.id)}
        highlightRow={(b) => b.status === 'PENDING'}
        rowActions={rowActions}
        emptyMessage={list.hasFilters ? 'Không có đăng ký phù hợp với bộ lọc' : 'Chưa có đăng ký tiện ích nào'}
        page={list.page}
        size={list.size}
        total={data?.totalElements ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
    </ListPageLayout>
  )
}

function CalendarTab({
  tabs,
  onOpen,
  onCreate,
}: {
  tabs: ReactNode
  onOpen: (id: number) => void
  onCreate: (preset: Partial<BookingFormValues>) => void
}) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: amenities = [] } = useAmenityOptions(buildingId)
  const [amenityId, setAmenityId] = useState<number>()
  const [weekStart, setWeekStart] = useState(() => mondayOf(dayjs()).format('YYYY-MM-DD'))
  const current = amenityId ?? amenities[0]?.id

  return (
    <Stack spacing={2}>
      <PageBreadcrumb title="Đăng ký tiện ích" />
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>{tabs}</Box>
          <Can permission="AMENITY_BOOKING_WRITE">
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => onCreate(current ? { amenityId: current } : {})}>
              Đăng ký
            </Button>
          </Can>
        </Box>
        <Box sx={{ p: 2 }}>
          {buildingId == null ? (
            <Typography color="text.secondary">Chọn một tòa nhà ở thanh trên cùng để xem lịch tiện ích.</Typography>
          ) : (
            <BookingCalendar
              amenities={amenities}
              amenityId={current}
              onAmenityChange={setAmenityId}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              onOpen={onOpen}
              onCreate={onCreate}
            />
          )}
        </Box>
      </Paper>
    </Stack>
  )
}
