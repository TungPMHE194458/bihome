import { z } from 'zod'
import type { PaymentMethod } from '@/features/feenotice/types'
import type { PaymentRequest } from '@/features/payment/types'
import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

export const paymentSchema = z
  .object({
    feeNoticeId: z.number().nullable(),
    outstanding: z.number(),
    amount: z.string().trim().min(1, 'Nhập số tiền'),
    method: z.enum(['CASH', 'BANK_TRANSFER', 'VIETQR']),
    paidAt: z.string().min(1, 'Nhập thời gian thu'),
    payerName: z.string().max(150, 'Tối đa 150 ký tự'),
    bankReference: z.string().max(100, 'Tối đa 100 ký tự'),
    note: z.string().max(500, 'Tối đa 500 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.feeNoticeId == null) ctx.addIssue({ code: 'custom', path: ['feeNoticeId'], message: 'Chọn thông báo phí' })
    const amount = Number(v.amount.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Số tiền phải lớn hơn 0' })
    } else if (amount > v.outstanding) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Số tiền vượt số còn nợ' })
    }
    if (dayjs.tz(v.paidAt, APP_TIMEZONE).isAfter(dayjs().add(5, 'minute'))) {
      ctx.addIssue({ code: 'custom', path: ['paidAt'], message: 'Thời gian thu không được ở tương lai' })
    }
  })

export type PaymentFormValues = z.infer<typeof paymentSchema>

export function emptyPayment(feeNoticeId: number | null = null, outstanding = 0): PaymentFormValues {
  return {
    feeNoticeId,
    outstanding,
    amount: outstanding > 0 ? String(outstanding) : '',
    method: 'CASH' as PaymentMethod,
    paidAt: dayjs().tz(APP_TIMEZONE).format('YYYY-MM-DDTHH:mm'),
    payerName: '',
    bankReference: '',
    note: '',
  }
}

/** "1.250.000" hoặc "1250000" → 1250000. */
export function parseMoney(text: string): number {
  return Math.round(Number(text.replace(/\./g, '').replace(',', '.')))
}

export function paymentToRequest(v: PaymentFormValues): PaymentRequest {
  return {
    feeNoticeId: v.feeNoticeId!,
    amount: parseMoney(v.amount),
    method: v.method,
    paidAt: dayjs.tz(v.paidAt, APP_TIMEZONE).format(),
    payerName: v.payerName.trim() || null,
    bankReference: v.method === 'CASH' ? null : v.bankReference.trim() || null,
    note: v.note.trim() || null,
  }
}
