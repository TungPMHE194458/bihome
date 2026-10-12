import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { APARTMENT_TYPE_OPTIONS } from '@/features/apartment/constants'
import type { ApartmentType } from '@/features/apartment/types'
import { useFeeRates, useSaveFeeRates } from '@/features/feerate/api'
import { formToRequest, ratesToForm, tieredCost, validateRates, type FeeRateForm, type TierRow } from '@/features/feerate/schema'
import type { FeeRates } from '@/features/feerate/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

/** Đơn giá tính thông báo phí của tòa đang chọn. */
export function FeeRatePage() {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data, isLoading, error, refetch } = useFeeRates()
  return (
    <Stack spacing={2}>
      <PageBreadcrumb title="Đơn giá" parents={[{ label: 'Thông báo phí', to: '/fee-notices' }]} />
      {buildingId == null ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <EmptyState message="Chọn một tòa nhà ở thanh trên cùng để cấu hình đơn giá." />
        </Paper>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <RateForm key={`${data.buildingId}-${data.version ?? 'new'}`} rates={data} />
      )}
    </Stack>
  )
}

const money = { endAdornment: <InputAdornment position="end">đ</InputAdornment> }

function RateForm({ rates }: { rates: FeeRates }) {
  const { enqueueSnackbar } = useSnackbar()
  const canWrite = usePermission('FEE_NOTICE_WRITE')
  const save = useSaveFeeRates()
  const [form, setForm] = useState<FeeRateForm>(() => ratesToForm(rates))
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => setForm(ratesToForm(rates)), [rates])
  const set = (patch: Partial<FeeRateForm>) => setForm((f) => ({ ...f, ...patch }))

  const submit = async () => {
    const found = validateRates(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      enqueueSnackbar('Vui lòng kiểm tra các ô báo lỗi.', { variant: 'warning' })
      return
    }
    try {
      await save.mutateAsync(formToRequest(form, rates.version))
      enqueueSnackbar('Đã lưu đơn giá.', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Stack spacing={2}>
      <Section title={`Chung · ${rates.buildingName}`} description="VAT tính trên phí quản lý, điện, nước, gửi xe và phí khác của kỳ.">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="VAT" value={form.vatPercent} disabled={!canWrite} onChange={(e) => set({ vatPercent: e.target.value })}
            error={!!errors.vatPercent} helperText={errors.vatPercent}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { inputMode: 'decimal' } }} />
          <TextField label="Hạn thanh toán (ngày của tháng sau kỳ)" value={form.dueDay} disabled={!canWrite}
            onChange={(e) => set({ dueDay: e.target.value })} error={!!errors.dueDay} helperText={errors.dueDay ?? 'Tháng ít ngày hơn thì lấy ngày cuối tháng'}
            sx={{ minWidth: 300 }} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Stack>
      </Section>

      <Section title="Phí quản lý (đ/m²/tháng)" description="Để trống = loại căn đó không tính phí quản lý.">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          {APARTMENT_TYPE_OPTIONS.map((o) => (
            <TextField key={o.value} label={o.label} size="small" disabled={!canWrite}
              value={form.management[o.value as ApartmentType] ?? ''}
              onChange={(e) => set({ management: { ...form.management, [o.value]: e.target.value } })}
              slotProps={{ input: money, htmlInput: { inputMode: 'decimal' } }} />
          ))}
        </Box>
      </Section>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <TierEditor title="Giá điện bậc thang" unit="kWh" sample={250} rows={form.electric} prefix="electric" errors={errors}
          disabled={!canWrite} onChange={(electric) => set({ electric })} />
        <TierEditor title="Giá nước bậc thang" unit="m³" sample={25} rows={form.water} prefix="water" errors={errors}
          disabled={!canWrite} onChange={(water) => set({ water })} />
      </Box>

      <Section title="Phí gửi xe (đ/chiếc/tháng)" description="Số chiếc = hạng mục xe đang hoạt động của căn theo danh mục.">
        {rates.categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Tòa chưa có danh mục tài sản (Hạng mục căn hộ › Danh mục).
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
            {rates.categories.map((c) => (
              <TextField key={c.id} label={c.name} size="small" disabled={!canWrite} value={form.parking[c.id] ?? ''}
                onChange={(e) => set({ parking: { ...form.parking, [c.id]: e.target.value } })}
                slotProps={{ input: money, htmlInput: { inputMode: 'numeric' } }} />
            ))}
          </Box>
        )}
      </Section>

      <Section title="Phí khác cố định (mỗi căn / tháng)">
        <Stack spacing={1.5}>
          {form.others.map((o, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
              <TextField size="small" label="Tên khoản" value={o.name} disabled={!canWrite} sx={{ flex: 2 }}
                error={!!errors[`others.${i}.name`]} helperText={errors[`others.${i}.name`]}
                onChange={(e) => set({ others: form.others.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
              <TextField size="small" label="Số tiền" value={o.amount} disabled={!canWrite} sx={{ flex: 1 }}
                error={!!errors[`others.${i}.amount`]} helperText={errors[`others.${i}.amount`]}
                onChange={(e) => set({ others: form.others.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)) })}
                slotProps={{ input: money, htmlInput: { inputMode: 'numeric' } }} />
              {canWrite && (
                <IconButton aria-label={`Xoá khoản ${o.name || i + 1}`} onClick={() => set({ others: form.others.filter((_, k) => k !== i) })}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
          {canWrite && (
            <Box>
              <Button startIcon={<AddIcon />} onClick={() => set({ others: [...form.others, { name: '', amount: '' }] })}>
                Thêm khoản
              </Button>
            </Box>
          )}
        </Stack>
      </Section>

      {canWrite && (
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" size="large" disabled={save.isPending} onClick={() => void submit()}
            startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}>
            Lưu đơn giá
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} aria-label={title}>
      <Typography fontWeight={700}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: description ? 0 : 1.5 }}>{children}</Box>
    </Paper>
  )
}

interface TierEditorProps {
  title: string
  unit: string
  sample: number
  rows: TierRow[]
  prefix: string
  errors: Record<string, string>
  disabled: boolean
  onChange: (rows: TierRow[]) => void
}

function TierEditor({ title, unit, sample, rows, prefix, errors, disabled, onChange }: TierEditorProps) {
  const update = (i: number, patch: Partial<TierRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <Section title={title} description={`Mỗi bậc tính đến mốc tiêu thụ cộng dồn; bậc cuối áp cho phần còn lại.`}>
      <Stack spacing={1.5}>
        {rows.map((r, i) => {
          const last = i === rows.length - 1
          const from = i === 0 ? '0' : rows[i - 1].upTo || '?'
          return (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
              <Typography variant="body2" sx={{ pt: 1, width: 60 }}>
                Bậc {i + 1}
              </Typography>
              <TextField size="small" label={`Từ ${from} đến (${unit})`} value={last ? '' : r.upTo} disabled={disabled || last}
                placeholder={last ? 'Còn lại' : ''} error={!!errors[`${prefix}.${i}.upTo`]} helperText={errors[`${prefix}.${i}.upTo`]}
                onChange={(e) => update(i, { upTo: e.target.value })} sx={{ flex: 1 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
              <TextField size="small" label={`Đơn giá (đ/${unit})`} value={r.unitPrice} disabled={disabled}
                error={!!errors[`${prefix}.${i}.unitPrice`]} helperText={errors[`${prefix}.${i}.unitPrice`]}
                onChange={(e) => update(i, { unitPrice: e.target.value })} sx={{ flex: 1 }} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
              {!disabled && (
                <IconButton aria-label={`Xoá bậc ${i + 1} ${title}`} onClick={() => onChange(rows.filter((_, k) => k !== i))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          )
        })}
        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Chưa có bậc giá — chưa tính tiền {title.includes('điện') ? 'điện' : 'nước'}.
          </Typography>
        )}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {!disabled ? (
            <Button startIcon={<AddIcon />} onClick={() => onChange([...rows, { upTo: '', unitPrice: '' }])}>
              Thêm bậc
            </Button>
          ) : (
            <span />
          )}
          {rows.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              Ví dụ {sample} {unit}: {formatCurrency(tieredCost(sample, rows))}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Section>
  )
}
