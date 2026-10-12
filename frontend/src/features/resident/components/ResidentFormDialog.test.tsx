import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { ResidentFormDialog } from '@/features/resident/components/ResidentFormDialog'
import { residentApi } from '@/features/resident/api'
import type { ResidentDetail } from '@/features/resident/types'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/resident/api', () => ({
  residentApi: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
}))
vi.mock('@/features/apartment/api', () => ({
  apartmentApi: { options: vi.fn().mockResolvedValue([]) },
}))

const api = vi.mocked(residentApi)
const apartment = { id: 10, code: 'A0101', name: 'A-01.01', buildingId: 1, buildingName: 'BiHome Sky' }

const detail: ResidentDetail = {
  id: 5,
  buildingId: 1,
  buildingCode: 'SKY01',
  buildingName: 'BiHome Sky',
  code: 'CD000005',
  fullName: 'Phạm Thu Hà',
  phone: '0900000005',
  idType: 'CCCD',
  idNumber: '001190000005',
  idNumberMasked: '0011*****005',
  nationality: 'Việt Nam',
  appAccountStatus: 'NONE',
  apartments: [],
  residenceStatus: 'LIVING',
  createdAt: '2026-10-10T08:00:00+07:00',
  updatedAt: '2026-10-10T08:00:00+07:00',
  version: 2,
}

function conflict(field: string, message: string) {
  const response = {
    status: 409,
    data: { status: 409, code: 'CONFLICT', detail: message, errors: [{ field, message }] },
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, null, response)
}

async function fillOwner(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /Họ và tên/ }), 'Nguyễn Văn An')
  await user.type(screen.getByRole('textbox', { name: /Số điện thoại/ }), '0912345678')
  await user.click(screen.getByRole('combobox', { name: /Vai trò tại căn hộ/ }))
  await user.click(await screen.findByRole('option', { name: 'Chủ sở hữu' }))
  await user.click(screen.getByRole('checkbox', { name: 'Chủ hộ chính' }))
}

describe('ResidentFormDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a resident in the preselected apartment as household head', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    api.create.mockResolvedValue({ ...detail, id: 9, code: 'CD000009' })
    renderWithProviders(<ResidentFormDialog open initialApartment={apartment} onClose={vi.fn()} onCreated={onCreated} />)

    await fillOwner(user)
    await user.type(screen.getByRole('textbox', { name: /Số giấy tờ/ }), '001 085 012 345')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1))
    expect(api.create.mock.calls[0][0]).toMatchObject({
      code: null,
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      idType: 'CCCD',
      idNumber: '001085012345',
      nationality: 'Việt Nam',
      apartment: { apartmentId: 10, role: 'OWNER', householdHead: true, residenceStatus: 'LIVING' },
    })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 9 })))
  })

  it('requires the apartment and role of the first residence', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResidentFormDialog open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Vui lòng chọn căn hộ')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng chọn vai trò tại căn hộ')).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('shows a second household head conflict under the checkbox', async () => {
    const user = userEvent.setup()
    api.create.mockRejectedValue(conflict('apartment.householdHead', 'Căn hộ đã có chủ hộ chính: Lê Hoàng Dũng.'))
    renderWithProviders(<ResidentFormDialog open initialApartment={apartment} onClose={vi.fn()} />)

    await fillOwner(user)
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Căn hộ đã có chủ hộ chính: Lê Hoàng Dũng.')).toBeInTheDocument()
  })

  it('edits personal info only and sends the version', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValue(detail)
    api.update.mockResolvedValue({ ...detail, version: 3 })
    renderWithProviders(<ResidentFormDialog open residentId={5} onClose={vi.fn()} />)

    const name = await screen.findByRole('textbox', { name: /Họ và tên/ })
    await waitFor(() => expect(name).toHaveValue('Phạm Thu Hà'))
    expect(screen.queryByRole('combobox', { name: /Vai trò tại căn hộ/ })).not.toBeInTheDocument()
    await user.clear(name)
    await user.type(name, 'Phạm Thu Hằng')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    expect(api.update.mock.calls[0][0]).toBe(5)
    expect(api.update.mock.calls[0][1]).toMatchObject({
      fullName: 'Phạm Thu Hằng',
      idNumber: '001190000005',
      apartment: undefined,
      version: 2,
    })
  })
})
