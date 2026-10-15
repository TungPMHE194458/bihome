import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { ChipSelect, DateInput, TimeInput } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { PAYMENT_METHOD } from '@/lib/constants'
import { money } from '@/lib/format'
import { paymentApi } from '@/lib/staff'
import type { FeeNoticeSummary, Payment, PaymentMethod } from '@/lib/types'
import { colors } from '@/theme'

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: PAYMENT_METHOD.CASH },
  { value: 'BANK_TRANSFER', label: PAYMENT_METHOD.BANK_TRANSFER },
  { value: 'VIETQR', label: PAYMENT_METHOD.VIETQR },
]

export function RecordPaymentModal({
  visible,
  notice,
  onClose,
  onSaved,
}: {
  visible: boolean
  notice: FeeNoticeSummary
  onClose: () => void
  onSaved: (p: Payment) => void
}) {
  const [amount, setAmount] = useState(String(notice.outstanding))
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [paidDate, setPaidDate] = useState<string>()
  const [paidTime, setPaidTime] = useState<string>()
  const [payerName, setPayerName] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    const amountNum = Number(amount.replace(/\D/g, '') || '0')
    if (amountNum <= 0) e.amount = 'Vui lòng nhập số tiền'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const saved = await paymentApi.create({
        feeNoticeId: notice.id,
        amount: amountNum,
        method,
        paidAt: paidDate && paidTime ? `${paidDate}T${paidTime}:00+07:00` : null,
        payerName: payerName.trim() || null,
        bankReference: method !== 'CASH' && bankReference.trim() ? bankReference.trim() : null,
        note: note.trim() || null,
      })
      onSaved(saved)
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>Ghi nhận thanh toán</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {message && <Text style={{ color: colors.danger }}>{message}</Text>}
        <Text style={styles.notice}>
          Thông báo <Text style={styles.noticeStrong}>{notice.code}</Text> · căn {notice.apartmentCode} · còn nợ{' '}
          <Text style={styles.noticeStrong}>{money(notice.outstanding)}</Text>
        </Text>
        <TextField
          label="Số tiền (đ) *"
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          error={errors.amount}
        />
        <ChipSelect label="Phương thức" required options={METHOD_OPTIONS} value={method} onChange={(v) => v && setMethod(v)} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateInput label="Ngày thu (bỏ trống = bây giờ)" value={paidDate} onChange={setPaidDate} maximumDate={new Date()} />
          <View style={{ flex: 1 }}>
            <TimeInput label="Giờ thu" value={paidTime} onChange={setPaidTime} />
          </View>
        </View>
        <TextField label="Người nộp" value={payerName} onChangeText={setPayerName} placeholder={notice.holderName ?? ''} />
        {method !== 'CASH' && <TextField label="Mã giao dịch ngân hàng" value={bankReference} onChangeText={setBankReference} />}
        <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />
        {method !== 'CASH' && (
          <Text style={styles.hint}>Phiếu chuyển khoản / VietQR nhập tay ở trạng thái &quot;Chờ khớp&quot; cho đến khi đối soát với sao kê.</Text>
        )}
        <Button title="Ghi nhận" onPress={() => void submit()} loading={saving} />
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  close: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
  notice: { fontSize: 13, color: colors.textMuted },
  noticeStrong: { fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
})
