import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { WeeklySlotEditor } from '@/features/amenity/components/WeeklySlotEditor'
import type { Slot } from '@/features/amenity/types'
import { renderWithProviders } from '@/test/utils'

function Harness({ initial = [], onChange }: { initial?: Slot[]; onChange: (s: Slot[]) => void }) {
  const [slots, setSlots] = useState<Slot[]>(initial)
  return (
    <WeeklySlotEditor
      slots={slots}
      onChange={(s) => {
        setSlots(s)
        onChange(s)
      }}
      openTime="16:00"
      closeTime="22:00"
      slotMinutes={180}
      capacity={20}
    />
  )
}

describe('WeeklySlotEditor', () => {
  it('generates slots for the chosen days only', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Sinh khung giờ tự động' }))
    // Bỏ chọn T2–T5, giữ T6, T7, CN.
    for (const day of ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5']) await user.click(screen.getByRole('button', { name: day }))
    await user.click(screen.getByRole('button', { name: 'Sinh khung giờ' }))

    const slots: Slot[] = onChange.mock.lastCall![0]
    expect(slots.map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`)).toEqual([
      '5 16:00-19:00',
      '5 19:00-22:00',
      '6 16:00-19:00',
      '6 19:00-22:00',
      '7 16:00-19:00',
      '7 19:00-22:00',
    ])
    expect(within(screen.getByRole('group', { name: 'Thứ 2' })).getByText('Đóng cửa')).toBeInTheDocument()
  })

  it('copies one day to every other day and appends a slot after the last one', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness initial={[{ dayOfWeek: 1, startTime: '16:00', endTime: '19:00', capacity: 8 }]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Tác vụ Thứ 2' }))
    await user.click(screen.getByRole('menuitem', { name: /Sao chép sang các ngày khác/ }))
    expect(onChange.mock.lastCall![0]).toHaveLength(7)

    await user.click(screen.getByRole('button', { name: 'Thêm khung Chủ nhật' }))
    const sunday = (onChange.mock.lastCall![0] as Slot[]).filter((s) => s.dayOfWeek === 7)
    expect(sunday).toEqual([
      { dayOfWeek: 7, startTime: '16:00', endTime: '19:00', capacity: 8 },
      { dayOfWeek: 7, startTime: '19:00', endTime: '22:00', capacity: null },
    ])
  })
})
