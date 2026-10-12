import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { BarChart } from '@mui/x-charts/BarChart'
import { LineChart } from '@mui/x-charts/LineChart'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { brand } from '@/app/theme'
import { Can } from '@/components/Can'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { useAmenityOptions } from '@/features/amenity/hooks'
import { reportApi, useAmenityReport, type ReportParams } from '@/features/amenityreport/api'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { getErrorMessage } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

type Preset = 'week' | 'month' | 'last30' | 'custom'
const pct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString('vi-VN')}%`

function rangeOf(preset: Preset): { from: string; to: string } {
  const today = dayjs()
  if (preset === 'week') {
    const monday = today.subtract((today.day() + 6) % 7, 'day')
    return { from: monday.format('YYYY-MM-DD'), to: monday.add(6, 'day').format('YYYY-MM-DD') }
  }
  if (preset === 'last30') return { from: today.subtract(29, 'day').format('YYYY-MM-DD'), to: today.format('YYYY-MM-DD') }
  return { from: today.startOf('month').format('YYYY-MM-DD'), to: today.endOf('month').format('YYYY-MM-DD') }
}

/** Báo cáo tiện ích theo khoảng ngày sử dụng: KPI, lượt theo ngày, top tiện ích, phân bố khung giờ, xuất Excel. */
export function AmenityReportPage() {
  const { enqueueSnackbar } = useSnackbar()
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: amenities = [] } = useAmenityOptions(buildingId)
  const [preset, setPreset] = useState<Preset>('month')
  const [params, setParams] = useState<ReportParams>(() => rangeOf('month'))
  const { data, isLoading, error, refetch } = useAmenityReport(params)
  const [exporting, setExporting] = useState(false)
  const amenity = amenities.find((a) => a.id === params.amenityId) ?? null

  const choosePreset = (p: Preset | null) => {
    if (!p) return
    setPreset(p)
    if (p !== 'custom') setParams((x) => ({ ...x, ...rangeOf(p) }))
  }

  const setRange = (range: Partial<ReportParams>) => {
    setPreset('custom')
    setParams((x) => ({ ...x, ...range }))
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await reportApi.exportExcel(params)
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <PageBreadcrumb title="Báo cáo tiện ích" />
        <Can permission="AMENITY_REPORT_EXPORT">
          <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => void exportExcel()} disabled={exporting}>
            Xuất Excel
          </Button>
        </Can>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', borderRadius: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v: Preset | null) => choosePreset(v)} aria-label="Khoảng thời gian">
          <ToggleButton value="week">Tuần này</ToggleButton>
          <ToggleButton value="month">Tháng này</ToggleButton>
          <ToggleButton value="last30">30 ngày qua</ToggleButton>
          <ToggleButton value="custom">Tuỳ chọn</ToggleButton>
        </ToggleButtonGroup>
        <DatePicker
          label="Từ ngày"
          value={dayjs(params.from)}
          format="DD/MM/YYYY"
          onChange={(v) => v?.isValid() && setRange({ from: v.format('YYYY-MM-DD') })}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <DatePicker
          label="Đến ngày"
          value={dayjs(params.to)}
          format="DD/MM/YYYY"
          minDate={dayjs(params.from)}
          onChange={(v) => v?.isValid() && setRange({ to: v.format('YYYY-MM-DD') })}
          slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
        />
        <Autocomplete
          value={amenity}
          options={amenities}
          getOptionLabel={(o) => o.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => setParams((x) => ({ ...x, amenityId: v?.id }))}
          size="small"
          sx={{ width: 240 }}
          renderInput={(p) => <TextField {...p} label="Tiện ích" placeholder="Tất cả tiện ích" />}
        />
      </Paper>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            <KpiCard
              icon={<EventAvailableOutlinedIcon />}
              color="#2563EB"
              label="Tổng lượt đặt"
              loading={isLoading}
              value={data && formatNumber(data.totalBookings)}
              hint={data && `${formatNumber(data.activeBookings)} lượt giữ chỗ · ${formatNumber(data.people)} người`}
            />
            <KpiCard
              icon={<PieChartOutlineIcon />}
              color={brand.primary}
              label="Tỉ lệ lấp đầy"
              loading={isLoading}
              value={data && pct(data.fillRate)}
              hint="Người giữ chỗ / sức chứa các khung giờ"
            />
            <KpiCard
              icon={<PaymentsOutlinedIcon />}
              color="#F59E0B"
              label="Doanh thu"
              loading={isLoading}
              value={data && formatCurrency(data.revenue)}
              hint={data && `Đã thu ${formatCurrency(data.collected)}`}
            />
            <KpiCard
              icon={<EventBusyOutlinedIcon />}
              color="#DC2626"
              label="Tỉ lệ huỷ"
              loading={isLoading}
              value={data && pct(data.cancelRate)}
              hint={data && `${formatNumber(data.cancelledBookings)} lượt huỷ / từ chối`}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
            <ChartCard title="Lượt đặt theo ngày" subtitle="Lượt giữ chỗ và hoàn thành theo ngày sử dụng">
              {data && (
                <LineChart
                  height={280}
                  xAxis={[{ scaleType: 'point', data: data.byDay.map((d) => dayjs(d.date).format('DD/MM')) }]}
                  yAxis={[{ tickMinStep: 1 }]}
                  series={[
                    { data: data.byDay.map((d) => d.bookings), label: 'Lượt đặt', color: '#2563EB', area: true, showMark: false, curve: 'linear' },
                    { data: data.byDay.map((d) => d.people), label: 'Số người', color: brand.primary, showMark: false, curve: 'linear' },
                  ]}
                  margin={{ left: 0, right: 10 }}
                />
              )}
            </ChartCard>
            <ChartCard
              title="Phân bố khung giờ"
              subtitle="Theo giờ bắt đầu"
              empty={data && data.bySlot.length === 0 ? 'Chưa có lượt đặt trong khoảng này.' : undefined}
            >
              {data && (
                <BarChart
                  height={280}
                  layout="horizontal"
                  yAxis={[{ scaleType: 'band', data: data.bySlot.map((s) => s.startTime) }]}
                  xAxis={[{ tickMinStep: 1 }]}
                  series={[{ data: data.bySlot.map((s) => s.bookings), label: 'Lượt đặt', color: '#F59E0B' }]}
                  margin={{ left: 10, right: 10 }}
                />
              )}
            </ChartCard>
          </Box>

          <ChartCard title="Top tiện ích" subtitle="Sắp xếp theo số lượt đặt">
            {data && (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" aria-label="Top tiện ích">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tiện ích</TableCell>
                      <TableCell align="right">Lượt đặt</TableCell>
                      <TableCell align="right">Huỷ / từ chối</TableCell>
                      <TableCell align="right">Số người</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>Lấp đầy</TableCell>
                      <TableCell align="right">Doanh thu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.byAmenity.map((a) => (
                      <TableRow key={a.amenityId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {a.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {a.code}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatNumber(a.bookings)}</TableCell>
                        <TableCell align="right">{formatNumber(a.cancelled)}</TableCell>
                        <TableCell align="right">{formatNumber(a.people)}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100', overflow: 'hidden' }}>
                              <Box sx={{ width: `${Math.min(100, a.fillRate * 100)}%`, height: '100%', bgcolor: 'primary.main' }} />
                            </Box>
                            <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'right' }}>
                              {a.capacity ? pct(a.fillRate) : '—'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(a.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </ChartCard>
        </>
      )}
    </Stack>
  )
}
