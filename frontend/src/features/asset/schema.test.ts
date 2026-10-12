import { emptyItem, itemSchema, itemToRequest, normalizePlate, willBeInactive, type ItemFormValues } from '@/features/asset/schema'
import dayjs from '@/lib/dayjs'

const apartment = { id: 3, code: 'A0101', name: 'A-01.01', buildingId: 1, buildingName: 'Sky' }
const valid: ItemFormValues = { ...emptyItem(), apartment, categoryId: '7', name: 'Honda Vision', entryDate: '2026-01-10' }

function errorsOf(values: ItemFormValues) {
  const result = itemSchema.safeParse(values)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('asset item schema', () => {
  it('accepts a valid item', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('requires an apartment and an exit date not before the entry date', () => {
    expect(errorsOf({ ...valid, apartment: null, exitDate: '2026-01-01' })).toEqual({
      apartment: 'Vui lòng chọn căn hộ',
      exitDate: 'Ngày ra phải sau hoặc bằng ngày vào.',
    })
  })

  it('normalizes plates like the backend', () => {
    expect(normalizePlate('29b1   678.90')).toBe('29B1 678.90')
    expect(itemToRequest({ ...valid, plateNumber: ' 30a-123.45 ', unit: ' ' })).toMatchObject({
      apartmentId: 3,
      categoryId: 7,
      plateNumber: '30A-123.45',
      unit: null,
      exitDate: null,
    })
  })

  it('warns when the exit date means the item becomes inactive', () => {
    expect(willBeInactive('')).toBe(false)
    expect(willBeInactive(dayjs().format('YYYY-MM-DD'))).toBe(true)
    expect(willBeInactive(dayjs().add(1, 'day').format('YYYY-MM-DD'))).toBe(false)
  })
})
