import type { FeeItem, FeeItemType, ItemRequest } from '@/features/feenotice/types'

/** Một dòng đang sửa trong form thông báo nháp (số để chuỗi cho ô nhập). */
export interface EditableItem {
  key: string
  type: FeeItemType
  description: string
  quantity: string
  unitPrice: string
  amount: string
  sourceRef?: string | null
}

const TAXABLE: FeeItemType[] = ['MANAGEMENT', 'ELECTRIC', 'WATER', 'PARKING', 'OTHER']
const ORDER: FeeItemType[] = ['MANAGEMENT', 'ELECTRIC', 'WATER', 'PARKING', 'OTHER', 'VAT', 'SERVICE', 'PREVIOUS_DEBT', 'DISCOUNT']

let seq = 0
const nextKey = () => `item-${++seq}`

function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Bỏ dòng VAT (backend tự tính lại khi lưu). */
export function toEditable(items: FeeItem[]): EditableItem[] {
  return items
    .filter((i) => i.type !== 'VAT')
    .map((i) => ({
      key: nextKey(),
      type: i.type,
      description: i.description,
      quantity: i.quantity == null ? '' : String(i.quantity),
      unitPrice: i.unitPrice == null ? '' : String(i.unitPrice),
      amount: String(Math.abs(i.amount)),
      sourceRef: i.sourceRef,
    }))
}

export function newItem(type: FeeItemType): EditableItem {
  return {
    key: nextKey(),
    type,
    description: type === 'DISCOUNT' ? 'Giảm trừ' : '',
    quantity: type === 'DISCOUNT' ? '' : '1',
    unitPrice: '',
    amount: '',
  }
}

/** Thành tiền của dòng: số lượng × đơn giá (làm tròn đồng) nếu đủ, không thì số tiền nhập; giảm trừ mang dấu âm. */
export function lineAmount(row: EditableItem): number | null {
  const q = num(row.quantity)
  const p = num(row.unitPrice)
  const value = q != null && p != null && row.type !== 'DISCOUNT' ? Math.round(q * p) : num(row.amount)
  if (value == null) return null
  return row.type === 'DISCOUNT' ? -Math.abs(Math.round(value)) : Math.round(value)
}

/** Tổng dự kiến (VAT tính như backend: % trên các khoản chịu thuế, làm tròn đồng). */
export function previewTotals(rows: EditableItem[], vatPercent: number): { vat: number; total: number } {
  const amounts = rows.map((r) => ({ type: r.type, amount: lineAmount(r) ?? 0 }))
  const base = amounts.filter((a) => TAXABLE.includes(a.type)).reduce((s, a) => s + a.amount, 0)
  const vat = vatPercent > 0 && base > 0 ? Math.round((base * vatPercent) / 100) : 0
  return { vat, total: amounts.reduce((s, a) => s + a.amount, 0) + vat }
}

/** Lỗi theo dòng (index → thông báo); rỗng = hợp lệ. */
export function validateItems(rows: EditableItem[]): Record<number, string> {
  const errors: Record<number, string> = {}
  rows.forEach((r, i) => {
    if (!r.description.trim()) errors[i] = 'Nhập nội dung khoản'
    else if (r.type !== 'SERVICE' && r.type !== 'PREVIOUS_DEBT' && lineAmount(r) == null)
      errors[i] = r.type === 'DISCOUNT' ? 'Nhập số tiền giảm trừ' : 'Nhập số lượng × đơn giá hoặc thành tiền'
  })
  return errors
}

export function toItemRequests(rows: EditableItem[]): ItemRequest[] {
  return [...rows]
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
    .map((r) => ({
      type: r.type,
      description: r.description.trim(),
      quantity: r.type === 'DISCOUNT' ? null : num(r.quantity),
      unitPrice: r.type === 'DISCOUNT' ? null : num(r.unitPrice),
      amount: lineAmount(r),
      sourceRef: r.sourceRef ?? null,
    }))
}
