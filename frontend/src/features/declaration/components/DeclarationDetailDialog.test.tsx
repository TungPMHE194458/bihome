import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { declarationApi } from '@/features/declaration/api'
import { DeclarationDetailDialog } from '@/features/declaration/components/DeclarationDetailDialog'
import type { Declaration } from '@/features/declaration/types'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/declaration/api', () => ({
  declarationApi: { list: vi.fn(), get: vi.fn(), approve: vi.fn(), reject: vi.fn() },
}))

const member: Declaration = {
  id: 7,
  buildingId: 1,
  code: 'KK-261013-001',
  type: 'MEMBER',
  status: 'PENDING',
  apartmentId: 3,
  apartmentCode: 'A0101',
  submittedById: 1,
  submittedByName: 'Nguyễn Văn An',
  submittedByPhone: '0900000001',
  fullName: 'Nguyễn Minh Khang',
  role: 'FAMILY',
  relationship: 'CHILD',
  dateOfBirth: '2018-06-15',
  moveInDate: '2026-10-13',
  createdAt: '2026-10-13T09:13:00+07:00',
  version: 0,
}

describe('DeclarationDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ status: 'authenticated', user: { username: 'bql', permissions: ['RESIDENT_READ', 'RESIDENT_WRITE'] } as never })
  })

  it('lets the manager add the missing phone and approve with the reviewed values', async () => {
    const user = userEvent.setup()
    vi.mocked(declarationApi.get).mockResolvedValue(member)
    vi.mocked(declarationApi.approve).mockResolvedValue({ ...member, status: 'APPROVED', resultResidentId: 9 })
    const onClose = vi.fn()
    renderWithProviders(<DeclarationDetailDialog id={7} onClose={onClose} />)

    expect(await screen.findByText(/Cư dân không khai số điện thoại/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue('Nguyễn Minh Khang')
    await user.type(screen.getByLabelText(/Số điện thoại/), '0912345678')
    await user.click(screen.getByRole('button', { name: 'Duyệt' }))

    await waitFor(() => expect(declarationApi.approve).toHaveBeenCalled())
    const [id, body] = vi.mocked(declarationApi.approve).mock.calls[0]
    expect(id).toBe(7)
    expect(body).toMatchObject({ phone: '0912345678', fullName: 'Nguyễn Minh Khang', role: 'FAMILY', dateOfBirth: '2018-06-15', version: 0 })
    expect(body.email).toBeNull()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('requires a reason to reject', async () => {
    const user = userEvent.setup()
    vi.mocked(declarationApi.get).mockResolvedValue(member)
    vi.mocked(declarationApi.reject).mockResolvedValue({ ...member, status: 'REJECTED', rejectReason: 'Sai thông tin' })
    renderWithProviders(<DeclarationDetailDialog id={7} onClose={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Từ chối' }))
    await user.type(await screen.findByLabelText(/Lý do từ chối/), 'Sai thông tin')
    await user.click(screen.getAllByRole('button', { name: 'Từ chối' }).at(-1)!)
    await waitFor(() => expect(declarationApi.reject).toHaveBeenCalledWith(7, 'Sai thông tin', 0))
  })

  it('shows a read-only summary once the declaration is processed', async () => {
    vi.mocked(declarationApi.get).mockResolvedValue({ ...member, status: 'APPROVED', phone: '0912345678', resultResidentId: 9 })
    renderWithProviders(<DeclarationDetailDialog id={7} onClose={() => {}} />)
    expect(await screen.findByText('Xem hồ sơ cư dân')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument()
  })
})
