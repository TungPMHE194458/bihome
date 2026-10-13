import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, ErrorView, Icon, Loading, Row, SectionTitle, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { money, shortDay } from '@/lib/format'
import { api, type BookingInput } from '@/lib/resident'
import type { SlotAvailability } from '@/lib/types'
import { colors } from '@/theme'

export default function AmenityBookingScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const apt = useApartment()
  const qc = useQueryClient()
  const today = dayjs().format('YYYY-MM-DD')
  const amenity = useQuery({ queryKey: ['amenity', id, apt.id], queryFn: () => api.amenity(id, apt.id) })
  const availability = useQuery({
    queryKey: ['amenity', id, apt.id, 'availability', today],
    queryFn: () => api.availability(id, apt.id, today, 14),
  })
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<SlotAvailability | null>(null)
  const [people, setPeople] = useState(1)
  const [voucher, setVoucher] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const days = useMemo(
    () => (availability.data?.days ?? []).filter((d) => !d.closedReason || d.slots.length),
    [availability.data],
  )
  const day = days.find((d) => d.date === date) ?? days[0]

  const input: BookingInput | null = slot && day
    ? { amenityId: id, apartmentId: apt.id, bookingDate: day.date, startTime: slot.startTime, endTime: slot.endTime, peopleCount: people, voucherCode: voucher.trim() || undefined, note: note.trim() || undefined }
    : null
  const quote = useQuery({
    queryKey: ['quote', input],
    queryFn: () => api.quote(input!),
    enabled: !!input,
    retry: false,
  })

  if (amenity.isLoading || availability.isLoading) return <Loading />
  if (amenity.error || !amenity.data) return <ErrorView message={errorMessage(amenity.error)} onRetry={() => void amenity.refetch()} />
  const a = amenity.data

  const book = async () => {
    if (!input) return
    setSaving(true)
    setMessage(null)
    try {
      const b = await api.book(input)
      await qc.invalidateQueries({ queryKey: ['apt', apt.id] })
      await qc.invalidateQueries({ queryKey: ['amenity', id] })
      router.replace(`/bookings/${b.id}`)
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: a.name }} />
      <AuthImage url={a.coverImageUrl} style={styles.cover} icon="pool" />
      <Card style={{ gap: 4 }}>
        <Row label="Vị trí" value={a.location || '—'} />
        <Row label="Giờ mở cửa" value={`${a.openTime}–${a.closeTime}`} />
        <Row label="Sức chứa" value={`${a.capacity} người`} />
        {availability.data && (
          <Row label="Huỷ miễn phí" value={`trước ${availability.data.freeCancelHours} giờ`} />
        )}
        {a.requiresApproval && <Text style={styles.note}>Lượt đặt cần Ban quản lý duyệt.</Text>}
        {a.rules ? <Text style={styles.rules}>{a.rules}</Text> : null}
      </Card>

      <SectionTitle title="Chọn ngày" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d) => {
          const active = d.date === day?.date
          return (
            <Pressable key={d.date} onPress={() => {
                setDate(d.date)
                setSlot(null)
              }} style={[styles.day, active && styles.dayActive]}>
              <Text style={[styles.dayText, active && { color: '#FFFFFF' }]}>{shortDay(d.date)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <SectionTitle title="Chọn khung giờ" />
      {!day || day.closedReason ? (
        <Text style={styles.note}>{day?.closedReason ?? 'Không có khung giờ nào để đặt.'}</Text>
      ) : (
        <View style={styles.slots}>
          {day.slots.map((s) => {
            const full = s.remaining <= 0 || s.past
            const active = slot?.startTime === s.startTime
            return (
              <Pressable
                key={s.startTime}
                disabled={full}
                onPress={() => setSlot(s)}
                style={[styles.slot, active && styles.slotActive, full && styles.slotFull]}
              >
                <Text style={[styles.slotTime, active && { color: '#FFFFFF' }, full && { color: colors.textMuted }]}>
                  {s.startTime}–{s.endTime}
                </Text>
                <Text style={[styles.slotMeta, active && { color: '#DCFCE7' }]}>
                  {s.past ? 'Đã qua' : s.remaining <= 0 ? 'Hết chỗ' : `Còn ${s.remaining}`}
                  {s.price ? ` · ${money(s.price)}` : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

      {slot && (
        <Card style={{ gap: 12 }}>
          <View style={styles.people}>
            <Text style={styles.label}>Số người</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => setPeople((p) => Math.max(1, p - 1))} style={styles.step} accessibilityLabel="Bớt người">
                <Icon name="minus" size={20} />
              </Pressable>
              <Text style={styles.peopleValue}>{people}</Text>
              <Pressable onPress={() => setPeople((p) => Math.min(slot.remaining, p + 1))} style={styles.step} accessibilityLabel="Thêm người">
                <Icon name="plus" size={20} />
              </Pressable>
            </View>
          </View>
          <TextField label="Mã voucher (nếu có)" autoCapitalize="characters" value={voucher} onChangeText={setVoucher} />
          <TextField label="Ghi chú" value={note} onChangeText={setNote} maxLength={500} />
          {quote.data ? (
            <View>
              <Row label="Phí" value={money(quote.data.fee)} />
              {quote.data.discount > 0 && <Row label="Giảm giá" value={`-${money(quote.data.discount)}`} />}
              <Row label="Tổng cộng" value={money(quote.data.total)} strong />
              {quote.data.total > 0 && <Text style={styles.note}>Phí được cộng vào thông báo phí kỳ tới nếu chưa thanh toán.</Text>}
            </View>
          ) : quote.error ? (
            <Text style={styles.error}>{errorMessage(quote.error)}</Text>
          ) : null}
          {message && <Text style={styles.error}>{message}</Text>}
          <Button
            title={a.requiresApproval ? 'Gửi đăng ký' : 'Đặt chỗ'}
            icon="calendar-check"
            onPress={() => void book()}
            loading={saving}
            disabled={!!quote.error}
          />
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16 },
  note: { fontSize: 13, color: colors.warning },
  rules: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  day: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontWeight: '600', color: colors.text },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: '31.5%', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotFull: { backgroundColor: colors.neutralLight },
  slotTime: { fontWeight: '700', color: colors.text },
  slotMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  people: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  peopleValue: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13 },
})
