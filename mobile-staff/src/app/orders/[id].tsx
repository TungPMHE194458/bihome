import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PromptModal } from '@/components/common'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ORDER_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime, money } from '@/lib/format'
import { serviceApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function OrderScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const order = useQuery({ queryKey: ['order', id], queryFn: () => serviceApi.order(id) })
  const [busy, setBusy] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  if (order.isLoading) return <Loading />
  if (order.error || !order.data) return <ErrorView message={errorMessage(order.error)} onRetry={() => void order.refetch()} />
  const o = order.data
  const canWrite = can('SERVICE_WRITE')

  const changed = async () => {
    void qc.invalidateQueries({ queryKey: ['pending'] })
    void qc.invalidateQueries({ queryKey: ['orders'] })
    await order.refetch()
  }

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await action()
      await changed()
      notify(message)
    } catch (e) {
      notify('Không thực hiện được', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (reason: string) => {
    try {
      await serviceApi.cancelOrder(id, reason, o.version)
      setCancelling(false)
      await changed()
    } catch (e) {
      notify('Không huỷ được đơn', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => order.refetch()}>
      <Card style={{ gap: 4 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{o.code}</Text>
          <Chip {...ORDER_STATUS[o.status]} />
        </View>
        <Text style={styles.title}>{o.serviceName}</Text>
        <Row label="Căn hộ" value={o.apartmentCode} />
        {o.residentName && <Row label="Cư dân" value={o.residentName} />}
        <Row label="Số lượng" value={`${o.quantity} ${o.unit}`} />
        <Row label="Đơn giá" value={money(o.unitPrice)} />
        {o.discount > 0 && <Row label={`Voucher ${o.voucherCode ?? ''}`} value={`- ${money(o.discount)}`} />}
        <Row label="Tổng" value={money(o.total)} strong />
        {o.scheduledAt && <Row label="Hẹn lúc" value={formatDateTime(o.scheduledAt)} strong />}
        <Row label="Đặt lúc" value={`${formatDateTime(o.createdAt)}${o.createdBy ? ` · ${o.createdBy}` : ''}`} />
        {o.completedAt && <Row label="Hoàn thành" value={formatDateTime(o.completedAt)} />}
        {o.note ? <Text style={styles.note}>Ghi chú: {o.note}</Text> : null}
        {o.cancelReason ? <Text style={[styles.note, { color: colors.danger }]}>Lý do huỷ: {o.cancelReason}</Text> : null}
      </Card>
      {canWrite && o.status === 'PENDING' && (
        <Button title="Xác nhận đơn" icon="check" onPress={() => void run(() => serviceApi.confirmOrder(id, o.version), 'Đã xác nhận đơn')} loading={busy} />
      )}
      {canWrite && o.status === 'CONFIRMED' && (
        <Button title="Hoàn thành" icon="check-all" onPress={() => void run(() => serviceApi.completeOrder(id, o.version), 'Đã hoàn thành đơn')} loading={busy} />
      )}
      {canWrite && (o.status === 'PENDING' || o.status === 'CONFIRMED') && (
        <Button title="Huỷ đơn" variant="ghost" onPress={() => setCancelling(true)} />
      )}
      <PromptModal
        visible={cancelling}
        title="Huỷ đơn dịch vụ"
        label="Lý do huỷ *"
        confirmLabel="Huỷ đơn"
        danger
        onCancel={() => setCancelling(false)}
        onConfirm={cancel}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
})
