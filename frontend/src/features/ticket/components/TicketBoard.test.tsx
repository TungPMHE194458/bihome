import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusChangeDialog } from '@/features/ticket/components/StatusChangeDialog'
import { TicketBoard } from '@/features/ticket/components/TicketBoard'
import { ticketApi } from '@/features/ticket/api'
import type { BoardColumn, TicketStatus, TicketSummary } from '@/features/ticket/types'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/ticket/api', () => ({ ticketApi: { changeStatus: vi.fn() } }))

const ticket = (id: number, status: TicketStatus, overdue = false): TicketSummary => ({
  id,
  buildingId: 1,
  buildingName: 'Sky',
  code: `YC-261011-00${id}`,
  title: `Yêu cầu ${id}`,
  categoryId: 1,
  categoryName: 'Điện',
  channel: 'HOTLINE',
  priority: 'HIGH',
  status,
  responseDueAt: '2026-10-11T12:00:00+07:00',
  resolutionDueAt: '2026-10-12T10:00:00+07:00',
  overdue,
  createdAt: '2026-10-11T10:00:00+07:00',
  updatedAt: '2026-10-11T10:00:00+07:00',
  version: 0,
})

const STATUSES: TicketStatus[] = ['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'DONE', 'CLOSED', 'CANCELLED']
const columns = (items: Partial<Record<TicketStatus, TicketSummary[]>>): BoardColumn[] =>
  STATUSES.map((status) => ({ status, total: items[status]?.length ?? 0, items: items[status] ?? [] }))

function drag(cardId: number, column: string) {
  const card = screen.getByTestId(`ticket-card-${cardId}`)
  const target = screen.getByRole('region', { name: `Cột ${column}` })
  const dataTransfer = { setData: vi.fn(), dropEffect: '', effectAllowed: '' }
  fireEvent.dragStart(card, { dataTransfer })
  fireEvent.dragOver(target, { dataTransfer })
  fireEvent.drop(target, { dataTransfer })
  fireEvent.dragEnd(card, { dataTransfer })
}

describe('TicketBoard', () => {
  it('moves a card only to a column allowed by the state machine', () => {
    const onMove = vi.fn()
    renderWithProviders(
      <TicketBoard columns={columns({ NEW: [ticket(1, 'NEW')] })} loading={false} error={null} onRetry={vi.fn()} onMove={onMove} onOpen={vi.fn()} canWrite />,
    )

    drag(1, 'Hoàn thành')
    expect(onMove).not.toHaveBeenCalled()

    drag(1, 'Đã tiếp nhận')
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'RECEIVED')
  })

  it('offers the allowed transitions in the card menu and shows column totals', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    renderWithProviders(
      <TicketBoard
        columns={columns({ IN_PROGRESS: [ticket(2, 'IN_PROGRESS', true)], CLOSED: [ticket(3, 'CLOSED')] })}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onMove={onMove}
        onOpen={vi.fn()}
        canWrite
      />,
    )

    expect(screen.queryByRole('button', { name: 'Chuyển trạng thái YC-261011-003' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chuyển trạng thái YC-261011-002' }))
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Chờ phản hồi', 'Hoàn thành', 'Huỷ yêu cầu'])
    await user.click(screen.getByRole('menuitem', { name: 'Hoàn thành' }))
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), 'DONE')
  })

  it('cards cannot be dragged without write permission', () => {
    renderWithProviders(
      <TicketBoard columns={columns({ NEW: [ticket(1, 'NEW')] })} loading={false} error={null} onRetry={vi.fn()} onMove={vi.fn()} onOpen={vi.fn()} canWrite={false} />,
    )
    expect(screen.getByTestId('ticket-card-1')).toHaveAttribute('draggable', 'false')
    expect(screen.queryByRole('button', { name: /Chuyển trạng thái/ })).not.toBeInTheDocument()
  })
})

describe('StatusChangeDialog', () => {
  it('requires a reason to cancel and sends the version', async () => {
    const user = userEvent.setup()
    vi.mocked(ticketApi.changeStatus).mockResolvedValue({} as never)
    const onClose = vi.fn()
    renderWithProviders(<StatusChangeDialog change={{ ticket: ticket(5, 'RECEIVED'), to: 'CANCELLED' }} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByText('Vui lòng nhập lý do huỷ.')).toBeInTheDocument()
    expect(ticketApi.changeStatus).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: /Lý do huỷ/ }), 'Cư dân tự xử lý')
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() =>
      expect(ticketApi.changeStatus).toHaveBeenCalledWith(5, {
        status: 'CANCELLED',
        note: 'Cư dân tự xử lý',
        visibility: 'PUBLIC',
        version: 0,
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
