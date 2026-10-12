import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { roleApi, type RoleDetail } from '@/features/role/api'
import { RolePage } from '@/features/role/pages/RolePage'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/role/api', () => ({ roleApi: { overview: vi.fn(), permissions: vi.fn(), save: vi.fn(), remove: vi.fn() } }))

const role = (over: Partial<RoleDetail>): RoleDetail => ({
  id: 3,
  code: 'STAFF',
  name: 'Nhân viên vận hành',
  system: true,
  allPermissions: false,
  userCount: 2,
  permissions: ['TICKET_READ'],
  updatedAt: '2026-10-01T08:00:00+07:00',
  version: 1,
  ...over,
})

const catalog = ['APARTMENT', 'TICKET', 'ROLE'].flatMap((m) =>
  ['READ', 'WRITE', 'DELETE', 'EXPORT'].map((a) => ({ code: `${m}_${a}`, module: m, action: a, name: `${a} ${m}` })),
)

describe('RolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 1, username: 'admin', permissions: ['ROLE_READ', 'ROLE_WRITE', 'ROLE_DELETE'] } as never,
    })
    vi.mocked(roleApi.overview).mockResolvedValue([
      role({ id: 1, code: 'SUPER_ADMIN', name: 'Admin hệ thống', allPermissions: true, permissions: [] }),
      role({}),
    ])
    vi.mocked(roleApi.permissions).mockResolvedValue(catalog)
  })

  it('locks the system admin and grants read together with write', async () => {
    const user = userEvent.setup()
    vi.mocked(roleApi.save).mockImplementation(async (_id, body) => role({ permissions: body.permissions, version: 2 }))
    renderWithProviders(<RolePage />, { route: '/settings/roles' })

    expect(await screen.findByText(/luôn có toàn bộ quyền/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Xem Căn hộ' })).toBeDisabled()

    await user.click(screen.getByText('Nhân viên vận hành'))
    const write = await screen.findByRole('checkbox', { name: 'Thêm / sửa Căn hộ' })
    expect(write).toBeEnabled()
    await user.click(write)
    expect(screen.getByRole('checkbox', { name: 'Xem Căn hộ' })).toBeChecked()

    // Bỏ Xem thì bỏ hết quyền của module.
    await user.click(screen.getByRole('checkbox', { name: 'Xem Yêu cầu và hỗ trợ' }))
    await user.click(screen.getByRole('checkbox', { name: 'Xoá Yêu cầu và hỗ trợ' }))
    await user.click(screen.getByRole('button', { name: 'Lưu phân quyền' }))

    await waitFor(() => expect(roleApi.save).toHaveBeenCalledTimes(1))
    const [id, body] = vi.mocked(roleApi.save).mock.calls[0]
    expect(id).toBe(3)
    expect([...body.permissions].sort()).toEqual(['APARTMENT_READ', 'APARTMENT_WRITE', 'TICKET_DELETE', 'TICKET_READ'])
    expect(body).toMatchObject({ code: undefined, version: 1 })
  })
})
