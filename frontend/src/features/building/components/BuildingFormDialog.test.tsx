import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { BuildingFormDialog } from '@/features/building/components/BuildingFormDialog'
import { buildingApi } from '@/features/building/api'
import type { BuildingDetail } from '@/features/building/types'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/building/api', () => ({
  buildingApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const api = vi.mocked(buildingApi)

const detail: BuildingDetail = {
  id: 7,
  code: 'SKY01',
  name: 'BiHome Sky Tower',
  fullAddress: 'Số 1, Phường Cầu Giấy, Hà Nội',
  province: 'Hà Nội',
  ward: 'Phường Cầu Giấy',
  addressDetail: 'Số 1',
  type: 'BUILDING',
  apartmentCount: 0,
  residentCount: 0,
  occupiedApartmentCount: 0,
  floorsAbove: 35,
  status: 'ACTIVE',
  images: [],
  createdAt: '2026-10-10T08:00:00+07:00',
  updatedAt: '2026-10-10T08:00:00+07:00',
  version: 3,
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /Mã tòa nhà/ }), 'sky 02')
  await user.type(screen.getByRole('textbox', { name: /Tên tòa nhà/ }), 'BiHome Sky 2')
  await user.type(screen.getByRole('combobox', { name: /Tỉnh\/Thành phố/ }), 'Đà Nẵng')
  await user.type(screen.getByRole('textbox', { name: /Phường\/Xã/ }), 'Phường Hải Châu')
  await user.type(screen.getByRole('textbox', { name: /Địa chỉ chi tiết/ }), '12 Bạch Đằng')
}

describe('BuildingFormDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uppercases the code while typing and creates the building', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    api.create.mockResolvedValue({ ...detail, id: 8 })
    renderWithProviders(<BuildingFormDialog open onClose={onClose} />)

    await fillRequired(user)
    expect(screen.getByRole('textbox', { name: /Mã tòa nhà/ })).toHaveValue('SKY02')
    await user.type(screen.getByRole('textbox', { name: /Số tầng nổi/ }), '18')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1))
    expect(api.create.mock.calls[0][0]).toMatchObject({
      code: 'SKY02',
      name: 'BiHome Sky 2',
      province: 'Đà Nẵng',
      floorsAbove: 18,
      floorsBelow: null,
      type: 'BUILDING',
      status: 'ACTIVE',
      images: [],
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('blocks submission and shows field errors when required fields are empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BuildingFormDialog open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Mã tòa nhà không được để trống')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng chọn Tỉnh/Thành phố')).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
  })

  it('shows a server-side duplicate code error under the code field', async () => {
    const user = userEvent.setup()
    const response = {
      status: 409,
      data: { status: 409, code: 'CONFLICT', detail: 'Mã tòa nhà đã tồn tại.', errors: [{ field: 'code', message: 'Mã tòa nhà đã tồn tại.' }] },
      statusText: 'Conflict',
      headers: {},
      config: { headers: new AxiosHeaders() },
    } as AxiosResponse
    api.create.mockRejectedValue(new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, null, response))
    renderWithProviders(<BuildingFormDialog open onClose={vi.fn()} />)

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Mã tòa nhà đã tồn tại.')).toBeInTheDocument()
  })

  it('loads the building when editing and sends its version', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValue(detail)
    api.update.mockResolvedValue({ ...detail, version: 4 })
    renderWithProviders(<BuildingFormDialog open buildingId={7} onClose={vi.fn()} />)

    const name = await screen.findByRole('textbox', { name: /Tên tòa nhà/ })
    await waitFor(() => expect(name).toHaveValue('BiHome Sky Tower'))
    expect(screen.getByText('Chỉnh sửa tòa nhà')).toBeInTheDocument()
    await user.clear(name)
    await user.type(name, 'Sky Tower mới')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    expect(api.update.mock.calls[0][0]).toBe(7)
    expect(api.update.mock.calls[0][1]).toMatchObject({ name: 'Sky Tower mới', version: 3, floorsAbove: 35 })
  })
})
