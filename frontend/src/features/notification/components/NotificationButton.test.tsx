import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { NotificationButton } from '@/features/notification/components/NotificationButton'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }))

const items = [
  {
    id: 11,
    type: 'TICKET_ASSIGNED',
    title: 'Bạn được giao xử lý yêu cầu YC-261011-001',
    body: 'Mất điện hành lang',
    link: '/tickets/5',
    read: false,
    createdAt: new Date().toISOString(),
  },
  { id: 10, type: 'ANNOUNCEMENT', title: 'Cắt nước bảo trì', read: true, createdAt: '2026-10-01T08:00:00+07:00' },
]

describe('NotificationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ status: 'authenticated' })
    vi.mocked(http.get).mockImplementation(async (url: string) => {
      if (url === '/notifications/unread-count') return { data: { count: 1 } }
      return { data: { content: items, page: 0, size: 10, totalElements: 2, totalPages: 1 } }
    })
    vi.mocked(http.post).mockResolvedValue({ data: { ...items[0], read: true } })
  })

  it('shows the unread badge and opens the linked page, marking it read', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/" element={<NotificationButton />} />
        <Route path="/tickets/:id" element={<p>Trang yêu cầu</p>} />
      </Routes>,
    )

    const bell = await screen.findByRole('button', { name: 'Thông báo, 1 chưa đọc' })
    await user.click(bell)
    expect(await screen.findByText('Cắt nước bảo trì')).toBeInTheDocument()
    await user.click(screen.getByText('Bạn được giao xử lý yêu cầu YC-261011-001'))

    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/notifications/11/read', undefined, expect.anything()))
    expect(await screen.findByText('Trang yêu cầu')).toBeInTheDocument()
  })
})
