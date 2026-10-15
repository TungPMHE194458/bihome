import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PromptModal } from '@/components/common'
import { Screen } from '@/components/Screen'
import { Button, Card, Chip, ErrorView, Loading, Row } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PAYMENT_METHOD, PAYMENT_RECORD_STATUS, RECONCILE_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDateTime, money, periodLabel } from '@/lib/format'
import { paymentApi } from '@/lib/staff'
import { colors } from '@/theme'

export default function PaymentDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const payment = useQuery({ queryKey: ['payment', id], queryFn: () => paymentApi.get(id) })
  const [cancelling, setCancelling] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (payment.isLoading) return <Loading />
  if (payment.error || !payment.data) return <ErrorView message={errorMessage(payment.error)} onRetry={() => void payment.refetch()} />
  const p = payment.data

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['payments'] })
    await payment.refetch()
  }

  const downloadReceipt = async () => {
    setDownloading(true)
    try {
      await paymentApi.receipt(id, p.code)
    } catch (e) {
      notify('Không tải được phiếu thu', errorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  const reconcile = async (status: 'MATCHED' | 'MISMATCHED') => {
    setReconciling(true)
    try {
      await paymentApi.reconcile(id, { status, version: p.version })
      await refresh()
      notify(status === 'MATCHED' ? 'Đã đánh dấu khớp sao kê' : 'Đã đánh dấu lệch sao kê')
    } catch (e) {
      notify('Không đối soát được', errorMessage(e))
    } finally {
      setReconciling(false)
    }
  }

  const cancel = async (reason: string) => {
    try {
      await paymentApi.cancel(id, { reason, version: p.version })
      setCancelling(false)
      await refresh()
      notify('Đã huỷ phiếu thu')
    } catch (e) {
      notify('Không huỷ được', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => payment.refetch()}>
      <Stack.Screen options={{ title: p.code }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{p.code}</Text>
          <Chip {...PAYMENT_RECORD_STATUS[p.status]} />
        </View>
        <Text style={styles.amount}>{money(p.amount)}</Text>
        <Row label="Thông báo phí" value={`${p.feeNoticeCode} · kỳ ${periodLabel(p.period)}`} />
        <Row label="Căn hộ" value={p.apartmentCode} />
        <Row label="Phương thức" value={PAYMENT_METHOD[p.method]} />
        <Row label="Thời gian thu" value={formatDateTime(p.paidAt)} />
        <Row label="Người thu" value={p.collectorName} />
        {p.payerName ? <Row label="Người nộp" value={p.payerName} /> : null}
        {p.bankReference ? <Row label="Mã GD ngân hàng" value={p.bankReference} /> : null}
        <Row label="Đối soát" value={<Chip {...RECONCILE_STATUS[p.reconcileStatus]} />} />
        {p.note ? <Text style={styles.note}>Ghi chú: {p.note}</Text> : null}
        {p.status === 'CANCELLED' && p.cancelReason ? (
          <Text style={[styles.note, { color: colors.danger }]}>
            Lý do huỷ: {p.cancelReason}{p.cancelledBy ? ` · ${p.cancelledBy}` : ''}{p.cancelledAt ? ` · ${formatDateTime(p.cancelledAt)}` : ''}
          </Text>
        ) : null}
      </Card>

      <Button title="In phiếu thu" icon="file-pdf-box" variant="outline" onPress={() => void downloadReceipt()} loading={downloading} />

      {can('PAYMENT_WRITE') && p.status === 'VALID' && p.reconcileStatus === 'PENDING' && (
        <View style={styles.actions}>
          <Button title="Lệch sao kê" variant="danger" onPress={() => void reconcile('MISMATCHED')} style={{ flex: 1 }} loading={reconciling} />
          <Button title="Đã khớp" icon="check" onPress={() => void reconcile('MATCHED')} style={{ flex: 1 }} loading={reconciling} />
        </View>
      )}
      {can('PAYMENT_WRITE') && p.status === 'VALID' && <Button title="Huỷ phiếu thu" variant="ghost" onPress={() => setCancelling(true)} />}

      <PromptModal
        visible={cancelling}
        title="Huỷ phiếu thu"
        label="Lý do huỷ *"
        confirmLabel="Huỷ phiếu thu"
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
  amount: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
})
