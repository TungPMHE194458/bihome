import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DateField, parseVnDate, Stepper } from '@/components/form'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, ErrorView, Loading, Row, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { money } from '@/lib/format'
import { api, type ServiceOrderInput } from '@/lib/resident'
import { colors } from '@/theme'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Đặt dịch vụ: số lượng × đơn giá − voucher; hẹn ngày giờ (tuỳ chọn). Phí cộng vào thông báo phí kỳ tới. */
export default function ServiceOrderScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const apt = useApartment()
  const qc = useQueryClient()
  const service = useQuery({ queryKey: ['service', id, apt.id], queryFn: () => api.service(id, apt.id) })
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [voucher, setVoucher] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const day = parseVnDate(date)
  const scheduledAt = day && TIME.test(time) ? dayjs(`${day}T${time}`).format() : undefined
  const input: ServiceOrderInput = {
    serviceId: id,
    apartmentId: apt.id,
    quantity,
    scheduledAt,
    voucherCode: voucher.trim() || undefined,
    note: note.trim() || undefined,
  }
  const quote = useQuery({ queryKey: ['service-quote', input], queryFn: () => api.quoteOrder(input), retry: false })

  if (service.isLoading) return <Loading />
  if (service.error || !service.data) return <ErrorView message={errorMessage(service.error)} onRetry={() => void service.refetch()} />
  const s = service.data

  const submit = async () => {
    const e: Record<string, string> = {}
    if (date && day === null) e.date = 'Ngày không hợp lệ (dd/mm/yyyy)'
    if ((date || time) && !TIME.test(time)) e.time = 'Nhập giờ dạng HH:mm, vd 09:30'
    if (time && !date) e.date = 'Nhập ngày hẹn'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const o = await api.order(input)
      await qc.invalidateQueries({ queryKey: ['apt', apt.id] })
      router.replace(`/orders/${o.id}`)
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: s.name }} />
      <AuthImage url={s.coverImageUrl} style={styles.cover} icon="room-service-outline" />
      <Card style={{ gap: 4 }}>
        <Text style={styles.price}>
          {money(s.unitPrice)} / {s.unit}
        </Text>
        <Text style={styles.muted}>{s.serviceTypeName}</Text>
        {s.description ? <Text style={styles.body}>{s.description}</Text> : null}
      </Card>
      <Card style={{ gap: 14 }}>
        <View style={styles.qty}>
          <Text style={styles.label}>Số lượng ({s.unit})</Text>
          <Stepper value={quantity} onChange={setQuantity} min={1} max={999} />
        </View>
        <DateField label="Ngày hẹn (tuỳ chọn)" value={date} onChange={setDate} error={errors.date} />
        <TextField label="Giờ hẹn" placeholder="HH:mm" keyboardType="numbers-and-punctuation" value={time} onChangeText={setTime}
          maxLength={5} error={errors.time} />
        <TextField label="Mã voucher (nếu có)" autoCapitalize="characters" value={voucher} onChangeText={setVoucher} />
        <TextField label="Ghi chú" multiline value={note} onChangeText={setNote} maxLength={500} placeholder="Yêu cầu thêm cho nhân viên…" />
        {quote.data ? (
          <View>
            <Row label="Thành tiền" value={money(quote.data.amount)} />
            {quote.data.discount > 0 && <Row label="Giảm giá" value={`-${money(quote.data.discount)}`} />}
            <Row label="Tổng cộng" value={money(quote.data.total)} strong />
            <Text style={styles.muted}>Phí được cộng vào thông báo phí kỳ tới nếu chưa thanh toán.</Text>
          </View>
        ) : quote.error ? (
          <Text style={styles.error}>{errorMessage(quote.error)}</Text>
        ) : null}
        {message && <Text style={styles.error}>{message}</Text>}
        <Button title="Đặt dịch vụ" icon="check" onPress={() => void submit()} loading={saving} disabled={!!quote.error} />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16 },
  price: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  muted: { fontSize: 13, color: colors.textMuted },
  body: { fontSize: 14, color: colors.text, marginTop: 4 },
  qty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
})
