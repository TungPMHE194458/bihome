import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardGrid } from '@/components/CardGrid/CardGrid'
import { ViewToggle } from '@/components/ListPage/ViewToggle'
import { StatusChip } from '@/components/StatusChip'
import { renderWithProviders } from '@/test/utils'

interface Item {
  id: number
  name: string
}

const pagination = { page: 0, size: 10, total: 1, onPageChange: () => {}, onSizeChange: () => {} }

describe('CardGrid', () => {
  it('renders title, badge, label/value details and opens the item on click', async () => {
    const user = userEvent.setup()
    const onItemClick = vi.fn()
    renderWithProviders(
      <CardGrid<Item>
        items={[{ id: 1, name: 'A-01.01' }]}
        getId={(i) => i.id}
        getTitle={(i) => i.name}
        renderBadge={() => <StatusChip label="Căn hộ" tone="info" />}
        getDetails={() => [
          { label: 'Chủ sở hữu', value: 'Nguyễn Văn An' },
          { label: 'Diện tích', value: '98,5 m²' },
        ]}
        onItemClick={onItemClick}
        {...pagination}
      />,
    )
    expect(screen.getByRole('img', { name: 'A-01.01' })).toBeInTheDocument()
    expect(screen.getByText('Căn hộ')).toBeInTheDocument()
    expect(screen.getByText('Chủ sở hữu')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    await user.click(screen.getByText('A-01.01'))
    expect(onItemClick).toHaveBeenCalledWith({ id: 1, name: 'A-01.01' })
  })

  it('shows the empty message when there are no items', () => {
    renderWithProviders(
      <CardGrid<Item> items={[]} getId={(i) => i.id} getTitle={(i) => i.name} emptyMessage="Chưa có căn hộ nào" {...pagination} total={0} />,
    )
    expect(screen.getByText('Chưa có căn hộ nào')).toBeInTheDocument()
  })
})

describe('ViewToggle', () => {
  it('switches between list and grid', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<ViewToggle value="list" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Dạng danh sách' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Dạng lưới' }))
    expect(onChange).toHaveBeenCalledWith('grid')
    await user.click(screen.getByRole('button', { name: 'Dạng danh sách' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('switches back from grid to list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<ViewToggle value="grid" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Dạng danh sách' }))
    expect(onChange).toHaveBeenCalledWith('list')
  })
})
