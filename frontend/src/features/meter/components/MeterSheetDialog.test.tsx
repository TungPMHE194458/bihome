import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeterSheetDialog } from '@/features/meter/components/MeterSheetDialog'
import type { MeterSheet } from '@/features/meter/types'
import { http } from '@/lib/http'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/lib/http', () => ({ http: { get: vi.fn(), put: vi.fn() } }))

const sheet: MeterSheet = {
  period: '2026-10',
  meterType: 'ELECTRIC',
  floors: ['1'],
  rows: [
    { apartmentId: 1, apartmentCode: 'A0101', floorNo: '1', oldIndex: 3282, previousPeriod: '2026-09', averageConsumption: 221, spike: false, locked: false },
    { apartmentId: 2, apartmentCode: 'A0102', floorNo: '1', oldIndex: 2412, previousPeriod: '2026-09', averageConsumption: 50, spike: false, locked: false },
    { apartmentId: 3, apartmentCode: 'A0103', floorNo: '1', spike: false, locked: false },
  ],
}

describe('MeterSheetDialog', () => {
  it('saves only rows with a new index and warns on spikes', async () => {
    const user = userEvent.setup()
    vi.mocked(http.get).mockResolvedValue({ data: sheet })
    vi.mocked(http.put).mockResolvedValue({ data: { created: 2, updated: 0, unchanged: 0 } })
    renderWithProviders(<MeterSheetDialog open defaultPeriod="2026-10" onClose={vi.fn()} />)

    const a1 = await screen.findByLabelText('Chỉ số mới A0101')
    expect(screen.getByRole('button', { name: /^Lưu/ })).toBeDisabled()
    await user.type(a1, '3492{Enter}')
    expect(screen.getByLabelText('Chỉ số mới A0102')).toHaveFocus()
    await user.keyboard('2700')
    expect(screen.getByLabelText('Tăng bất thường')).toBeInTheDocument()
    // Căn chưa có kỳ trước: được nhập chỉ số cũ.
    await user.type(screen.getByLabelText('Chỉ số cũ A0103'), '10')
    expect(screen.getByRole('button', { name: 'Lưu 2 dòng' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Lưu 2 dòng' }))
    expect(vi.mocked(http.put).mock.calls[0]).toEqual([
      '/meter-readings/sheet',
      {
        period: '2026-10',
        meterType: 'ELECTRIC',
        rows: [
          { apartmentId: 1, newIndex: 3492, oldIndex: null },
          { apartmentId: 2, newIndex: 2700, oldIndex: null },
        ],
      },
    ])
  })
})
