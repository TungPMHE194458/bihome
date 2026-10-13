import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { SERVICE_ORDER_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime, money } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function OrderScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.orderDetail(id) })
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  if (order.isLoading) return <Loading />
  if (order.error || !order.data) return <ErrorView message={errorMessage(order.error)} onRetry={() => void order.refetch()} />
  const o = order.data
  const open = o.status === 'PENDING' || o.status === 'CONFIRMED'

  const cancel = async () => {
    setSaving(true)
    try {
      await api.cancelOrder(id, reason.trim(), o.version)
      setCancelling(false)
      await order.refetch()
      void qc.invalidateQueries({ queryKey: ['apt'] })
    } catch (e) {
      notify('Không huỷ được', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen onRefresh={() => order.refetch()}>
      <Card style={{ gap: 4 }}>
        <Chip {...SERVICE_ORDER_STATUS[o.status]} />
        <Text style={styles.name}>{o.serviceName}</Text>
        <Row label="Mã đơn" value={o.code} />
        <Row label="Căn hộ" value={o.apartmentCode} />
        <Row label="Số lượng" value={`${o.quantity} ${o.unit} × ${money(o.unitPrice)}`} />
        {o.discount > 0 && <Row label="Giảm giá" value={`-${money(o.discount)}${o.voucherCode ? ` (${o.voucherCode})` : ''}`} />}
        <Row label="Tổng cộng" value={money(o.total)} strong />
        <Row label="Hẹn lúc" value={formatDateTime(o.scheduledAt)} />
        <Row label="Đặt lúc" value={formatDateTime(o.createdAt)} />
        {o.completedAt ? <Row label="Hoàn thành" value={formatDateTime(o.completedAt)} /> : null}
        {o.note ? <Row label="Ghi chú" value={o.note} /> : null}
        {o.cancelReason ? <Text style={styles.muted}>Lý do huỷ: {o.cancelReason}</Text> : null}
      </Card>
      {open && !cancelling && <Button title="Huỷ đơn" variant="outline" icon="close-circle-outline" onPress={() => setCancelling(true)} />}
      {cancelling && (
        <Card style={{ gap: 12 }}>
          <TextField label="Lý do huỷ" value={reason} onChangeText={setReason} maxLength={500} />
          <Button title="Xác nhận huỷ" variant="danger" onPress={() => void cancel()} loading={saving} disabled={!reason.trim()} />
          <Button title="Không huỷ" variant="ghost" onPress={() => setCancelling(false)} />
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginVertical: 6 },
  muted: { fontSize: 13, color: colors.textMuted },
})
