import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { brand } from '@/app/theme'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { useDashboard, type DashboardSummary } from '@/features/dashboard/api'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { QuickAccess } from '@/features/dashboard/components/QuickAccess'
import { TICKET_PRIORITY, TICKET_STATUS } from '@/features/ticket/constants'
import type { TicketPriority, TicketStatus } from '@/features/ticket/types'
import dayjs from '@/lib/dayjs'
import { formatDateTime, formatFileSize, formatNumber } from '@/lib/format'
import { formatPeriod } from '@/lib/period'
import { useAuthStore, usePermission } from '@/stores/authStore'

const CHART_COLORS = [
  '#1F9D55',
  '#2563EB',
  '#F59E0B',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#65A30D',
]
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

/** "Chủ nhật, ngày 11 tháng 10 năm 2026" */
function today(): string {
  const text = dayjs().format('dddd, [ngày] D [tháng] M [năm] YYYY')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const percent = (part: number, total: number) =>
  total > 0 ? `${Math.round((part * 100) / total)}%` : '—'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [month, setMonth] = useState(() => dayjs().startOf('month'))
  const canRead = usePermission('DASHBOARD_READ')
  const { data, isLoading, isFetching, error, refetch } = useDashboard(
    month.format('YYYY-MM'),
    canRead,
  )
  const monthLabel = `tháng ${month.format('MM/YYYY')}`

  return (
    <Stack spacing={2.5}>
      <Box sx={{ textAlign: 'center', pt: 1 }}>
        <Typography color="text.secondary">{today()}</Typography>
        <Typography variant="h5" fontWeight={800}>
          {greeting()}, {user?.profile.fullName ?? user?.username}
        </Typography>
      </Box>

      {canRead && (
        <Paper
          variant="outlined"
          sx={{
            alignSelf: 'center',
            borderRadius: 99,
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <DatePicker
            label="Kỳ thống kê"
            views={['year', 'month']}
            openTo="month"
            format="MM/YYYY"
            value={month}
            onChange={(v) => v && v.isValid() && setMonth(v.startOf('month'))}
            maxDate={dayjs().endOf('year')}
            slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
          />
          <Tooltip title="Tải lại số liệu">
            <span>
              <IconButton
                aria-label="Tải lại số liệu"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {data?.system && <SystemStrip system={data.system} />}
        </Paper>
      )}

      {!canRead ? null : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            <KpiCard
              icon={<PeopleOutlineIcon />}
              color="#1F9D55"
              label="Cư dân / Căn hộ"
              loading={isLoading}
              value={
                data && `${formatNumber(data.residentCount)} / ${formatNumber(data.apartmentCount)}`
              }
              hint={
                data &&
                `${percent(data.occupiedApartmentCount, data.apartmentCount)} căn có người ở · ${data.buildingCount} tòa`
              }
              to="/residents"
            />
            <KpiCard
              icon={<AssignmentLateOutlinedIcon />}
              color="#DC2626"
              label="Yêu cầu chưa giải quyết / Quá hạn"
              loading={isLoading}
              value={data && `${data.openTickets} / ${data.overdueTickets}`}
              hint="Quá hạn SLA phản hồi hoặc xử lý"
              to="/tickets?overdue=true"
            />
            <KpiCard
              icon={<EventAvailableOutlinedIcon />}
              color="#2563EB"
              label="Đăng ký tiện ích hôm nay / trong tháng"
              loading={isLoading}
              value={
                data?.amenityBookingsToday != null
                  ? `${data.amenityBookingsToday} / ${data.amenityBookingsInMonth ?? 0}`
                  : null
              }
              hint={
                data?.amenityBookingsToday == null
                  ? 'Có số liệu khi bật Đăng ký tiện ích'
                  : monthLabel
              }
              to="/amenity-bookings"
            />
            <KpiCard
              icon={<TaskAltOutlinedIcon />}
              color="#7C3AED"
              label={`Yêu cầu ${monthLabel}: tạo mới / hoàn thành`}
              loading={isLoading}
              value={data && `${data.ticketsCreatedInMonth} / ${data.ticketsResolvedInMonth}`}
              hint={
                data &&
                `Tỉ lệ hoàn thành ${percent(data.ticketsResolvedInMonth, data.ticketsCreatedInMonth)}`
              }
              to="/tickets"
            />
            <KpiCard
              icon={<BadgeOutlinedIcon />}
              color="#0891B2"
              label="Thẻ từ đang dùng / Voucher hiệu lực"
              loading={isLoading}
              value={data && `${data.activeAccessCards} / ${data.validVouchers}`}
              to="/access-cards"
            />
            <KpiCard
              icon={<ReceiptLongOutlinedIcon />}
              color="#F59E0B"
              label="Công nợ / Tỉ lệ thu phí"
              loading={isLoading}
              value={
                data?.feeDebt != null
                  ? `${formatNumber(data.feeDebt)} đ / ${data.feeCollectionRate != null ? `${Math.round(data.feeCollectionRate * 100)}%` : '—'}`
                  : null
              }
              hint={data?.feePeriod ? `Tỉ lệ thu kỳ ${formatPeriod(data.feePeriod)}` : 'Chưa phát hành thông báo phí'}
              to="/fee-notices?unpaid=true"
            />
          </Box>

          <Box
            sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}
          >
            <ChartCard
              title={`Yêu cầu theo tháng năm ${month.year()}`}
              subtitle="Số yêu cầu tạo mới và hoàn thành mỗi tháng"
            >
              {data && <TicketsByMonth data={data} />}
            </ChartCard>
            <ChartCard
              title="Yêu cầu theo danh mục"
              subtitle={`Tạo trong ${monthLabel}`}
              empty={
                data && data.ticketsByCategory.length === 0
                  ? `Chưa có yêu cầu nào trong ${monthLabel}.`
                  : undefined
              }
            >
              {data && (
                <PieChart
                  height={260}
                  colors={CHART_COLORS}
                  series={[
                    {
                      data: data.ticketsByCategory.map((c, i) => ({
                        id: c.key,
                        value: c.count,
                        label: c.name,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      })),
                      innerRadius: 50,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      highlightScope: { fade: 'global', highlight: 'item' },
                    },
                  ]}
                />
              )}
            </ChartCard>
          </Box>

          <Box
            sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' } }}
          >
            <ChartCard
              title="Yêu cầu đang mở theo trạng thái"
              empty={
                data && data.openTicketsByStatus.length === 0
                  ? 'Không có yêu cầu đang mở.'
                  : undefined
              }
            >
              {data && <OpenByStatus data={data} />}
            </ChartCard>
            <ChartCard
              title="Yêu cầu mới nhất cần xử lý"
              action={
                <Link component={RouterLink} to="/tickets" underline="hover" variant="body2">
                  Xem tất cả
                </Link>
              }
              empty={
                data && data.recentTickets.length === 0 ? 'Không có yêu cầu đang mở.' : undefined
              }
            >
              {data && <RecentTickets data={data} />}
            </ChartCard>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <ChartCard title="Lượt dùng tiện ích theo tuần" subtitle="Lượt giữ chỗ / hoàn thành theo ngày sử dụng, 8 tuần gần nhất">
              {data && (
                <BarChart
                  height={260}
                  xAxis={[{ scaleType: 'band', data: (data.bookingsByWeek ?? []).map((w) => dayjs(w.weekStart).format('DD/MM')) }]}
                  yAxis={[{ tickMinStep: 1 }]}
                  series={[
                    { data: (data.bookingsByWeek ?? []).map((w) => w.bookings), label: 'Lượt đặt', color: '#2563EB' },
                    { data: (data.bookingsByWeek ?? []).map((w) => w.people), label: 'Số người', color: '#F59E0B' },
                  ]}
                  margin={{ left: 0, right: 10 }}
                />
              )}
            </ChartCard>
            <ChartCard
              title="Thu phí 6 kỳ gần nhất"
              subtitle="Phát sinh của kỳ (không gồm nợ chuyển sang) và số đã thu"
              empty={data && !(data.feeByPeriod ?? []).some((f) => f.billed > 0) ? 'Chưa phát hành thông báo phí nào.' : undefined}
            >
              {data && (
                <BarChart
                  height={260}
                  xAxis={[{ scaleType: 'band', data: (data.feeByPeriod ?? []).map((f) => formatPeriod(f.period)) }]}
                  yAxis={[{ valueFormatter: (v: number | null) => (v == null ? '' : `${formatNumber(v / 1_000_000)} tr`) }]}
                  series={[
                    { data: (data.feeByPeriod ?? []).map((f) => f.billed), label: 'Phát sinh', color: '#94A3B8',
                      valueFormatter: (v: number | null) => `${formatNumber(v)} đ` },
                    { data: (data.feeByPeriod ?? []).map((f) => f.collected), label: 'Đã thu', color: '#1F9D55',
                      valueFormatter: (v: number | null) => `${formatNumber(v)} đ` },
                  ]}
                  margin={{ left: 10, right: 10 }}
                />
              )}
            </ChartCard>
          </Box>
        </>
      )}

      <QuickAccess />
    </Stack>
  )
}

function SystemStrip({ system }: { system: NonNullable<DashboardSummary['system']> }) {
  const item = (icon: ReactNode, value: string, label: string) => (
    <Stack direction="row" spacing={0.75} alignItems="center" title={label}>
      <Box sx={{ color: brand.primary, display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  )
  return (
    <Stack
      direction="row"
      spacing={2}
      flexWrap="wrap"
      useFlexGap
      sx={{ pl: 1, borderLeft: 1, borderColor: 'divider' }}
    >
      {item(
        <CloudOutlinedIcon fontSize="small" />,
        formatFileSize(system.storageBytes) || '0 B',
        `${system.fileCount} tệp`,
      )}
      {item(<GroupsOutlinedIcon fontSize="small" />, String(system.activeUsers), 'người dùng')}
      {item(
        <LoginOutlinedIcon fontSize="small" />,
        String(system.loginsToday),
        'đăng nhập hôm nay',
      )}
    </Stack>
  )
}

function TicketsByMonth({ data }: { data: DashboardSummary }) {
  return (
    <BarChart
      height={280}
      xAxis={[{ scaleType: 'band', data: MONTHS }]}
      yAxis={[{ tickMinStep: 1 }]}
      series={[
        { data: data.ticketsByMonth.map((p) => p.created), label: 'Tạo mới', color: '#2563EB' },
        {
          data: data.ticketsByMonth.map((p) => p.resolved),
          label: 'Hoàn thành',
          color: brand.primary,
        },
      ]}
      margin={{ left: 0, right: 10 }}
    />
  )
}

function OpenByStatus({ data }: { data: DashboardSummary }) {
  const total = data.openTicketsByStatus.reduce((s, x) => s + x.count, 0)
  return (
    <Stack spacing={1.5} sx={{ pt: 1 }}>
      {data.openTicketsByStatus.map((s) => {
        const style = TICKET_STATUS[s.key as TicketStatus]
        return (
          <Box key={s.key}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2">{style?.label ?? s.key}</Typography>
              <Typography variant="body2" fontWeight={700}>
                {s.count}
              </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${(s.count * 100) / total}%`,
                  bgcolor: 'primary.main',
                  borderRadius: 4,
                }}
              />
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}

function RecentTickets({ data }: { data: DashboardSummary }) {
  return (
    <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
      {data.recentTickets.map((t) => (
        <Stack key={t.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Link
              component={RouterLink}
              to={`/tickets/${t.id}`}
              underline="hover"
              fontWeight={600}
              variant="body2"
            >
              {t.code}
            </Link>
            <Typography variant="body2" noWrap>
              {t.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.categoryName} · {t.buildingName} · {formatDateTime(t.createdAt)}
            </Typography>
          </Box>
          <Stack spacing={0.5} alignItems="flex-end">
            <StatusChip {...TICKET_STATUS[t.status as TicketStatus]} />
            <Stack direction="row" spacing={0.5}>
              <StatusChip {...TICKET_PRIORITY[t.priority as TicketPriority]} />
              {t.overdue && <StatusChip label="Quá hạn" tone="danger" />}
            </Stack>
          </Stack>
        </Stack>
      ))}
    </Stack>
  )
}
