import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlotPicker } from '@/features/booking/components/SlotPicker'
import { renderWithProviders } from '@/test/utils'

const day = {
  date: '2026-10-12',
  slots: [
    { startTime: '06:00', endTime: '07:00', capacity: 30, booked: 0, remaining: 30, price: 0, past: true },
    { startTime: '17:00', endTime: '18:00', capacity: 30, booked: 30, remaining: 0, price: 20000, priceUnit: 'PER_PERSON' as const, past: false },
    { startTime: '18:00', endTime: '19:00', capacity: 30, booked: 4, remaining: 26, price: 20000, priceUnit: 'PER_PERSON' as const, past: false },
  ],
}

describe('SlotPicker', () => {
  it('disables past and full slots and shows remaining seats and price', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<SlotPicker day={day} value="" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: '06:00–07:00' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '17:00–18:00' })).toBeDisabled()
    expect(screen.getByText('Kín chỗ')).toBeInTheDocument()
    expect(screen.getByText('Còn 26/30 chỗ')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '18:00–19:00' }))
    expect(onChange).toHaveBeenCalledWith('18:00-19:00')
  })

  it('shows why a day is closed', () => {
    renderWithProviders(<SlotPicker day={{ date: '2026-10-12', closedReason: 'Tiện ích nghỉ bảo trì ngày 12/10/2026.', slots: [] }} value="" onChange={vi.fn()} />)
    expect(screen.getByText('Tiện ích nghỉ bảo trì ngày 12/10/2026.')).toBeInTheDocument()
  })
})
