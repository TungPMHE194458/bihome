import { lineAmount, newItem, previewTotals, toEditable, toItemRequests, validateItems } from '@/features/feenotice/schema'

describe('fee notice draft editing', () => {
  const items = toEditable([
    { type: 'MANAGEMENT', description: 'Phí quản lý', quantity: 75.5, unitPrice: 7000, amount: 528500 },
    { type: 'VAT', description: 'VAT 10%', amount: 52850 },
    { type: 'SERVICE', description: 'Giặt là', amount: 50000, sourceRef: 'GD-1' },
  ])

  it('drops VAT lines and recomputes VAT and total like the backend', () => {
    expect(items.map((i) => i.type)).toEqual(['MANAGEMENT', 'SERVICE'])
    const discount = { ...newItem('DISCOUNT'), amount: '28500' }
    expect(lineAmount(discount)).toBe(-28500)
    expect(previewTotals([...items, discount], 10)).toEqual({ vat: 52850, total: 528500 + 52850 + 50000 - 28500 })
  })

  it('validates rows and orders requests by group', () => {
    const other = { ...newItem('OTHER'), description: '', unitPrice: '' }
    expect(validateItems([...items, other])).toEqual({ 2: 'Nhập nội dung khoản' })
    expect(validateItems([{ ...other, description: 'Sửa khoá' }])).toEqual({ 0: 'Nhập số lượng × đơn giá hoặc thành tiền' })
    const requests = toItemRequests([{ ...newItem('DISCOUNT'), amount: '1000' }, ...items])
    expect(requests.map((r) => r.type)).toEqual(['MANAGEMENT', 'SERVICE', 'DISCOUNT'])
    expect(requests[0]).toMatchObject({ quantity: 75.5, unitPrice: 7000, amount: 528500 })
    expect(requests[1]).toMatchObject({ sourceRef: 'GD-1', amount: 50000 })
    expect(requests[2]).toMatchObject({ amount: -1000, quantity: null })
  })
})
