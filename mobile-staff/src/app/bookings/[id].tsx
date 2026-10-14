import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PromptModal } from '@/components/common'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { BOOKING_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDate, formatDateTime, money } from '@/lib/format'
import { api } from '@/lib/staff'
import { colors } from '@/theme'

export default function BookingScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const booking = useQuery({ queryKey: ['booking', id], queryFn: () => api.booking(id) })
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  if (booking.isLoading) return <Loading />
  if (booking.error || !booking.data) return <ErrorView message={errorMessage(booking.error)} onRetry={() => void booking.refetch()} />
  const b = booking.data
  const canDecide = can('AMENITY_BOOKING_WRITE') && b.status === 'PENDING'

  const done = async (message: string) => {
    void qc.invalidateQueries({ queryKey: ['pending'] })
    void qc.invalidateQueries({ queryKey: ['bookings'] })
    await booking.refetch()
    notify(message)
    router.back()
  }

  const approve = async () => {
    setBusy(true)
    try {
      await api.approveBooking(id, b.version)
      await done('Đã duyệt lượt đặt')
    } catch (e) {
      notify('Không duyệt được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const reject = async (reason: string) => {
    try {
      await api.rejectBooking(id, reason, b.version)
      setRejecting(false)
      await done('Đã từ chối lượt đặt')
    } catch (e) {
      notify('Không từ chối được', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => booking.refetch()}>
      <Card style={{ gap: 4 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{b.code}</Text>
          <Chip {...BOOKING_STATUS[b.status]} />
        </View>
        <Text style={styles.title}>{b.amenityName}</Text>
        <Text style={styles.slot}>
          {b.startTime}–{b.endTime} · {formatDate(b.bookingDate)}
        </Text>
        <Row label="Căn hộ" value={b.apartmentCode} />
        {b.residentName && <Row label="Cư dân" value={b.residentName} />}
        <Row label="Số người" value={b.peopleCount} />
        <Row label="Phí" value={b.fee ? money(b.fee) : 'Miễn phí'} />
        {b.discount > 0 && <Row label={`Voucher ${b.voucherCode ?? ''}`} value={`- ${money(b.discount)}`} />}
        <Row label="Tổng" value={money(b.total)} strong />
        <Row label="Gửi lúc" value={`${formatDateTime(b.createdAt)}${b.createdBy ? ` · ${b.createdBy}` : ''}`} />
        {b.decidedAt && <Row label="Xử lý" value={`${b.decidedBy ?? ''} · ${formatDateTime(b.decidedAt)}`} />}
        {b.note ? <Text style={styles.note}>Ghi chú: {b.note}</Text> : null}
        {b.rejectReason ? <Text style={[styles.note, { color: colors.danger }]}>Lý do từ chối: {b.rejectReason}</Text> : null}
      </Card>
      {canDecide && (
        <View style={styles.actions}>
          <Button title="Từ chối" variant="danger" onPress={() => setRejecting(true)} style={{ flex: 1 }} />
          <Button title="Duyệt" icon="check" onPress={() => void approve()} loading={busy} style={{ flex: 1 }} />
        </View>
      )}
      <PromptModal
        visible={rejecting}
        title="Từ chối lượt đặt"
        label="Lý do (gửi tới cư dân) *"
        confirmLabel="Từ chối"
        danger
        onCancel={() => setRejecting(false)}
        onConfirm={reject}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  slot: { fontSize: 15, fontWeight: '600', color: colors.primaryDark, marginBottom: 6 },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
})
