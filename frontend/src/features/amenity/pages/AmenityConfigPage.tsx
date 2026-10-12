import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { WeeklySlotEditor } from '@/features/amenity/components/WeeklySlotEditor'
import { DAY_TYPE_OPTIONS, PRICE_UNIT_OPTIONS, findOverlap } from '@/features/amenity/constants'
import { useAmenityConfig, useAmenityOptions, useSaveAmenityConfig } from '@/features/amenity/hooks'
import type { AmenityConfig, AmenityConfigRequest, DayType, Maintenance, PriceRule, PriceUnit } from '@/features/amenity/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

type Draft = AmenityConfigRequest

const toDraft = (c: AmenityConfig): Draft => ({
  slotMinutes: c.slotMinutes,
  maxBookingsPerWeek: c.maxBookingsPerWeek ?? null,
  maxAdvanceDays: c.maxAdvanceDays,
  freeCancelHours: c.freeCancelHours,
  slots: c.slots,
  prices: c.prices,
  maintenances: c.maintenances,
  version: c.version,
})

/** Kiểm tra phía client (giống backend) để báo lỗi trước khi lưu. */
function validate(d: Draft, c: AmenityConfig): string[] {
  const errors: string[] = []
  if (!(d.slotMinutes >= 15 && d.slotMinutes <= 720)) errors.push('Thời lượng mỗi lượt từ 15 đến 720 phút.')
  const overlap = findOverlap(d.slots)
  if (overlap) errors.push(overlap)
  if (d.slots.some((s) => s.startTime < c.openTime || s.endTime > c.closeTime)) {
    errors.push(`Có khung giờ nằm ngoài giờ mở cửa ${c.openTime}–${c.closeTime}.`)
  }
  for (const type of ['WEEKDAY', 'WEEKEND'] as DayType[]) {
    const rules = d.prices.filter((p) => p.dayType === type).sort((a, b) => a.startTime.localeCompare(b.startTime))
    if (rules.some((p) => !p.startTime || !p.endTime || p.endTime <= p.startTime)) errors.push('Mức giá: giờ kết thúc phải sau giờ bắt đầu.')
    if (rules.some((p, i) => i > 0 && p.startTime < rules[i - 1].endTime)) {
      errors.push(`${type === 'WEEKEND' ? 'Cuối tuần' : 'Ngày thường'}: các mức giá bị chồng nhau.`)
    }
  }
  if (d.maintenances.some((m) => !m.startDate || !m.endDate || m.endDate < m.startDate)) {
    errors.push('Đợt bảo trì: ngày kết thúc phải sau hoặc bằng ngày bắt đầu.')
  }
  return errors
}

const digits = (v: string) => v.replace(/\D/g, '')

/** Cấu hình tiện ích: chọn tiện ích → thiết lập chung, khung giờ theo thứ, giá theo khung giờ, ngày bảo trì. */
export function AmenityConfigPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [params, setParams] = useSearchParams()
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const canWrite = usePermission('AMENITY_WRITE')
  const amenityId = params.get('amenityId') ? Number(params.get('amenityId')) : undefined
  const { data: options = [], isLoading: loadingOptions } = useAmenityOptions(buildingId)
  const { data: config, isLoading, error, refetch } = useAmenityConfig(amenityId)
  const save = useSaveAmenityConfig()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [serverError, setServerError] = useState<string>()

  useEffect(() => {
    setDraft(config ? toDraft(config) : null)
    setServerError(undefined)
  }, [config])

  const dirty = useMemo(() => !!config && !!draft && JSON.stringify(toDraft(config)) !== JSON.stringify(draft), [config, draft])
  const errors = config && draft ? validate(draft, config) : []
  const update = (patch: Partial<Draft>) => draft && setDraft({ ...draft, ...patch })
  const selected = options.find((o) => o.id === amenityId) ?? (config ? { id: config.amenityId, code: config.amenityCode, name: config.amenityName, buildingId: 0, status: 'ACTIVE' as const } : null)

  const submit = async () => {
    if (!draft || !amenityId || errors.length) return
    setServerError(undefined)
    try {
      await save.mutateAsync({ id: amenityId, body: draft })
      enqueueSnackbar('Đã lưu cấu hình tiện ích.', { variant: 'success' })
    } catch (e) {
      setServerError(getErrorMessage(e))
    }
  }

  let body: ReactNode
  if (buildingId == null && !amenityId) {
    body = <Alert severity="info">Chọn một tòa nhà ở thanh trên cùng để cấu hình tiện ích của tòa đó.</Alert>
  } else if (!amenityId) {
    body = <EmptyState message={options.length ? 'Chọn tiện ích cần cấu hình' : 'Tòa nhà chưa có tiện ích đang hoạt động'} />
  } else if (error) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />
  } else if (isLoading || !config || !draft) {
    body = <Skeleton variant="rounded" height={420} />
  } else {
    body = (
      <Stack spacing={2}>
        <Section title="Thiết lập chung" subtitle={`Giờ mở cửa ${config.openTime}–${config.closeTime} · sức chứa ${config.capacity} người`}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            <TextField
              label="Thời lượng mỗi lượt"
              value={draft.slotMinutes || ''}
              onChange={(e) => update({ slotMinutes: Number(digits(e.target.value)) })}
              disabled={!canWrite}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">phút</InputAdornment> } }}
            />
            <TextField
              label="Số lượt tối đa mỗi căn / tuần"
              value={draft.maxBookingsPerWeek ?? ''}
              placeholder="Không giới hạn"
              onChange={(e) => update({ maxBookingsPerWeek: digits(e.target.value) ? Number(digits(e.target.value)) : null })}
              disabled={!canWrite}
            />
            <TextField
              label="Đặt trước tối đa"
              value={draft.maxAdvanceDays || ''}
              onChange={(e) => update({ maxAdvanceDays: Number(digits(e.target.value)) })}
              disabled={!canWrite}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">ngày</InputAdornment> } }}
            />
            <TextField
              label="Huỷ miễn phí trước"
              value={draft.freeCancelHours}
              onChange={(e) => update({ freeCancelHours: Number(digits(e.target.value) || 0) })}
              disabled={!canWrite}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">giờ</InputAdornment> } }}
            />
          </Box>
        </Section>

        <Section title="Khung giờ theo thứ trong tuần" subtitle="Ngày không có khung giờ = đóng cửa, không nhận đặt chỗ.">
          <WeeklySlotEditor
            slots={draft.slots}
            onChange={(slots) => update({ slots })}
            openTime={config.openTime}
            closeTime={config.closeTime}
            slotMinutes={draft.slotMinutes || 60}
            capacity={config.capacity}
            disabled={!canWrite}
          />
        </Section>

        <Section title="Giá theo khung giờ" subtitle="Lượt bắt đầu trong khoảng giờ của mức giá thì áp giá đó; không khớp mức nào = miễn phí.">
          <PriceRows prices={draft.prices} onChange={(prices) => update({ prices })} disabled={!canWrite} />
        </Section>

        <Section title="Ngày nghỉ bảo trì" subtitle="Không nhận đặt chỗ trong các ngày này.">
          <MaintenanceRows rows={draft.maintenances} onChange={(maintenances) => update({ maintenances })} disabled={!canWrite} />
        </Section>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title="Cấu hình tiện ích" />
        <Autocomplete
          value={selected}
          options={options}
          loading={loadingOptions}
          getOptionLabel={(o) => `${o.name} (${o.code})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => setParams(v ? { amenityId: String(v.id) } : {}, { replace: true })}
          sx={{ width: 320 }}
          renderInput={(p) => <TextField {...p} label="Tiện ích" size="small" />}
        />
      </Box>
      {body}
      {config && draft && canWrite && (
        <Paper
          elevation={6}
          sx={{ position: 'sticky', bottom: 16, p: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', zIndex: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 240 }}>
            {serverError ? (
              <Typography color="error.main" variant="body2">{serverError}</Typography>
            ) : errors.length ? (
              <Typography color="error.main" variant="body2">{errors[0]}</Typography>
            ) : (
              <Typography color="text.secondary" variant="body2">
                {dirty ? 'Có thay đổi chưa lưu.' : `Lưu lần cuối ${formatDateTime(config.updatedAt)}${config.updatedBy ? ` · ${config.updatedBy}` : ''}`}
              </Typography>
            )}
          </Box>
          <Button color="inherit" disabled={!dirty || save.isPending} onClick={() => setDraft(toDraft(config))}>
            Huỷ thay đổi
          </Button>
          <Button variant="contained" disabled={!dirty || errors.length > 0 || save.isPending} onClick={() => void submit()}>
            Lưu cấu hình
          </Button>
        </Paper>
      )}
    </Stack>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  )
}

const timeProps = { inputLabel: { shrink: true }, htmlInput: { step: 300 } }

function PriceRows({ prices, onChange, disabled }: { prices: PriceRule[]; onChange: (p: PriceRule[]) => void; disabled: boolean }) {
  const set = (i: number, patch: Partial<PriceRule>) => onChange(prices.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <Stack spacing={1.25}>
      {prices.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Chưa có mức giá — mọi lượt đều miễn phí.
        </Typography>
      )}
      {prices.map((p, i) => (
        <Stack key={i} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} role="group" aria-label={`Mức giá ${i + 1}`}>
          <TextField select size="small" label="Loại ngày" value={p.dayType} onChange={(e) => set(i, { dayType: e.target.value as DayType })} disabled={disabled} sx={{ minWidth: 190 }}>
            {DAY_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="time" label="Từ" value={p.startTime} onChange={(e) => set(i, { startTime: e.target.value })} disabled={disabled} slotProps={timeProps} />
          <TextField size="small" type="time" label="Đến" value={p.endTime} onChange={(e) => set(i, { endTime: e.target.value })} disabled={disabled} slotProps={timeProps} />
          <TextField
            size="small"
            label="Giá"
            value={p.price}
            onChange={(e) => set(i, { price: Number(digits(e.target.value) || 0) })}
            disabled={disabled}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">đ</InputAdornment> } }}
          />
          <TextField select size="small" label="Tính theo" value={p.priceUnit} onChange={(e) => set(i, { priceUnit: e.target.value as PriceUnit })} disabled={disabled} sx={{ minWidth: 140 }}>
            {PRICE_UNIT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <IconButton aria-label={`Xoá mức giá ${i + 1}`} onClick={() => onChange(prices.filter((_, j) => j !== i))} disabled={disabled}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => onChange([...prices, { dayType: 'WEEKEND', startTime: '08:00', endTime: '17:00', price: 0, priceUnit: 'PER_BOOKING' }])}
        >
          Thêm mức giá
        </Button>
      </Box>
    </Stack>
  )
}

function MaintenanceRows({ rows, onChange, disabled }: { rows: Maintenance[]; onChange: (m: Maintenance[]) => void; disabled: boolean }) {
  const set = (i: number, patch: Partial<Maintenance>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <Stack spacing={1.25}>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Không có lịch bảo trì.
        </Typography>
      )}
      {rows.map((r, i) => (
        <Stack key={i} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} role="group" aria-label={`Đợt bảo trì ${i + 1}`}>
          <TextField size="small" type="date" label="Từ ngày" value={r.startDate} onChange={(e) => set(i, { startDate: e.target.value })} disabled={disabled} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="Đến ngày" value={r.endDate} onChange={(e) => set(i, { endDate: e.target.value })} disabled={disabled} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Lý do" value={r.reason ?? ''} onChange={(e) => set(i, { reason: e.target.value })} disabled={disabled} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 500 } }} />
          <IconButton aria-label={`Xoá đợt bảo trì ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={disabled}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10)
            onChange([...rows, { startDate: today, endDate: today, reason: '' }])
          }}
        >
          Thêm đợt bảo trì
        </Button>
      </Box>
    </Stack>
  )
}
