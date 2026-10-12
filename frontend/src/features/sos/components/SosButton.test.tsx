import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SosButton } from '@/features/sos/components/SosButton'
import { emptySos, sosSchema, sosToRequest } from '@/features/sos/schema'
import type { SosActive } from '@/features/sos/types'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/http', () => ({ http: { get: vi.fn() } }))

const active: SosActive = {
  count: 2,
  newCount: 1,
  latestId: 9,
  latest: [
    {
      id: 9,
      buildingId: 1,
      buildingName: 'Tower',
      code: 'SOS-261011-002',
      alertType: 'FIRE',
      source: 'MANUAL',
      apartmentCode: 'A0101',
      location: 'Bếp',
      status: 'NEW',
      createdAt: '2026-10-11T08:00:00+07:00',
      version: 0,
    },
  ],
}

describe('SosButton', () => {
  it('shows the open alert count and the latest alerts', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ status: 'authenticated', user: { username: 'bql', permissions: ['SOS_READ', 'SOS_WRITE'] } as never })
    vi.mocked(http.get).mockResolvedValue({ data: active })
    renderWithProviders(<SosButton />)

    const button = await screen.findByRole('button', { name: 'Cảnh báo khẩn cấp SOS, 2 đang mở' })
    await user.click(button)
    expect(screen.getByText('Cháy nổ · Căn A0101 · Bếp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo cảnh báo' })).toBeInTheDocument()
  })

  it('is hidden without SOS permission', () => {
    useAuthStore.setState({ status: 'authenticated', user: { username: 'kt', permissions: ['FEE_NOTICE_READ'] } as never })
    renderWithProviders(<SosButton />)
    expect(screen.queryByRole('button', { name: /SOS/ })).not.toBeInTheDocument()
  })
})

describe('SOS form', () => {
  it('requires a location when no apartment is chosen', () => {
    const r = sosSchema.safeParse(emptySos())
    expect(r.error?.issues[0].path).toEqual(['location'])
    expect(sosSchema.safeParse({ ...emptySos(), apartmentId: 3 }).success).toBe(true)
    expect(sosToRequest({ ...emptySos(), location: ' Hầm B1 ', reporterName: '' })).toMatchObject({ location: 'Hầm B1', reporterName: null })
  })
})
