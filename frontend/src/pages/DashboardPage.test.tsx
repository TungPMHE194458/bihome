import { screen } from '@testing-library/react'
import type { DashboardSummary } from '@/features/dashboard/api'
import { http } from '@/lib/http'
import { DashboardPage } from '@/pages/DashboardPage'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/http', () => ({ http: { get: vi.fn() } }))
// Biểu đồ SVG cần layout thật; thay bằng phần tử đơn giản trong jsdom.
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: () => <div data-testid="bar-chart" /> }))
vi.mock('@mui/x-charts/PieChart', () => ({ PieChart: () => <div data-testid="pie-chart" /> }))

const summary: DashboardSummary = {
  month: '2026-10',
  system: { activeUsers: 5, loginsToday: 3, storageBytes: 2 * 1024 * 1024, fileCount: 12 },
  buildingCount: 1,
  apartmentCount: 24,
  occupiedApartmentCount: 6,
  residentCount: 9,
  openTickets: 3,
  overdueTickets: 1,
  ticketsCreatedInMonth: 6,
  ticketsResolvedInMonth: 2,
  activeAccessCards: 3,
  validVouchers: 1,
  amenityBookingsToday: 2,
  amenityBookingsInMonth: 11,
  bookingsByWeek: [{ weekStart: '2026-10-05', bookings: 4, people: 9 }],
  feeDebt: 12_500_000,
  feeCollectionRate: 0.8,
  feePeriod: '2026-09',
  feeByPeriod: [{ period: '2026-09', billed: 60_000_000, collected: 48_000_000 }],
  ticketsByMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, created: i === 9 ? 6 : 0, resolved: i === 9 ? 2 : 0 })),
  ticketsByCategory: [{ key: '1', name: 'Điện', count: 4 }],
  openTicketsByStatus: [{ key: 'NEW', name: 'NEW', count: 2 }],
  recentTickets: [
    {
      id: 1,
      code: 'YC-261011-001',
      title: 'Mất điện căn A-01.01',
      status: 'NEW',
      priority: 'URGENT',
      categoryName: 'Điện',
      buildingName: 'BiHome Sky Tower',
      overdue: true,
      createdAt: '2026-10-11T08:00:00+07:00',
    },
  ],
}

describe('DashboardPage', () => {
  it('shows KPIs, fee collection and the latest open tickets', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { username: 'admin', permissions: ['DASHBOARD_READ'], profile: { fullName: 'Mạnh Tùng' } } as never,
    })
    vi.mocked(http.get).mockResolvedValue({ data: summary })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('9 / 24')).toBeInTheDocument()
    expect(screen.getByText(/25% căn có người ở/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Yêu cầu chưa giải quyết / Quá hạn' })).toHaveTextContent('3 / 1')
    expect(screen.getByRole('link', { name: 'Đăng ký tiện ích hôm nay / trong tháng' })).toHaveTextContent('2 / 11')
    expect(screen.getByRole('link', { name: 'Công nợ / Tỉ lệ thu phí' })).toHaveTextContent('12.500.000 đ / 80%')
    expect(screen.getByText('Tỉ lệ thu kỳ 09/2026')).toBeInTheDocument()
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    expect(screen.getByText('YC-261011-001')).toHaveAttribute('href', '/tickets/1')
    expect(screen.getByText('Quá hạn')).toBeInTheDocument()
    expect(screen.getByText(/Mạnh Tùng/)).toBeInTheDocument()
    expect(vi.mocked(http.get).mock.calls[0]).toEqual(['/dashboard', { params: { month: expect.stringMatching(/^\d{4}-\d{2}$/) } }])
  })
})
