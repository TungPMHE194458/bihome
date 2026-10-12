import { buildingSchema, EMPTY_BUILDING, toFormValues, toRequest, type BuildingFormValues } from '@/features/building/schema'
import type { BuildingDetail } from '@/features/building/types'

const valid: BuildingFormValues = {
  ...EMPTY_BUILDING,
  code: 'SKY-01',
  name: 'BiHome Sky',
  province: 'Hà Nội',
  ward: 'Phường Cầu Giấy',
  addressDetail: 'Số 1 Trung Kính',
}

function errorsOf(values: BuildingFormValues) {
  const result = buildingSchema.safeParse(values)
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('buildingSchema', () => {
  it('accepts a minimal valid building', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('reports Vietnamese messages for invalid fields', () => {
    const errors = errorsOf({
      ...valid,
      code: 'sky 01',
      name: ' ',
      floorsAbove: '-2',
      floorsBelow: '31',
      managementEmail: 'abc',
      hotline: 'gọi tôi',
    })

    expect(errors).toMatchObject({
      code: 'Mã chỉ gồm chữ in hoa không dấu, chữ số, - và _',
      name: 'Tên tòa nhà không được để trống',
      floorsAbove: 'Số tầng nổi phải là số nguyên từ 0 đến 300',
      floorsBelow: 'Số tầng hầm phải là số nguyên từ 0 đến 30',
      managementEmail: 'Email BQL không đúng định dạng',
      hotline: 'Hotline không đúng định dạng',
    })
  })
})

describe('toRequest / toFormValues', () => {
  it('converts blanks to null, numbers to numbers and keeps image order', () => {
    const req = toRequest(
      {
        ...valid,
        floorsAbove: '30',
        investor: '  ',
        images: [
          { fileId: 2, url: '/f/2', isCover: false },
          { fileId: 1, url: '/f/1', isCover: true },
        ],
      },
      4,
    )

    expect(req).toMatchObject({
      code: 'SKY-01',
      floorsAbove: 30,
      floorsBelow: null,
      investor: null,
      images: [
        { fileId: 2, cover: false },
        { fileId: 1, cover: true },
      ],
      version: 4,
    })
  })

  it('round-trips a detail response into form values', () => {
    const detail: BuildingDetail = {
      id: 1,
      code: 'A',
      name: 'Tòa A',
      fullAddress: '',
      province: 'Huế',
      ward: 'Phường Thuận Hóa',
      addressDetail: '1 Lê Lợi',
      type: 'RENTAL',
      apartmentCount: 0,
      residentCount: 0,
      occupiedApartmentCount: 0,
      floorsAbove: 5,
      status: 'INACTIVE',
      images: [{ fileId: 9, url: '/api/v1/files/9', cover: true }],
      createdAt: '',
      updatedAt: '',
      version: 2,
    }

    expect(toFormValues(detail)).toMatchObject({
      floorsAbove: '5',
      floorsBelow: '',
      hotline: '',
      type: 'RENTAL',
      images: [{ fileId: 9, url: '/api/v1/files/9', isCover: true }],
    })
  })
})
