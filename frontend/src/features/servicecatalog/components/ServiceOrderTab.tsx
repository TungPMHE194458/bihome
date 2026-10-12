import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useState, type ReactNode } from 'react'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction, SelectOption } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { ReasonDialog } from '@/components/ReasonDialog'
import { StatusChip, type ChipStyle } from '@/components/StatusChip'
import { serviceApi } from '@/features/servicecatalog/api'
import { ServiceOrderFormDialog } from '@/features/servicecatalog/components/ServiceOrderFormDialog'
import type { ServiceOrder, ServiceOrderStatus } from '@/features/servicecatalog/types'
import { PayDialog } from '@/features/transaction/components/PayDialog'
import { TRANSACTION_STATUS } from '@/features/transaction/constants'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

export const ORDER_STATUS: Record<ServiceOrderStatus, ChipStyle> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}
const ORDER_STATUS_OPTIONS: SelectOption[] = (Object.keys(ORDER_STATUS) as ServiceOrderStatus[]).map((v) => ({
  value: v,
  label: ORDER_STATUS[v].label,
}))
const FILTER_KEYS = ['keyword', 'code', 'apartment', 'status', 'createdFrom', 'createdTo'] as const

/** Đơn dịch vụ của căn hộ: tạo đơn, xác nhận, hoàn thành, huỷ, ghi nhận thanh toán. */
export function ServiceOrderTab({ tabs }: { tabs: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['services', 'orders', buildingId, list.apiParams],
    queryFn: () => serviceApi.orders(list.apiParams),
    placeholderData: keepPreviousData,
  })
  const canWrite = usePermission('SERVICE_WRITE')
  const [creating, setCreating] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<ServiceOrder | null>(null)
  const [payTarget, setPayTarget] = useState<ServiceOrder | null>(null)
  const act = useMutation({
    mutationFn: (fn: () => Promise<ServiceOrder>) => fn(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
  const run = async (fn: () => Promise<ServiceOrder>, message: string) => {
    try {
      await act.mutateAsync(fn)
      enqueueSnackbar(message, { variant: 'success' })
      return true
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      return false
    }
  }

  const rowActions = (o: ServiceOrder): RowAction[] =>
    !canWrite
      ? []
      : [
          ...(o.status === 'PENDING'
            ? [{ label: 'Xác nhận', icon: <TaskAltIcon fontSize="small" />, onClick: () => void run(() => serviceApi.confirmOrder(o.id, o.version), `Đã xác nhận ${o.code}.`) }]
            : []),
          ...(o.status === 'CONFIRMED'
            ? [{ label: 'Hoàn thành', icon: <DoneAllIcon fontSize="small" />, onClick: () => void run(() => serviceApi.completeOrder(o.id, o.version), `Đã hoàn thành ${o.code}.`) }]
            : []),
          ...(o.transaction?.status === 'PENDING' && o.status !== 'CANCELLED'
            ? [{ label: 'Ghi nhận thanh toán', icon: <PaymentsOutlinedIcon fontSize="small" />, onClick: () => setPayTarget(o) }]
            : []),
          ...(o.status === 'PENDING' || o.status === 'CONFIRMED'
            ? [{ label: 'Huỷ đơn', icon: <CancelOutlinedIcon fontSize="small" />, danger: true, onClick: () => setCancelTarget(o) }]
            : []),
        ]

  const columns: Column<ServiceOrder>[] = [
    { key: 'code', header: 'Mã đơn', sortable: true, filter: { type: 'text' }, render: (o) => <Typography fontWeight={600} fontSize={14}>{o.code}</Typography> },
    { key: 'service', header: 'Dịch vụ', minWidth: 160, render: (o) => o.serviceName },
    ...(buildingId == null ? [{ key: 'buildingName', header: 'Tòa nhà', render: (o: ServiceOrder) => o.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', filter: { type: 'text' }, render: (o) => o.apartmentCode },
    { key: 'resident', header: 'Cư dân', render: (o) => o.residentName ?? '' },
    {
      key: 'quantity',
      header: 'Số lượng',
      align: 'right',
      render: (o) => `${formatNumber(o.quantity)} ${o.unit}`,
    },
    {
      key: 'total',
      header: 'Thành tiền',
      align: 'right',
      sortable: true,
      render: (o) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {formatCurrency(o.total)}
          </Typography>
          {o.voucherCode && (
            <Typography variant="caption" color="text.secondary">
              {o.voucherCode} −{formatCurrency(o.discount)}
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'scheduledAt', header: 'Hẹn thực hiện', sortable: true, render: (o) => formatDateTime(o.scheduledAt) },
    { key: 'payment', header: 'Thanh toán', render: (o) => (o.transaction ? <StatusChip {...TRANSACTION_STATUS[o.transaction.status]} /> : '') },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: ORDER_STATUS_OPTIONS },
      render: (o) => <StatusChip {...ORDER_STATUS[o.status]} title={o.cancelReason} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' },
      render: (o) => formatDateTime(o.createdAt),
    },
  ]

  return (
    <>
      <ListPageLayout
        title="Dịch vụ"
        tabs={tabs}
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={<ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={ORDER_STATUS_OPTIONS} onChange={(v) => list.setFilter('status', v)} />}
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã đơn, căn hộ, dịch vụ..."
            onAdd={() => setCreating(true)}
            addLabel="Tạo đơn"
            addPermission="SERVICE_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(o) => o.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          rowActions={canWrite ? rowActions : undefined}
          emptyMessage={list.hasFilters ? 'Không có đơn phù hợp với bộ lọc' : 'Chưa có đơn dịch vụ nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <ServiceOrderFormDialog open={creating} onClose={() => setCreating(false)} />
      <ReasonDialog
        open={!!cancelTarget}
        title="Huỷ đơn dịch vụ?"
        message="Voucher (nếu có) được trả lại; khoản chưa thu bị huỷ, khoản đã thu được hoàn."
        label="Lý do huỷ"
        confirmLabel="Huỷ đơn"
        danger
        loading={act.isPending}
        onClose={() => setCancelTarget(null)}
        onConfirm={async (reason) => {
          if (!cancelTarget) return
          const ok = await run(() => serviceApi.cancelOrder(cancelTarget.id, reason, cancelTarget.version), `Đã huỷ ${cancelTarget.code}.`)
          if (ok) setCancelTarget(null)
        }}
      />
      <PayDialog
        open={!!payTarget}
        subject={`đơn ${payTarget?.code ?? ''}`}
        amount={payTarget?.total ?? 0}
        loading={act.isPending}
        onClose={() => setPayTarget(null)}
        onConfirm={async (method) => {
          if (!payTarget) return
          const ok = await run(() => serviceApi.payOrder(payTarget.id, method), 'Đã ghi nhận thanh toán.')
          if (ok) setPayTarget(null)
        }}
      />
    </>
  )
}
