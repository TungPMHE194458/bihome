import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccessCardFormDialog } from '@/features/accesscard/components/AccessCardFormDialog'
import { accessCardApi } from '@/features/accesscard/api'
import { VoucherFormDialog } from '@/features/voucher/components/VoucherFormDialog'
import { voucherApi } from '@/features/voucher/api'
import type { Voucher } from '@/features/voucher/types'
import { useBuildingStore } from '@/stores/buildingStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/voucher/api', () => ({ voucherApi: { get: vi.fn(), save: vi.fn() } }))
vi.mock('@/features/accesscard/api', () => ({ accessCardApi: { get: vi.fn(), save: vi.fn() } }))
vi.mock('@/features/amenity/hooks', () => ({
  useAmenityOptions: () => ({ data: [{ id: 3, code: 'SKY-POOL', name: 'Hồ bơi', buildingId: 1, status: 'ACTIVE' }], isLoading: false }),
}))
vi.mock('@/features/servicecatalog/hooks', () => ({
  useServiceOptions: () => ({ data: [{ id: 5, code: 'DV0001', name: 'Vệ sinh căn hộ', unitPrice: 150000, unit: 'lần', buildingId: 1 }], isLoading: false }),
}))
vi.mock('@/features/building/hooks', () => ({
  useBuildingOptions: () => ({ data: [{ id: 1, code: 'SKY01', name: 'BiHome Sky Tower', status: 'ACTIVE' }] }),
}))

const used: Voucher = {
  id: 9,
  buildingId: 1,
  buildingName: 'BiHome Sky Tower',
  code: 'HOBOI10',
  name: 'Giảm 10% vé hồ bơi',
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscount: 50000,
  applyScope: 'AMENITY',
  amenities: [{ id: 3, code: 'SKY-POOL', name: 'Hồ bơi' }],
  services: [],
  totalQuantity: 200,
  usedCount: 40,
  remaining: 160,
  soldOut: false,
  perApartmentLimit: 2,
  validFrom: '2026-10-01',
  validTo: '2026-11-30',
  validity: 'VALID',
  status: 'ACTIVE',
  valueLocked: true,
  createdAt: '2026-10-01T08:00:00+07:00',
  updatedAt: '2026-10-01T08:00:00+07:00',
  version: 3,
}

describe('VoucherFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBuildingStore.setState({ selectedBuildingId: 1 })
  })

  it('creates a voucher with an uppercased code in the selected building', async () => {
    const user = userEvent.setup()
    vi.mocked(voucherApi.save).mockResolvedValue({ ...used, id: 10, code: 'GYM50K' })
    renderWithProviders(<VoucherFormDialog open onClose={vi.fn()} />)

    expect(screen.getByText('BiHome Sky Tower')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /Mã voucher/ }), 'gym50k')
    await user.type(screen.getByRole('textbox', { name: /Tên voucher/ }), 'Giảm phòng gym')
    await user.type(screen.getByRole('textbox', { name: /Giá trị giảm/ }), '20')
    await user.click(screen.getByRole('combobox', { name: 'Dịch vụ cụ thể' }))
    await user.click(await screen.findByRole('option', { name: /Vệ sinh căn hộ/ }))
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(voucherApi.save).toHaveBeenCalledTimes(1))
    expect(vi.mocked(voucherApi.save).mock.calls[0][1]).toMatchObject({
      code: 'GYM50K',
      discountType: 'PERCENT',
      discountValue: 20,
      applyScope: 'ALL',
      amenityIds: [],
      serviceIds: [5],
      totalQuantity: null,
    })
  })

  it('locks the code and discount of a voucher that has been used', async () => {
    vi.mocked(voucherApi.get).mockResolvedValue(used)
    renderWithProviders(<VoucherFormDialog open voucherId={9} onClose={vi.fn()} />)

    expect(await screen.findByText(/đã có/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Mã voucher/ })).toHaveValue('HOBOI10'))
    expect(screen.getByRole('textbox', { name: /Mã voucher/ })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /Giá trị giảm/ })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /Tên voucher/ })).toBeEnabled()
    expect(screen.getByText('Hồ bơi (SKY-POOL)')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Tiện ích cụ thể' })).toBeDisabled()
    expect(screen.queryByRole('combobox', { name: 'Dịch vụ cụ thể' })).not.toBeInTheDocument()
  })
})

describe('AccessCardFormDialog', () => {
  it('only edits card info for a card in stock', async () => {
    vi.mocked(accessCardApi.get).mockResolvedValue({
      id: 5,
      buildingId: 1,
      buildingName: 'BiHome Sky Tower',
      cardNo: 'SKY-0006',
      cardType: 'MULTI',
      expired: false,
      issueFee: 100000,
      status: 'IN_STOCK',
      allowedStatuses: ['IN_USE', 'LOST'],
      createdAt: '2026-10-01T08:00:00+07:00',
      updatedAt: '2026-10-01T08:00:00+07:00',
      version: 0,
    })
    renderWithProviders(<AccessCardFormDialog open cardId={5} onClose={vi.fn()} />)

    expect(await screen.findByText(/dùng "Cấp thẻ" để gán cho căn hộ/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Căn hộ/ })).not.toBeInTheDocument()
  })
})
