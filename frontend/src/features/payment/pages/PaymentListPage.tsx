import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog'
import { ReasonDialog } from '@/components/ReasonDialog'
import { StatusChip } from '@/components/StatusChip'
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS, RECONCILE_OPTIONS, RECONCILE_STATUS } from '@/features/feenotice/constants'
import { paymentApi } from '@/features/payment/api'
import { PaymentDetailDialog } from '@/features/payment/components/PaymentDetailDialog'
import { PaymentFormDialog } from '@/features/payment/components/PaymentFormDialog'
import { usePaymentAction, usePayments } from '@/features/payment/hooks'
import type { Payment } from '@/features/payment/types'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { formatPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'feeNotice', 'apartment', 'method', 'reconcileStatus', 'status', 'from', 'to'] as const
const STATUS_OPTIONS = [
  { value: 'VALID', label: 'Hợp lệ' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

/** Lịch sử thanh toán (phiếu thu): ghi nhận thủ công, in phiếu, đối soát, huỷ phiếu có lý do. */
export function PaymentListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = usePayments(list.apiParams)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const canWrite = usePermission('PAYMENT_WRITE')
  const canExport = usePermission('PAYMENT_EXPORT')
  const action = usePaymentAction()
  // ?view=<id> (từ thông báo phí / chuông thông báo) mở chi tiết; giữ ở state để không ghi đè URL của danh sách.
  const location = useLocation()
  const [viewId, setViewId] = useState<number>()
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('view'))
    if (id) setViewId(id)
  }, [location.key, location.search])
  const [creating, setCreating] = useState(false)
  const [receipt, setReceipt] = useState<Payment | null>(null)
  const [cancelling, setCancelling] = useState<Payment | null>(null)

  const reconcile = async (p: Payment, status: 'MATCHED' | 'MISMATCHED') => {
    try {
      await action.mutateAsync({ type: 'reconcile', id: p.id, version: p.version, status })
      enqueueSnackbar(status === 'MATCHED' ? `Đã đối soát khớp ${p.code}.` : `Đã đánh dấu lệch ${p.code}.`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const rowActions = (p: Payment): RowAction[] => [
    {
      label: 'Xem chi tiết',
      icon: <VisibilityOutlinedIcon fontSize="small" />,
      onClick: () => setViewId(p.id),
    },
    { label: 'In phiếu thu', icon: <PrintOutlinedIcon fontSize="small" />, onClick: () => setReceipt(p) },
    ...(canWrite && p.status === 'VALID' && p.reconcileStatus !== 'MATCHED'
      ? [{ label: 'Đối soát: đã khớp', icon: <DoneAllOutlinedIcon fontSize="small" />, onClick: () => void reconcile(p, 'MATCHED') }]
      : []),
    ...(canWrite && p.status === 'VALID' && p.reconcileStatus === 'PENDING'
      ? [{ label: 'Đối soát: lệch', icon: <ReportProblemOutlinedIcon fontSize="small" />, onClick: () => void reconcile(p, 'MISMATCHED') }]
      : []),
    ...(canWrite && p.status === 'VALID'
      ? [{ label: 'Huỷ phiếu', icon: <CancelOutlinedIcon fontSize="small" />, danger: true, onClick: () => setCancelling(p) }]
      : []),
  ]

  const columns: Column<Payment>[] = [
    { key: 'code', header: 'Mã phiếu thu', sortable: true, filter: { type: 'text' }, render: (p) => <b>{p.code}</b> },
    {
      key: 'feeNotice',
      header: 'Thông báo phí',
      filter: { type: 'text' },
      render: (p) => (
        <>
          {p.feeNoticeCode}
          <Typography variant="caption" color="text.secondary" component="div">
            Kỳ {formatPeriod(p.period)}
          </Typography>
        </>
      ),
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (p: Payment) => p.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', sortable: true, sortKey: 'apartmentCode', filter: { type: 'text' }, render: (p) => p.apartmentCode },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      sortable: true,
      render: (p) => (
        <Typography variant="body2" fontWeight={600} sx={{ textDecoration: p.status === 'CANCELLED' ? 'line-through' : undefined }}>
          {formatCurrency(p.amount)}
        </Typography>
      ),
    },
    {
      key: 'method',
      header: 'Phương thức',
      filter: { type: 'select', options: PAYMENT_METHOD_OPTIONS },
      render: (p) => PAYMENT_METHOD_LABEL[p.method],
    },
    { key: 'paidAt', header: 'Thời gian', sortable: true, filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' }, render: (p) => formatDateTime(p.paidAt) },
    { key: 'collectorName', header: 'Người thu', render: (p) => p.collectorName },
    { key: 'bankReference', header: 'Mã GD ngân hàng', render: (p) => p.bankReference ?? '' },
    {
      key: 'reconcileStatus',
      header: 'Đối soát',
      filter: { type: 'select', options: RECONCILE_OPTIONS },
      render: (p) => <StatusChip {...RECONCILE_STATUS[p.reconcileStatus]} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      filter: { type: 'select', options: STATUS_OPTIONS },
      render: (p) => (
        <Box>
          <StatusChip label={p.status === 'VALID' ? 'Hợp lệ' : 'Đã huỷ'} tone={p.status === 'VALID' ? 'success' : 'neutral'} />
          {p.cancelReason && (
            <Typography variant="caption" color="text.secondary" component="div" noWrap sx={{ maxWidth: 160 }} title={p.cancelReason}>
              {p.cancelReason}
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'note', header: 'Ghi chú', render: (p) => <Typography variant="body2" noWrap sx={{ maxWidth: 180 }} title={p.note ?? ''}>{p.note}</Typography> },
  ]

  return (
    <>
      <ListPageLayout
        title="Lịch sử thanh toán"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Phương thức" value={list.filters.method ?? ''} options={PAYMENT_METHOD_OPTIONS}
                  onChange={(v) => list.setFilter('method', v)} />
                <ToolbarSelect label="Đối soát" value={list.filters.reconcileStatus ?? ''} options={RECONCILE_OPTIONS}
                  onChange={(v) => list.setFilter('reconcileStatus', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã phiếu, thông báo, căn hộ, người nộp..."
            actions={
              canExport && (
                <Button
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={() => paymentApi.exportExcel(list.apiParams).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))}
                >
                  Xuất Excel
                </Button>
              )
            }
            onAdd={() => setCreating(true)}
            addLabel="Ghi nhận thanh toán"
            addPermission="PAYMENT_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(p) => p.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(p) => setViewId(p.id)}
          rowActions={rowActions}
          highlightRow={(p) => p.status === 'VALID' && p.reconcileStatus === 'MISMATCHED'}
          emptyMessage={list.hasFilters ? 'Không có phiếu thu phù hợp với bộ lọc' : 'Chưa có phiếu thu nào'}
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <PaymentFormDialog open={creating} onClose={() => setCreating(false)} />
      <PaymentDetailDialog id={viewId} onClose={() => setViewId(undefined)} />
      <PdfPreviewDialog
        path={receipt ? paymentApi.receiptPath(receipt.id) : null}
        title={`Phiếu thu ${receipt?.code ?? ''}`}
        fileName={`phieu-thu-${receipt?.code.toLowerCase() ?? ''}.pdf`}
        onClose={() => setReceipt(null)}
      />
      <ReasonDialog
        open={!!cancelling}
        title={`Huỷ phiếu thu ${cancelling?.code ?? ''}?`}
        message={`Số đã thu của thông báo ${cancelling?.feeNoticeCode ?? ''} sẽ giảm ${formatCurrency(cancelling?.amount)}.`}
        label="Lý do huỷ"
        confirmLabel="Huỷ phiếu"
        danger
        loading={action.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          if (!cancelling) return
          try {
            await action.mutateAsync({ type: 'cancel', id: cancelling.id, version: cancelling.version, reason })
            enqueueSnackbar(`Đã huỷ phiếu thu ${cancelling.code}.`, { variant: 'success' })
            setCancelling(null)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </>
  )
}
