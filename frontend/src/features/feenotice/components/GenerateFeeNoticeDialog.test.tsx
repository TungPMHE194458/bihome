import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerateFeeNoticeDialog } from '@/features/feenotice/components/GenerateFeeNoticeDialog'
import type { FeePreview } from '@/features/feenotice/types'
import { http } from '@/lib/http'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/http', () => ({ http: { get: vi.fn(), post: vi.fn() } }))

const preview: FeePreview = {
  period: '2026-09',
  dueDate: '2026-10-15',
  apartmentCount: 2,
  toCreate: 1,
  skipped: 1,
  withWarnings: 1,
  total: 1_148_350,
  rows: [
    {
      apartmentId: 1,
      apartmentCode: 'A0101',
      floorNo: '1',
      holderName: 'Nguyễn Văn An',
      total: 1_148_350,
      warnings: ['Chưa có chỉ số nước của kỳ này.'],
      items: [
        { type: 'MANAGEMENT', description: 'Phí quản lý tháng 09/2026', quantity: 75.5, unitPrice: 7000, amount: 528_500 },
        { type: 'SERVICE', description: 'Dịch vụ DV-1: Giặt là', amount: 50_000, sourceRef: 'GD-1' },
      ],
    },
    { apartmentId: 2, apartmentCode: 'A0102', floorNo: '1', items: [], total: 0, warnings: [], skipReason: 'Đã có thông báo TB-1 cho kỳ này.' },
  ],
}

describe('GenerateFeeNoticeDialog', () => {
  it('previews every apartment before creating drafts', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    vi.mocked(http.post).mockImplementation((url: string) =>
      Promise.resolve({ data: url.endsWith('/preview') ? preview : { period: '2026-09', created: 1, skipped: 1 } }),
    )
    renderWithProviders(<GenerateFeeNoticeDialog open defaultPeriod="2026-09" onClose={vi.fn()} onCreated={onCreated} />)

    expect(screen.getByRole('button', { name: 'Tạo thông báo nháp' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Xem trước' }))
    expect(await screen.findByText('Sẽ tạo 1 thông báo')).toBeInTheDocument()
    expect(screen.getByText('Chưa có chỉ số nước của kỳ này.')).toBeInTheDocument()
    expect(screen.getByText('Đã có thông báo TB-1 cho kỳ này.')).toBeInTheDocument()
    expect(vi.mocked(http.post).mock.calls[0]).toEqual(['/fee-notices/preview', { period: '2026-09', dueDate: null, floor: null }])

    await user.click(screen.getByRole('button', { name: 'Xem khoản A0101' }))
    const items = screen.getByRole('table', { name: 'Các khoản phí' })
    expect(within(items).getByText('Dịch vụ DV-1: Giặt là')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tạo 1 thông báo nháp' }))
    expect(vi.mocked(http.post).mock.calls[1][0]).toBe('/fee-notices/generate')
    expect(onCreated).toHaveBeenCalledWith('2026-09')
  })
})
