import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { BOOKING_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime, money, shortDay } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function BookingScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const booking = useQuery({ queryKey: ['booking', id], queryFn: () => api.booking(id) })
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  if (booking.isLoading) return <Loading />
  if (booking.error || !booking.data) return <ErrorView message={errorMessage(booking.error)} onRetry={() => void booking.refetch()} />
  const b = booking.data
  const open = b.status === 'PENDING' || b.status === 'APPROVED'
  const free = b.status === 'PENDING' || !b.freeCancelUntil || dayjs().isBefore(dayjs(b.freeCancelUntil))

  const cancel = async () => {
    if (!reason.trim()) return
    setSaving(true)
    try {
      await api.cancelBooking(id, reason.trim(), b.version)
      setCancelling(false)
      await booking.refetch()
      void qc.invalidateQueries({ queryKey: ['apt'] })
    } catch (e) {
      notify('Không huỷ được', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen onRefresh={() => booking.refetch()}>
      <Card style={{ gap: 4 }}>
        <Chip {...BOOKING_STATUS[b.status]} />
        <Text style={styles.name}>{b.amenityName}</Text>
        <Text style={styles.time}>
          {shortDay(b.bookingDate)} · {b.startTime}–{b.endTime}
        </Text>
        <Row label="Mã lượt đặt" value={b.code} />
        <Row label="Căn hộ" value={b.apartmentCode} />
        <Row label="Số người" value={String(b.peopleCount)} />
        {b.discount > 0 && <Row label="Giảm giá" value={`-${money(b.discount)}${b.voucherCode ? ` (${b.voucherCode})` : ''}`} />}
        <Row label="Phí" value={money(b.total)} strong />
        {b.freeCancelUntil && open && <Row label="Huỷ miễn phí trước" value={formatDateTime(b.freeCancelUntil)} />}
        {b.note ? <Row label="Ghi chú" value={b.note} /> : null}
        {b.rejectReason ? <Text style={styles.danger}>Lý do từ chối: {b.rejectReason}</Text> : null}
        {b.cancelReason ? <Text style={styles.muted}>Lý do huỷ: {b.cancelReason}</Text> : null}
      </Card>

      {open && !cancelling && <Button title="Huỷ lượt đặt" variant="outline" icon="calendar-remove" onPress={() => setCancelling(true)} />}
      {cancelling && (
        <Card style={{ gap: 12 }}>
          <Text style={free ? styles.muted : styles.danger}>
            {free ? 'Huỷ miễn phí: voucher (nếu có) được hoàn lại.' : 'Đã quá hạn huỷ miễn phí: phí của lượt đặt vẫn được tính.'}
          </Text>
          <TextField label="Lý do huỷ" value={reason} onChangeText={setReason} maxLength={500} />
          <Button title="Xác nhận huỷ" variant="danger" onPress={() => void cancel()} loading={saving} disabled={!reason.trim()} />
          <Button title="Không huỷ" variant="ghost" onPress={() => setCancelling(false)} />
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6 },
  time: { fontSize: 16, color: colors.text, fontWeight: '500', marginBottom: 6 },
  muted: { fontSize: 13, color: colors.textMuted },
  danger: { fontSize: 13, color: colors.danger },
})
