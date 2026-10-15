import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PromptModal } from '@/components/common'
import { RecordPaymentModal } from '@/components/RecordPaymentModal'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { FEE_ITEM_LABEL, FEE_NOTICE_STATUS, PAYMENT_METHOD, RECONCILE_STATUS } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { formatDate, formatDateTime, money, periodLabel } from '@/lib/format'
import { feeNoticeApi } from '@/lib/staff'
import { isCollectible } from '@/lib/types'
import { colors } from '@/theme'

export default function FeeNoticeDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const detail = useQuery({ queryKey: ['fee-notice', id], queryFn: () => feeNoticeApi.get(id) })
  const [recording, setRecording] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (detail.isLoading) return <Loading />
  if (detail.error || !detail.data) return <ErrorView message={errorMessage(detail.error)} onRetry={() => void detail.refetch()} />
  const d = detail.data
  const n = d.summary
  const collectible = isCollectible(n)

  const refresh = async () => {
    void qc.invalidateQueries({ queryKey: ['fee-notices'] })
    await detail.refetch()
  }

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      await feeNoticeApi.pdf(id, n.code)
    } catch (e) {
      notify('Không tải được PDF', errorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  const cancel = async (reason: string) => {
    try {
      await feeNoticeApi.cancel(id, { reason, version: n.version })
      setCancelling(false)
      await refresh()
      notify('Đã huỷ thông báo')
    } catch (e) {
      notify('Không huỷ được', errorMessage(e))
    }
  }

  return (
    <Screen onRefresh={() => detail.refetch()}>
      <Stack.Screen options={{ title: n.code }} />
      <Card style={{ gap: 2 }}>
        <View style={styles.top}>
          <Text style={styles.code}>{n.code}</Text>
          <Chip {...FEE_NOTICE_STATUS[n.status]} />
        </View>
        <Text style={styles.apartment}>Căn {n.apartmentCode}{n.holderName ? ` · ${n.holderName}` : ''}</Text>
        <Row label="Kỳ" value={periodLabel(n.period)} />
        <Row label="Hạn thanh toán" value={formatDate(n.dueDate)} />
        <Row label="Tổng tiền" value={money(n.totalAmount)} />
        <Row label="Đã thu" value={money(n.paidAmount)} />
        <Row label="Còn nợ" value={money(n.outstanding)} strong />
        {n.carriedToCode && <Row label="Đã chuyển nợ sang" value={n.carriedToCode} />}
        {d.carriedFrom.length > 0 && (
          <Row label="Nợ chuyển từ" value={d.carriedFrom.map((c) => c.code).join(', ')} />
        )}
        {d.note ? <Text style={styles.note}>Ghi chú: {d.note}</Text> : null}
        {d.cancelReason ? <Text style={[styles.note, { color: colors.danger }]}>Lý do huỷ: {d.cancelReason}</Text> : null}
      </Card>

      <SectionTitle title="Các khoản" />
      <Card style={{ gap: 8 }}>
        {d.items.map((it, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemLabel}>{FEE_ITEM_LABEL[it.type]}</Text>
              <Text style={styles.itemDesc}>{it.description}</Text>
            </View>
            <Text style={[styles.itemAmount, it.amount < 0 && { color: colors.primaryDark }]}>{money(it.amount)}</Text>
          </View>
        ))}
      </Card>

      {d.payments.length > 0 && (
        <>
          <SectionTitle title="Phiếu thu" />
          {d.payments.map((p) => (
            <Card key={p.id} style={{ gap: 2 }}>
              <View style={styles.top}>
                <Text style={styles.itemLabel}>{p.code} · {money(p.amount)}</Text>
                <Chip {...RECONCILE_STATUS[p.reconcileStatus]} />
              </View>
              <Text style={styles.itemDesc}>
                {PAYMENT_METHOD[p.method]} · {formatDateTime(p.paidAt)} · {p.collectorName}
                {p.status === 'CANCELLED' ? ' · Đã huỷ' : ''}
              </Text>
            </Card>
          ))}
        </>
      )}

      {d.vietQrAvailable && (
        <>
          <SectionTitle title="Quét mã VietQR để thanh toán" />
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <AuthImage url={`/api/v1/fee-notices/${id}/vietqr.png`} style={styles.qr} icon="qrcode" />
            {d.transferContent && <Text style={styles.itemDesc}>Nội dung CK: {d.transferContent}</Text>}
          </Card>
        </>
      )}

      <Button title="Tải PDF" icon="file-pdf-box" variant="outline" onPress={() => void downloadPdf()} loading={downloading} />
      {can('PAYMENT_WRITE') && collectible && <Button title="Ghi nhận thanh toán" icon="cash-plus" onPress={() => setRecording(true)} />}
      {can('FEE_NOTICE_WRITE') && (n.status === 'ISSUED' || n.status === 'PARTIAL' || n.status === 'OVERDUE') && d.payments.every((p) => p.status === 'CANCELLED') && (
        <Button title="Huỷ thông báo" variant="ghost" onPress={() => setCancelling(true)} />
      )}

      <RecordPaymentModal
        visible={recording}
        notice={n}
        onClose={() => setRecording(false)}
        onSaved={() => {
          setRecording(false)
          void refresh()
          notify('Đã ghi nhận thanh toán')
        }}
      />
      <PromptModal
        visible={cancelling}
        title="Huỷ thông báo phí"
        label="Lý do huỷ *"
        confirmLabel="Huỷ thông báo"
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
  apartment: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  note: { fontSize: 14, color: colors.text, marginTop: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  itemLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemDesc: { fontSize: 13, color: colors.textMuted },
  itemAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  qr: { width: 220, height: 220 },
})
