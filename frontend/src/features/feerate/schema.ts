import type { ApartmentType } from '@/features/apartment/types'
import type { FeeRates, FeeRatesRequest } from '@/features/feerate/types'

/** Trạng thái form đơn giá (ô nhập là chuỗi; rỗng = không áp dụng). */
export interface FeeRateForm {
  vatPercent: string
  dueDay: string
  management: Partial<Record<ApartmentType, string>>
  electric: TierRow[]
  water: TierRow[]
  parking: Record<number, string>
  others: { name: string; amount: string }[]
}

export interface TierRow {
  upTo: string
  unitPrice: string
}

const toText = (v?: number | null) => (v == null ? '' : String(v))
const toNumber = (v: string): number | null => {
  const t = v.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function ratesToForm(r: FeeRates): FeeRateForm {
  return {
    vatPercent: String(r.vatPercent),
    dueDay: String(r.dueDay),
    management: Object.fromEntries(r.managementRates.map((m) => [m.apartmentType, toText(m.unitPrice)])),
    electric: r.electricTiers.map((t) => ({ upTo: toText(t.upTo), unitPrice: toText(t.unitPrice) })),
    water: r.waterTiers.map((t) => ({ upTo: toText(t.upTo), unitPrice: toText(t.unitPrice) })),
    parking: Object.fromEntries(r.parkingRates.map((p) => [p.assetCategoryId, toText(p.unitPrice)])),
    others: r.otherCharges.map((o) => ({ name: o.name, amount: toText(o.amount) })),
  }
}

/** Kiểm tra như backend: mốc bậc tăng dần, chỉ bậc cuối để trống; trả lỗi theo khoá ô. */
export function validateRates(f: FeeRateForm): Record<string, string> {
  const errors: Record<string, string> = {}
  const vat = toNumber(f.vatPercent)
  if (vat == null || vat < 0 || vat > 100) errors.vatPercent = 'VAT từ 0 đến 100%'
  const due = Number(f.dueDay)
  if (!Number.isInteger(due) || due < 1 || due > 31) errors.dueDay = 'Ngày từ 1 đến 31'
  for (const [key, rows] of [['electric', f.electric], ['water', f.water]] as const) {
    let previous = 0
    rows.forEach((row, i) => {
      const last = i === rows.length - 1
      const upTo = toNumber(row.upTo)
      if (toNumber(row.unitPrice) == null) errors[`${key}.${i}.unitPrice`] = 'Nhập đơn giá'
      if (!last && (upTo == null || upTo <= previous)) errors[`${key}.${i}.upTo`] = 'Mốc phải lớn hơn bậc trước'
      if (upTo != null) previous = upTo
    })
  }
  f.others.forEach((o, i) => {
    if (!o.name.trim()) errors[`others.${i}.name`] = 'Nhập tên khoản'
    if (toNumber(o.amount) == null) errors[`others.${i}.amount`] = 'Nhập số tiền'
  })
  return errors
}

export function formToRequest(f: FeeRateForm, version?: number | null): FeeRatesRequest {
  const tiers = (rows: TierRow[]) =>
    rows.map((r, i) => ({ upTo: i === rows.length - 1 ? null : toNumber(r.upTo), unitPrice: toNumber(r.unitPrice) ?? 0 }))
  return {
    vatPercent: toNumber(f.vatPercent) ?? 0,
    dueDay: Number(f.dueDay),
    managementRates: (Object.entries(f.management) as [ApartmentType, string][])
      .filter(([, v]) => toNumber(v) != null)
      .map(([apartmentType, v]) => ({ apartmentType, unitPrice: toNumber(v)! })),
    electricTiers: tiers(f.electric),
    waterTiers: tiers(f.water),
    parkingRates: Object.entries(f.parking)
      .filter(([, v]) => toNumber(v) != null)
      .map(([id, v]) => ({ assetCategoryId: Number(id), unitPrice: toNumber(v)! })),
    otherCharges: f.others.map((o) => ({ name: o.name.trim(), amount: toNumber(o.amount) ?? 0 })),
    version: version ?? null,
  }
}

/** Tiền theo bậc thang cho một mức tiêu thụ (để xem thử ngay trên form). */
export function tieredCost(consumption: number, rows: TierRow[]): number {
  let lower = 0
  let total = 0
  rows.forEach((r, i) => {
    const price = toNumber(r.unitPrice) ?? 0
    const upTo = i === rows.length - 1 ? Infinity : (toNumber(r.upTo) ?? lower)
    const qty = Math.max(0, Math.min(consumption, upTo) - lower)
    total += Math.round(qty * price)
    lower = upTo
  })
  return total
}
