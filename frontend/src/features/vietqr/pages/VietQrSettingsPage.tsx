import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FormTextField } from '@/components/form/FormTextField'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { StatusChip } from '@/components/StatusChip'
import { useFeeNotices } from '@/features/feenotice/hooks'
import { useBankTransactions, useSaveVietQr, useSimulatePayment, useVietQrSettings } from '@/features/vietqr/api'
import { BANKS, MATCH_OPTIONS, MATCH_STATUS } from '@/features/vietqr/constants'
import { previewContent, vietQrSchema, vietQrToForm, vietQrToRequest, type VietQrFormValues } from '@/features/vietqr/schema'
import type { BankTransaction, WebhookResult } from '@/features/vietqr/types'
import { useListParams } from '@/hooks/useListParams'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { formatPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

const FILTER_KEYS = ['keyword', 'matchStatus', 'from', 'to'] as const

/** Thanh toán tự động VietQR: tài khoản nhận tiền của tòa, webhook ngân hàng, giả lập và biến động số dư đã nhận. */
export function VietQrSettingsPage() {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return (
    <Stack spacing={2}>
      <PageBreadcrumb title="Thanh toán tự động (VietQR)" />
      {buildingId == null ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <EmptyState message="Chọn một tòa nhà ở thanh trên cùng để cấu hình tài khoản nhận tiền VietQR." />
        </Paper>
      ) : (
        <>
          <SettingsForm key={buildingId} />
          <BankTransactions />
        </>
      )}
    </Stack>
  )
}

function SettingsForm() {
  const { enqueueSnackbar } = useSnackbar()
  const canWrite = usePermission('VIETQR_WRITE')
  const { data, isLoading, error, refetch } = useVietQrSettings(true)
  const save = useSaveVietQr()
  const { control, handleSubmit, reset, setError, formState } = useForm<VietQrFormValues>({
    resolver: zodResolver(vietQrSchema),
    defaultValues: vietQrToForm(),
  })
  const template = useWatch({ control, name: 'contentTemplate' })

  useEffect(() => {
    if (data) reset(vietQrToForm(data))
  }, [data, reset])

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !data) return <Skeleton variant="rounded" height={260} />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(vietQrToRequest(values, data.version))
      enqueueSnackbar('Đã lưu cấu hình VietQR.', { variant: 'success' })
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['bankBin', 'accountNo', 'accountName', 'contentTemplate'])) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, alignItems: 'start' }}>
      <Paper component="form" variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} onSubmit={onSubmit} noValidate>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography fontWeight={700}>Tài khoản nhận tiền · {data.buildingName}</Typography>
          {data.version == null && <StatusChip label="Chưa cấu hình" tone="warning" />}
        </Stack>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Controller
            name="bankBin"
            control={control}
            render={({ field, fieldState }) => (
              <TextField select label="Ngân hàng" required disabled={!canWrite} value={field.value} onChange={field.onChange}
                error={!!fieldState.error} helperText={fieldState.error?.message}>
                {BANKS.map((b) => (
                  <MenuItem key={b.bin} value={b.bin}>
                    {b.name} ({b.bin})
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <FormTextField name="accountNo" control={control} label="Số tài khoản" required disabled={!canWrite} />
          <FormTextField name="accountName" control={control} label="Tên chủ tài khoản" required disabled={!canWrite}
            helperText="Lưu không dấu, viết hoa như ngân hàng hiển thị" />
          <FormTextField name="contentTemplate" control={control} label="Mẫu nội dung chuyển khoản" required disabled={!canWrite} />
          <Typography variant="body2" sx={{ gridColumn: '1 / -1' }}>
            Ví dụ nội dung: <b>{previewContent(template ?? '')}</b>
          </Typography>
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} disabled={!canWrite} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Hiện mã VietQR trên thông báo phí"
                sx={{ gridColumn: '1 / -1' }}
              />
            )}
          />
        </Box>
        {canWrite && (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" startIcon={formState.isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={formState.isSubmitting}>
              Lưu cấu hình
            </Button>
          </Stack>
        )}
      </Paper>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            Webhook biến động số dư
          </Typography>
          <Typography variant="body2">
            Ngân hàng / cổng thanh toán gọi <code>POST {data.webhookPath}</code> kèm header <code>X-Webhook-Secret</code>. Hệ thống tìm mã
            thông báo phí trong nội dung chuyển khoản và tạo phiếu thu VietQR tự động; gửi lại cùng mã giao dịch không bị ghi trùng.
          </Typography>
        </Paper>
        {data.simulationEnabled && data.version != null && <Simulator />}
      </Stack>
    </Box>
  )
}

function Simulator() {
  const { enqueueSnackbar } = useSnackbar()
  const canCollect = usePermission('PAYMENT_WRITE')
  const canConfigure = usePermission('VIETQR_WRITE')
  const canPay = canCollect && canConfigure
  const { data, isLoading: loadingNotices, error: noticesError } = useFeeNotices({ unpaid: 'true', size: 50, sort: 'period,desc' }, canPay)
  const simulate = useSimulatePayment()
  const [noticeId, setNoticeId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<WebhookResult | null>(null)
  if (!canPay) return null
  const notices = data?.content ?? []

  const run = async () => {
    if (noticeId === '') return
    try {
      const r = await simulate.mutateAsync({ feeNoticeId: noticeId, amount: amount.trim() ? Number(amount.replace(/\./g, '')) : null })
      setResult(r)
      setAmount('')
      setNoticeId('')
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} aria-label="Giả lập thanh toán">
      <Typography fontWeight={700}>Giả lập chuyển khoản (môi trường thử)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Tạo một biến động số dư như ngân hàng gửi sang, theo đúng nội dung chuyển khoản của thông báo phí.
      </Typography>
      <Stack spacing={1.5}>
        <TextField select size="small" label="Thông báo phí còn nợ" value={noticeId} onChange={(e) => setNoticeId(Number(e.target.value))}>
          {notices.length === 0 && (
            <MenuItem value="" disabled>
              {noticesError ? getErrorMessage(noticesError) : loadingNotices ? 'Đang tải...' : 'Không có thông báo nào còn nợ'}
            </MenuItem>
          )}
          {notices.map((n) => (
            <MenuItem key={n.id} value={n.id}>
              {n.code} · {n.apartmentCode} · kỳ {formatPeriod(n.period)} · còn {formatCurrency(n.outstanding)}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="Số tiền (bỏ trống = đúng số còn nợ)" value={amount} onChange={(e) => setAmount(e.target.value)}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <Button variant="outlined" startIcon={simulate.isPending ? <CircularProgress size={16} /> : <PlayCircleOutlineIcon />}
          disabled={noticeId === '' || simulate.isPending} onClick={() => void run()}>
          Gửi biến động số dư
        </Button>
        {result && (
          <Alert severity={result.status === 'MATCHED' ? 'success' : result.status === 'MISMATCHED' ? 'warning' : 'error'}>
            {result.status === 'MATCHED'
              ? `Đã khớp ${result.feeNoticeCode}, tạo phiếu thu ${result.paymentCode}.`
              : result.status === 'MISMATCHED'
                ? `Lệch số tiền: ${result.message} Phiếu thu ${result.paymentCode}.`
                : result.message}
          </Alert>
        )}
      </Stack>
    </Paper>
  )
}

function BankTransactions() {
  const list = useListParams({ filterKeys: FILTER_KEYS })
  const { data, isLoading, error, refetch } = useBankTransactions(list.apiParams)
  const columns: Column<BankTransaction>[] = [
    { key: 'transactedAt', header: 'Thời gian', sortable: true, filter: { type: 'dateRange', fromKey: 'from', toKey: 'to' },
      render: (b) => formatDateTime(b.transactedAt) },
    { key: 'bankReference', header: 'Mã giao dịch', render: (b) => (
      <>
        {b.bankReference}
        {b.simulated && <Typography variant="caption" color="text.secondary" component="div">Giả lập</Typography>}
      </>
    ) },
    { key: 'amount', header: 'Số tiền', align: 'right', sortable: true, render: (b) => <b>{formatCurrency(b.amount)}</b> },
    { key: 'content', header: 'Nội dung', render: (b) => (
      <Typography variant="body2" noWrap sx={{ maxWidth: 260 }} title={b.content ?? ''}>{b.content}</Typography>
    ) },
    { key: 'feeNoticeCode', header: 'Thông báo phí', render: (b) => b.feeNoticeCode ?? '' },
    { key: 'paymentCode', header: 'Phiếu thu', render: (b) => b.paymentCode ?? '' },
    { key: 'matchStatus', header: 'Kết quả', filter: { type: 'select', options: MATCH_OPTIONS }, render: (b) => (
      <Box>
        <StatusChip {...MATCH_STATUS[b.matchStatus]} />
        {b.matchNote && <Typography variant="caption" color="text.secondary" component="div" sx={{ maxWidth: 260 }}>{b.matchNote}</Typography>}
      </Box>
    ) },
  ]
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Biến động số dư đã nhận
      </Typography>
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
        highlightRow={(b) => b.matchStatus === 'UNMATCHED'}
        emptyMessage="Chưa nhận biến động số dư nào"
        page={list.page}
        size={list.size}
        total={data?.totalElements ?? 0}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
      />
    </Paper>
  )
}
