import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable, type DataTableProps } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/types'
import { renderWithProviders } from '@/test/utils'

interface Row {
  id: number
  code: string
  name: string
  status: string
}

const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  code: `TN${String(i + 1).padStart(2, '0')}`,
  name: `Tòa nhà ${i + 1}`,
  status: 'ACTIVE',
}))

const columns: Column<Row>[] = [
  { key: 'code', header: 'Mã', sortable: true, filter: { type: 'text' } },
  { key: 'name', header: 'Tên tòa nhà', filter: { type: 'text' } },
  {
    key: 'status',
    header: 'Trạng thái',
    filter: {
      type: 'select',
      options: [
        { value: 'ACTIVE', label: 'Hoạt động' },
        { value: 'INACTIVE', label: 'Không hoạt động' },
      ],
    },
  },
  { key: 'createdAt', header: 'Ngày tạo', filter: { type: 'dateRange', fromKey: 'createdFrom', toKey: 'createdTo' } },
  { key: 'note', header: 'Ghi chú' },
]

function setup(props: Partial<DataTableProps<Row>> = {}) {
  const handlers = {
    onPageChange: vi.fn(),
    onSizeChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
  }
  renderWithProviders(
    <DataTable<Row> columns={columns} rows={rows} getRowId={(r) => r.id} page={0} size={10} total={25} {...handlers} {...props} />,
  )
  return handlers
}

describe('DataTable', () => {
  it('renders rows and the Vietnamese pagination summary', () => {
    setup()

    expect(screen.getByText('TN01')).toBeInTheDocument()
    expect(screen.getByText('Tòa nhà 10')).toBeInTheDocument()
    expect(screen.getByText('1–10 trong 25')).toBeInTheDocument()
    expect(screen.getByText('Số hàng mỗi trang:')).toBeInTheDocument()
  })

  it('debounces the text column filter and reports the full value once', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = setup()

    await user.type(screen.getByLabelText('Lọc Mã'), 'TN1')

    await waitFor(() => expect(onFilterChange).toHaveBeenCalledWith('code', 'TN1'))
    expect(onFilterChange).toHaveBeenCalledTimes(1)
  })

  it('shows existing filter values from props', () => {
    setup({ filters: { name: 'Sunrise' } })

    expect(screen.getByLabelText('Lọc Tên tòa nhà')).toHaveValue('Sunrise')
  })

  it('selects an enum filter value', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = setup()

    await user.click(screen.getByRole('combobox', { name: 'Lọc Trạng thái' }))
    await user.click(screen.getByRole('option', { name: 'Không hoạt động' }))

    expect(onFilterChange).toHaveBeenCalledWith('status', 'INACTIVE')
  })

  it('writes date range filters to separate from/to keys', async () => {
    const user = userEvent.setup()
    const { onFilterChange } = setup()

    await user.click(screen.getByRole('button', { name: 'Lọc Ngày tạo' }))
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-31' } })

    expect(onFilterChange).toHaveBeenCalledWith('createdFrom', '2026-10-01')
    expect(onFilterChange).toHaveBeenCalledWith('createdTo', '2026-10-31')
  })

  it('moves to the next page and changes rows per page', async () => {
    const user = userEvent.setup()
    const { onPageChange, onSizeChange } = setup()

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await user.click(screen.getByRole('combobox', { name: /Số hàng mỗi trang/ }))
    await user.click(screen.getByRole('option', { name: '20' }))
    expect(onSizeChange).toHaveBeenCalledWith(20)
  })

  it('disables the previous-page button on the first page', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  })

  it('cycles sorting asc → desc → default when clicking a sortable header', async () => {
    const user = userEvent.setup()
    const first = setup()
    await user.click(screen.getByRole('button', { name: 'Mã' }))
    expect(first.onSortChange).toHaveBeenLastCalledWith('code,asc')
  })

  it.each([
    ['code,asc', 'code,desc'],
    ['code,desc', undefined],
  ])('from sort %s goes to %s', async (current, expected) => {
    const user = userEvent.setup()
    const { onSortChange } = setup({ sort: current })

    await user.click(screen.getByRole('button', { name: /Mã/ }))

    expect(onSortChange).toHaveBeenLastCalledWith(expected)
  })

  it('shows an empty state when there are no rows', () => {
    setup({ rows: [], total: 0, emptyMessage: 'Chưa có tòa nhà' })

    expect(screen.getByText('Chưa có tòa nhà')).toBeInTheDocument()
    expect(screen.getByText('0–0 trong 0')).toBeInTheDocument()
  })

  it('shows an error state with a retry button', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    setup({ error: new Error('boom'), onRetry })

    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('does not render data rows while loading', () => {
    setup({ loading: true })

    expect(screen.queryByText('TN01')).not.toBeInTheDocument()
  })

  it('runs a row action from the ⋮ menu', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    setup({ rowActions: (row) => [{ label: 'Xoá', danger: true, onClick: () => onDelete(row.id) }] })

    const firstRow = screen.getByText('TN01').closest('tr')!
    await user.click(within(firstRow).getByRole('button', { name: 'Tác vụ' }))
    await user.click(screen.getByRole('menuitem', { name: 'Xoá' }))

    expect(onDelete).toHaveBeenCalledWith(1)
  })
})
