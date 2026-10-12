import { apartmentSchema, emptyApartment, toRequest, type ApartmentFormValues } from '@/features/apartment/schema'
import { fileNameFromDisposition } from '@/lib/files'
import { formatArea } from '@/lib/format'

const valid: ApartmentFormValues = {
  ...emptyApartment(3),
  code: 'A-12.05',
  name: 'A-12.05',
  floorNo: '12a',
  area: '75,5',
}

function errorsOf(values: ApartmentFormValues) {
  const result = apartmentSchema.safeParse(values)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('apartmentSchema', () => {
  it('accepts comma or dot decimals and the selected building', () => {
    expect(errorsOf(valid)).toEqual({})
    expect(errorsOf({ ...valid, area: '120.25' })).toEqual({})
  })

  it('requires a building and rejects bad numbers', () => {
    expect(
      errorsOf({ ...valid, buildingId: '', area: '0', floorNo: 'tầng 12', bedrooms: '2.5', code: 'mã cũ' }),
    ).toMatchObject({
      buildingId: 'Vui lòng chọn tòa nhà',
      area: 'Diện tích phải là số dương, tối đa 2 chữ số thập phân',
      floorNo: 'Tầng tối đa 10 ký tự, vd 12, 12A, B1',
      bedrooms: 'Số phòng ngủ phải là số nguyên từ 0 đến 50',
      code: 'Mã chỉ gồm chữ không dấu, chữ số và . _ -',
    })
  })

  it('maps form values to the API request', () => {
    expect(toRequest({ ...valid, bedrooms: '2', description: '  ' }, 5)).toMatchObject({
      buildingId: 3,
      code: 'A-12.05',
      floorNo: '12A',
      area: 75.5,
      bedrooms: 2,
      rooms: null,
      description: null,
      version: 5,
    })
  })
})

describe('helpers', () => {
  it('reads UTF-8 file names from Content-Disposition', () => {
    expect(fileNameFromDisposition("attachment; filename=\"can-ho.xlsx\"; filename*=UTF-8''c%C4%83n-h%E1%BB%99.xlsx")).toBe('căn-hộ.xlsx')
    expect(fileNameFromDisposition('attachment; filename="mau.xlsx"')).toBe('mau.xlsx')
    expect(fileNameFromDisposition(undefined)).toBeUndefined()
  })

  it('formats areas in Vietnamese style', () => {
    expect(formatArea(75.5)).toBe('75,5 m²')
    expect(formatArea(1250)).toBe('1.250 m²')
  })
})
