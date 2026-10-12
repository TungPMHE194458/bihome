import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column, RowAction } from '@/components/DataTable/types'
import { ListPageLayout } from '@/components/ListPage/ListPageLayout'
import { ListToolbar, ToolbarSelect } from '@/components/ListPage/ListToolbar'
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog'
import { StatusChip } from '@/components/StatusChip'
import { feeNoticeApi } from '@/features/feenotice/api'
import { GenerateFeeNoticeDialog } from '@/features/feenotice/components/GenerateFeeNoticeDialog'
import { FEE_NOTICE_STATUS, FEE_NOTICE_STATUS_OPTIONS, isCollectible } from '@/features/feenotice/constants'
import { useFeeNoticeAction, useFeeNotices, useIssueAll } from '@/features/feenotice/hooks'
import type { FeeNoticeSummary } from '@/features/feenotice/types'
import { PaymentFormDialog } from '@/features/payment/components/PaymentFormDialog'
import { useListParams } from '@/hooks/useListParams'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { currentPeriod, formatPeriod, periodOptions, shiftPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'code', 'period', 'apartment', 'status', 'unpaid', 'dueFrom', 'dueTo'] as const
const PERIOD_OPTIONS = periodOptions(18)

/** Thông báo phí theo kỳ: tạo hàng loạt (xem trước), phát hành, thu tiền, PDF, Excel. */
export function FeeNoticeListPage() {
  const { enqueueSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useFeeNotices(list.apiParams)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const allBuildings = buildingId == null
  const canWrite = usePermission('FEE_NOTICE_WRITE')
  const canDelete = usePermission('FEE_NOTICE_DELETE')
  const canExport = usePermission('FEE_NOTICE_EXPORT')
  const canPay = usePermission('PAYMENT_WRITE')
  const action = useFeeNoticeAction()
  const issueAll = useIssueAll()
  const [generating, setGenerating] = useState(false)
  const [paying, setPaying] = useState<FeeNoticeSummary | null>(null)
  const [pdf, setPdf] = useState<FeeNoticeSummary | null>(null)
  const [pending, setPending] = useState<{ type: 'issue' | 'delete'; notice: FeeNoticeSummary } | null>(null)
  const [issuingAll, setIssuingAll] = useState(false)
  const period = list.filters.period
  // ?create=1 (tạo nhanh trên header) mở hộp tạo hàng loạt.
  const location = useLocation()
  useEffect(() => {
    if (new URLSearchParams(location.search).get('create') === '1' && buildingId != null) setGenerating(true)
  }, [location.key, location.search, buildingId])

  const rowActions = (n: FeeNoticeSummary): RowAction[] => [
    { label: 'Xem chi tiết', icon: <VisibilityOutlinedIcon fontSize="small" />, onClick: () => navigate(`/fee-notices/${n.id}`) },
    { label: 'Xem PDF', icon: <PictureAsPdfOutlinedIcon fontSize="small" />, onClick: () => setPdf(n) },
    ...(canPay && isCollectible(n)
      ? [{ label: 'Ghi nhận thanh toán', icon: <PaymentsOutlinedIcon fontSize="small" />, onClick: () => setPaying(n) }]
      : []),
    ...(canWrite && n.status === 'DRAFT'
      ? [{ label: 'Phát hành', icon: <PublishOutlinedIcon fontSize="small" />, onClick: () => setPending({ type: 'issue', notice: n }) }]
      : []),
    ...(canDelete && n.status === 'DRAFT'
      ? [{ label: 'Xoá', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, onClick: () => setPending({ type: 'delete', notice: n }) }]
      : []),
  ]

  const columns: Column<FeeNoticeSummary>[] = [
    { key: 'code', header: 'Mã thông báo', sortable: true, filter: { type: 'text' }, render: (n) => <b>{n.code}</b> },
    {
      key: 'period',
      header: 'Kỳ',
      sortable: true,
      filter: { type: 'select', options: PERIOD_OPTIONS },
      render: (n) => formatPeriod(n.period),
    },
    ...(allBuildings ? [{ key: 'buildingName', header: 'Tòa nhà', render: (n: FeeNoticeSummary) => n.buildingName }] : []),
    { key: 'apartment', header: 'Căn hộ', sortable: true, sortKey: 'apartmentCode', filter: { type: 'text' }, render: (n) => n.apartmentCode },
    { key: 'holderName', header: 'Chủ hộ', render: (n) => n.holderName ?? '' },
    { key: 'totalAmount', header: 'Tổng cộng', align: 'right', sortable: true, render: (n) => formatCurrency(n.totalAmount) },
    { key: 'paidAmount', header: 'Đã thanh toán', align: 'right', sortable: true, render: (n) => formatCurrency(n.paidAmount) },
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
    {
      key: 'dueDate',
      header: 'Hạn thanh toán',
      sortable: true,
      filter: { type: 'dateRange', fromKey: 'dueFrom', toKey: 'dueTo' },
      render: (n) => formatDate(n.dueDate),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      filter: { type: 'select', options: FEE_NOTICE_STATUS_OPTIONS },
      render: (n) => (
        <Box>
          <StatusChip {...FEE_NOTICE_STATUS[n.status]} />
          {n.carriedToCode && (
            <Typography variant="caption" color="text.secondary" component="div">
              Chuyển nợ sang {n.carriedToCode}
            </Typography>
          )}
        </Box>
      ),
    },
    { key: 'createdAt', header: 'Ngày tạo', sortable: true, render: (n) => formatDateTime(n.createdAt) },
  ]

  const confirmPending = async () => {
    if (!pending) return
    try {
      const n = pending.notice
      await action.mutateAsync(pending.type === 'issue' ? { type: 'issue', id: n.id, version: n.version } : { type: 'delete', id: n.id })
      enqueueSnackbar(pending.type === 'issue' ? `Đã phát hành ${n.code}.` : `Đã xoá ${n.code}.`, { variant: 'success' })
      setPending(null)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const confirmIssueAll = async () => {
    if (!period) return
    try {
      const r = await issueAll.mutateAsync(period)
      enqueueSnackbar(
        r.failed
          ? `Đã phát hành ${r.issued} thông báo; ${r.failed} thông báo lỗi: ${r.errors.slice(0, 2).join('; ')}`
          : `Đã phát hành ${r.issued} thông báo phí kỳ ${formatPeriod(period)}.`,
        { variant: r.failed ? 'warning' : 'success' },
      )
      setIssuingAll(false)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <>
      <ListPageLayout
        title="Thông báo phí"
        onClearFilters={list.clearFilters}
        hasFilters={list.hasFilters}
        toolbar={
          <ListToolbar
            filters={
              <>
                <ToolbarSelect label="Kỳ" value={period ?? ''} options={PERIOD_OPTIONS} onChange={(v) => list.setFilter('period', v)} />
                <ToolbarSelect label="Trạng thái" value={list.filters.status ?? ''} options={FEE_NOTICE_STATUS_OPTIONS}
                  onChange={(v) => list.setFilter('status', v)} />
                <ToolbarSelect label="Công nợ" value={list.filters.unpaid ?? ''} options={[{ value: 'true', label: 'Còn nợ' }]}
                  onChange={(v) => list.setFilter('unpaid', v)} />
              </>
            }
            search={list.filters.keyword ?? ''}
            onSearchChange={(v) => list.setFilter('keyword', v)}
            searchPlaceholder="Tìm mã, căn hộ, chủ hộ..."
            actions={
              <>
                {canWrite && period && buildingId != null && (
                  <Button variant="outlined" startIcon={<PublishOutlinedIcon />} onClick={() => setIssuingAll(true)}>
                    Phát hành nháp kỳ {formatPeriod(period)}
                  </Button>
                )}
                {canExport && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon />}
                    onClick={() => feeNoticeApi.exportExcel(list.apiParams).catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))}
                  >
                    Xuất Excel
                  </Button>
                )}
              </>
            }
            onAdd={buildingId != null ? () => setGenerating(true) : undefined}
            addLabel="Tạo hàng loạt"
            addPermission="FEE_NOTICE_WRITE"
          />
        }
      >
        <DataTable
          columns={columns}
          rows={data?.content ?? []}
          getRowId={(n) => n.id}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          filters={list.filters}
          onFilterChange={list.setFilter}
          sort={list.sort}
          onSortChange={list.setSort}
          onRowClick={(n) => navigate(`/fee-notices/${n.id}`)}
          rowActions={rowActions}
          highlightRow={(n) => n.status === 'OVERDUE'}
          emptyMessage={
            list.hasFilters
              ? 'Không có thông báo phí phù hợp với bộ lọc'
              : buildingId == null
                ? 'Chưa có thông báo phí nào. Chọn một tòa nhà để tạo hàng loạt.'
                : 'Chưa có thông báo phí nào. Bấm "Tạo hàng loạt" để tạo theo kỳ.'
          }
          page={list.page}
          size={list.size}
          total={data?.totalElements ?? 0}
          onPageChange={list.setPage}
          onSizeChange={list.setSize}
        />
      </ListPageLayout>
      <GenerateFeeNoticeDialog
        open={generating}
        defaultPeriod={period ?? shiftPeriod(currentPeriod(), -1)}
        onClose={() => setGenerating(false)}
        onCreated={(p) => list.setFilter('period', p)}
      />
      <PaymentFormDialog open={!!paying} notice={paying} onClose={() => setPaying(null)} />
      <PdfPreviewDialog
        path={pdf ? feeNoticeApi.pdfPath(pdf.id) : null}
        title={`Thông báo phí ${pdf?.code ?? ''}`}
        fileName={`thong-bao-phi-${pdf?.code.toLowerCase() ?? ''}.pdf`}
        onClose={() => setPdf(null)}
      />
      <ConfirmDialog
        open={!!pending}
        title={pending?.type === 'issue' ? 'Phát hành thông báo phí?' : 'Xoá thông báo nháp?'}
        message={<b>{pending?.notice.code} · căn {pending?.notice.apartmentCode}</b>}
        confirmLabel={pending?.type === 'issue' ? 'Phát hành' : 'Xoá'}
        variant={pending?.type === 'delete' ? 'danger' : undefined}
        loading={action.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmPending()}
      />
      <ConfirmDialog
        open={issuingAll}
        title={`Phát hành mọi thông báo nháp kỳ ${formatPeriod(period)}?`}
        message="Số liệu điện nước của kỳ bị khoá với các căn được phát hành; cư dân nhận thông báo."
        confirmLabel="Phát hành"
        loading={issueAll.isPending}
        onClose={() => setIssuingAll(false)}
        onConfirm={() => void confirmIssueAll()}
      />
    </>
  )
}
